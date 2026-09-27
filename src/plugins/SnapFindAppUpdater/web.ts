import { WebPlugin } from "@capacitor/core";
import {
  AppVersionInfo,
  DownloadInstallResult,
  SnapFindAppUpdaterPlugin,
} from "./index";
import { APP_PACKAGE_ID, APP_VERSION, APP_VERSION_CODE } from "../../config/version";

export class SnapFindAppUpdaterWeb
  extends WebPlugin
  implements SnapFindAppUpdaterPlugin
{
  private isCancelled = false;

  async getAppVersion(): Promise<AppVersionInfo> {
    return {
      versionName: APP_VERSION,
      versionCode: APP_VERSION_CODE,
      packageName: APP_PACKAGE_ID,
    };
  }

  async canRequestPackageInstalls(): Promise<{ granted: boolean }> {
    return { granted: true };
  }

  async openInstallPermissionSettings(): Promise<void> {
    console.log("[SnapFindAppUpdaterWeb] openInstallPermissionSettings called on web");
  }

  async cancelDownload(): Promise<void> {
    this.isCancelled = true;
  }

  async downloadAndInstallApk(options: {
    url: string;
    version: string;
    sha256?: string;
  }): Promise<DownloadInstallResult> {
    this.isCancelled = false;

    if (!options.url || !options.url.startsWith("https://")) {
      throw new Error("Invalid or insecure download URL");
    }

    // On browser / non-Android environment:
    // We simulate smooth progress bar and initiate download link
    const totalBytes = 35 * 1024 * 1024; // ~35MB APK estimation for preview
    for (let progress = 5; progress <= 95; progress += 15) {
      if (this.isCancelled) {
        throw new Error("Download cancelled by user");
      }
      this.notifyListeners("downloadProgress", {
        progress,
        bytesDownloaded: Math.floor((totalBytes * progress) / 100),
        totalBytes,
      });
      await new Promise((r) => setTimeout(r, 120));
    }

    this.notifyListeners("downloadProgress", {
      progress: 100,
      bytesDownloaded: totalBytes,
      totalBytes,
    });

    try {
      const link = document.createElement("a");
      link.href = options.url;
      link.download = `SnapFind-${options.version}.apk`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn("[SnapFindAppUpdaterWeb] Link trigger failed", e);
    }

    return {
      success: true,
      filePath: options.url,
      fileSize: totalBytes,
    };
  }
}
