import { registerPlugin, PluginListenerHandle } from "@capacitor/core";

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  packageName: string;
}

export interface DownloadProgressPayload {
  progress: number; // 0 to 100
  bytesDownloaded: number;
  totalBytes: number;
}

export interface DownloadInstallResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

export interface SnapFindAppUpdaterPlugin {
  getAppVersion(): Promise<AppVersionInfo>;
  canRequestPackageInstalls(): Promise<{ granted: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  downloadAndInstallApk(options: {
    url: string;
    version: string;
    sha256?: string;
  }): Promise<DownloadInstallResult>;
  cancelDownload(): Promise<void>;

  addListener(
    eventName: "downloadProgress",
    listenerFunc: (progress: DownloadProgressPayload) => void
  ): Promise<PluginListenerHandle>;
}

export const SnapFindAppUpdater = registerPlugin<SnapFindAppUpdaterPlugin>(
  "SnapFindAppUpdater",
  {
    web: () => import("./web").then((m) => new m.SnapFindAppUpdaterWeb()),
  }
);
