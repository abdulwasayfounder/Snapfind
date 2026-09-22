import { Capacitor } from '@capacitor/core';
import SnapFindMediaScanner, {
  ScreenshotDetectedPayload,
  ScanCompletedPayload,
} from '../plugins/SnapFindMediaScanner';
import { indexingEngine, CandidateImage } from './indexingEngine';
import { processingQueue } from './processingQueue';

export type GalleryPermissionState = 'prompt' | 'granted' | 'partial' | 'denied';

export interface PermissionStatus {
  granted: boolean;
  permissionState: GalleryPermissionState;
}

type PermissionListener = (status: PermissionStatus) => void;

class NativeMediaScannerService {
  private isInitialized = false;
  private currentPermissionState: GalleryPermissionState = 'prompt';
  private permissionListeners: Set<PermissionListener> = new Set();

  public getPermissionStatus(): PermissionStatus {
    return {
      granted: this.currentPermissionState === 'granted' || this.currentPermissionState === 'partial',
      permissionState: this.currentPermissionState,
    };
  }

  public subscribePermission(listener: PermissionListener): () => void {
    this.permissionListeners.add(listener);
    listener(this.getPermissionStatus());
    return () => this.permissionListeners.delete(listener);
  }

  private notifyPermissionListeners(status: PermissionStatus) {
    this.currentPermissionState = status.permissionState;
    this.permissionListeners.forEach((fn) => fn(status));
  }

  public async checkPermission(): Promise<PermissionStatus> {
    if (!Capacitor.isNativePlatform()) {
      const res: PermissionStatus = { granted: true, permissionState: 'granted' };
      this.notifyPermissionListeners(res);
      return res;
    }
    try {
      const res = await SnapFindMediaScanner.checkGalleryPermission();
      const status: PermissionStatus = {
        granted: res.granted,
        permissionState: res.permissionState as GalleryPermissionState,
      };
      this.notifyPermissionListeners(status);
      return status;
    } catch (err) {
      console.warn('[NativeMediaScanner] checkPermission error:', err);
      const fallback: PermissionStatus = { granted: false, permissionState: 'prompt' };
      this.notifyPermissionListeners(fallback);
      return fallback;
    }
  }

  public async requestPermission(): Promise<PermissionStatus> {
    try {
      const res = await SnapFindMediaScanner.requestGalleryPermission();
      const status: PermissionStatus = {
        granted: res.granted,
        permissionState: res.permissionState as GalleryPermissionState,
      };
      this.notifyPermissionListeners(status);

      if (status.granted) {
        // Proceed with incremental scan and monitoring
        await this.scanScreenshots();
        await this.startMonitoring();
      }
      return status;
    } catch (err) {
      console.error('[NativeMediaScanner] requestPermission error:', err);
      const fallback: PermissionStatus = { granted: false, permissionState: 'denied' };
      this.notifyPermissionListeners(fallback);
      return fallback;
    }
  }

  public async openSettings(): Promise<void> {
    try {
      await SnapFindMediaScanner.openAppSettings();
    } catch (err) {
      console.warn('[NativeMediaScanner] openAppSettings error:', err);
    }
  }

