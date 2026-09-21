import { WebPlugin } from '@capacitor/core';
import type {
  SnapFindMediaScannerPlugin,
  ScanCompletedPayload,
  ScanProgressPayload,
  ScreenshotDetectedPayload,
} from './index';

export class SnapFindMediaScannerWeb extends WebPlugin implements SnapFindMediaScannerPlugin {
  async checkGalleryPermission(): Promise<{ granted: boolean; permissionState: 'granted' | 'partial' | 'denied' | 'prompt' }> {
    return { granted: false, permissionState: 'prompt' };
  }

  async requestGalleryPermission(): Promise<{ granted: boolean; permissionState: 'granted' | 'partial' | 'denied' | 'prompt' }> {
    console.log('[SnapFindMediaScannerWeb] requestGalleryPermission called');
    return { granted: true, permissionState: 'granted' };
  }

  async openAppSettings(): Promise<void> {
    console.log('[SnapFindMediaScannerWeb] openAppSettings called');
  }

  async scanExistingScreenshots(options?: { sinceTimestamp?: number }): Promise<{ totalFound: number; lastScanTimestamp?: number }> {
    console.log('[SnapFindMediaScannerWeb] scanExistingScreenshots called', options);
    setTimeout(() => {
      this.notifyListeners('onInitialScanCompleted', {
        totalFound: 0,
        screenshots: [],
      });
    }, 100);
    return { totalFound: 0, lastScanTimestamp: Date.now() };
  }

  async startScreenshotMonitoring(): Promise<{ active: boolean }> {
    console.log('[SnapFindMediaScannerWeb] startScreenshotMonitoring called');
    return { active: true };
  }

  async stopScreenshotMonitoring(): Promise<{ active: boolean }> {
    console.log('[SnapFindMediaScannerWeb] stopScreenshotMonitoring called');
    return { active: false };
  }

  async updateNotificationProgress(options: { progressPercentage: number }): Promise<void> {
    console.log('[SnapFindMediaScannerWeb] updateNotificationProgress:', options.progressPercentage);
  }
}
