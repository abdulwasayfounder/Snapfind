import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface ScanProgressPayload {
  scanned: number;
  total: number;
  currentUri?: string;
  screenshot?: {
    uri: string;
    filename: string;
    dateAdded: number;
    width?: number;
    height?: number;
    size?: number;
  };
}

export interface ScanCompletedPayload {
  totalFound: number;
  lastScanTimestamp?: number;
  screenshots: Array<{
    uri: string;
    filename: string;
    dateAdded: number;
    width?: number;
    height?: number;
    size?: number;
  }>;
}

export interface ScreenshotDetectedPayload {
  uri: string;
  filename: string;
  dateAdded: number;
  width?: number;
  height?: number;
  size?: number;
}

export interface SnapFindMediaScannerPlugin {
  checkGalleryPermission(): Promise<{ granted: boolean; permissionState: 'granted' | 'partial' | 'denied' | 'prompt' }>;
  requestGalleryPermission(): Promise<{ granted: boolean; permissionState: 'granted' | 'partial' | 'denied' | 'prompt' }>;
  openAppSettings(): Promise<void>;
  scanExistingScreenshots(options?: { sinceTimestamp?: number }): Promise<{ totalFound: number; lastScanTimestamp?: number }>;
  startScreenshotMonitoring(): Promise<{ active: boolean }>;
  stopScreenshotMonitoring(): Promise<{ active: boolean }>;
  updateNotificationProgress(options: { progressPercentage: number }): Promise<void>;

  addListener(
    eventName: 'onInitialScanProgress',
    listenerFunc: (progress: ScanProgressPayload) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'onInitialScanCompleted',
    listenerFunc: (result: ScanCompletedPayload) => void
  ): Promise<PluginListenerHandle>;

  addListener(
    eventName: 'onScreenshotDetected',
    listenerFunc: (screenshot: ScreenshotDetectedPayload) => void
  ): Promise<PluginListenerHandle>;

  removeAllListeners(): Promise<void>;
}

const SnapFindMediaScanner = registerPlugin<SnapFindMediaScannerPlugin>('SnapFindMediaScanner', {
  web: () => import('./web').then((m) => new m.SnapFindMediaScannerWeb()),
});

export default SnapFindMediaScanner;
