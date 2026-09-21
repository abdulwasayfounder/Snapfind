import { Capacitor } from '@capacitor/core';
import SnapFindMediaScanner, {
  ScreenshotDetectedPayload,
  ScanCompletedPayload,
} from '../plugins/SnapFindMediaScanner';
import { indexingEngine, CandidateImage } from './indexingEngine';
import { processingQueue } from './processingQueue';

class NativeMediaScannerService {
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      console.log('[NativeMediaScanner] Requesting gallery permissions...');
      const permRes = await SnapFindMediaScanner.requestGalleryPermission();

      if (!permRes.granted) {
        console.warn('[NativeMediaScanner] Gallery permission was denied.');
        return;
      }

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

      // 1. Listen for newly detected screenshots (e.g. background ContentObserver events)
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

      // 2. Listen for initial scan progress
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

      // 3. Listen for initial scan completed batch
      await SnapFindMediaScanner.addListener('onInitialScanCompleted', (data: ScanCompletedPayload) => {
        console.log(`[NativeMediaScanner] Initial scan completed. Found ${data.totalFound} screenshots.`);
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

      // 4. Trigger initial MediaStore scan
      console.log('[NativeMediaScanner] Scanning existing device screenshots...');
      await SnapFindMediaScanner.scanExistingScreenshots();

      // 5. Start real-time screenshot monitoring
      console.log('[NativeMediaScanner] Starting background screenshot monitoring...');
      await SnapFindMediaScanner.startScreenshotMonitoring();

    } catch (err) {
      console.error('[NativeMediaScanner] Failed to initialize native media scanner:', err);
    }
  }
}

export const nativeMediaScanner = new NativeMediaScannerService();