  public async scanScreenshots(forceFullScan: boolean = false): Promise<void> {
    try {
      let sinceTimestamp = 0;
      if (!forceFullScan) {
        const lastScanIso = indexingEngine.getLastScanTimestamp();
        const parsed = new Date(lastScanIso).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          sinceTimestamp = parsed;
        }
      }

      console.log(`[NativeMediaScanner] Scanning device screenshots (since ${sinceTimestamp > 0 ? new Date(sinceTimestamp).toISOString() : 'beginning'})...`);
      const scanRes = await SnapFindMediaScanner.scanExistingScreenshots({ sinceTimestamp });
      
      if (scanRes.lastScanTimestamp && scanRes.lastScanTimestamp > 0) {
        indexingEngine.setLastScanTimestamp(new Date(scanRes.lastScanTimestamp).toISOString());
      }
    } catch (err) {
      console.error('[NativeMediaScanner] scanScreenshots error:', err);
    }
  }

  public async startMonitoring(): Promise<void> {
    try {
      console.log('[NativeMediaScanner] Starting background screenshot monitoring...');
      await SnapFindMediaScanner.startScreenshotMonitoring();
    } catch (err) {
      console.warn('[NativeMediaScanner] startScreenshotMonitoring warning:', err);
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Check existing permission status without aggressive prompt
      const permRes = await this.checkPermission();

      console.log('[NativeMediaScanner] Setting up screenshot listeners...');

      // Subscribe to processingQueue to update Android foreground notification progress
      processingQueue.subscribe((jobs, activeJob) => {
        if (Capacitor.isNativePlatform()) {
          if (activeJob) {
            SnapFindMediaScanner.updateNotificationProgress({
              progressPercentage: activeJob.progressPercent || 0,
            }).catch(() => {});
          } else {
            const hasQueued = jobs.some((j) => j.status === 'Queued');
            if (!hasQueued) {
              SnapFindMediaScanner.updateNotificationProgress({
                progressPercentage: -1,
              }).catch(() => {});
            }
          }
        }
      });

      // 2. Listen for newly detected screenshots (e.g. background ContentObserver events)
      await SnapFindMediaScanner.addListener('onScreenshotDetected', (data: ScreenshotDetectedPayload) => {
        console.log('[NativeMediaScanner] New screenshot detected:', data.filename, data.uri);
        const imageId = `sc_${data.dateAdded || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        
        const candidate: CandidateImage = {
          id: imageId,
          image_uri: data.uri,
          file_name: data.filename || `screenshot_${Date.now()}.png`,
          folder: 'Screenshots',
          date_modified: data.dateAdded ? data.dateAdded * 1000 : Date.now(),
        };

        // Pass through IndexingEngine for duplicate detection and timestamp management before queueing
        indexingEngine.ingestScreenshotCandidate(candidate);
      });

      // 3. Listen for initial scan progress
      await SnapFindMediaScanner.addListener('onInitialScanProgress', (progress) => {
        if (progress.screenshot) {
          const item = progress.screenshot;
          const imageId = `sc_${item.dateAdded || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          
          const candidate: CandidateImage = {
            id: imageId,
            image_uri: item.uri,
            file_name: item.filename || `screenshot_${Date.now()}.png`,
            folder: 'Screenshots',
            date_modified: item.dateAdded ? item.dateAdded * 1000 : Date.now(),
          };

          // Pass through IndexingEngine
          indexingEngine.ingestScreenshotCandidate(candidate);
        }
      });

      // 4. Listen for initial scan completed batch
      await SnapFindMediaScanner.addListener('onInitialScanCompleted', (data: ScanCompletedPayload) => {
        console.log(`[NativeMediaScanner] Initial scan completed. Found ${data.totalFound} screenshots.`);
        if (data.lastScanTimestamp && data.lastScanTimestamp > 0) {
          indexingEngine.setLastScanTimestamp(new Date(data.lastScanTimestamp).toISOString());
        }
        if (data.screenshots && data.screenshots.length > 0) {
          const candidates: CandidateImage[] = data.screenshots.map((item) => ({
            id: `sc_${item.dateAdded || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            image_uri: item.uri,
            file_name: item.filename || `screenshot_${Date.now()}.png`,
            folder: 'Screenshots',
            date_modified: item.dateAdded ? item.dateAdded * 1000 : Date.now(),
          }));

          // Pass batch through IndexingEngine
          indexingEngine.ingestScreenshotCandidates(candidates);
        }
      });

      // 5. If permissions are already granted, run incremental scan and start monitoring
      if (permRes.granted) {
        await this.scanScreenshots();
        await this.startMonitoring();
      }

    } catch (err) {
      console.error('[NativeMediaScanner] Failed to initialize native media scanner:', err);
    }
  }
}

export const nativeMediaScanner = new NativeMediaScannerService();
