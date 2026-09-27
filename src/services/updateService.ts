/**
 * SnapFind AI - Free App Update Service
 *
 * Core Principles:
 * - Uses official GitHub Releases as the free update source (No Google Play required).
 * - Single source of truth for versioning (never automatically downgrades).
 * - Automatic startup & resume checks with a 4-hour cooldown.
 * - Non-intrusive: remembers dismissed versions, does not spam notifications.
 * - Secure: only downloads from verified HTTPS GitHub domains.
 * - Preserves all user data (SQLite database, Vault, collections, Founder status).
 */

import {
  APP_PACKAGE_ID,
  APP_VERSION,
  APP_VERSION_NAME,
  APP_VERSION_CODE,
  OFFICIAL_GITHUB_REPO,
  compareSemver,
  isNewerVersion,
  parseSemver,
  formatVersionDisplay,
} from "../config/version";
import { SnapFindAppUpdater, DownloadProgressPayload } from "../plugins/SnapFindAppUpdater";
import { NotificationService } from "./notificationService";
import { loadSettings } from "./storage";

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
}

export interface ReleaseInfo {
  version: string; // e.g. "1.0.1"
  versionName: string; // e.g. "v1.0.1"
  title: string;
  publishedAt: string;
  changelog: string;
  bulletChanges: string[];
  apkAsset: ReleaseAsset | null;
  htmlUrl: string;
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "up_to_date"
  | "downloading"
  | "downloaded"
  | "error"
  | "permission_required";

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  currentVersionCode: number;
  latestRelease: ReleaseInfo | null;
  downloadProgress: number; // 0 to 100
  bytesDownloaded: number;
  totalBytes: number;
  errorMessage: string | null;
  lastCheckedAt: number | null;
  isOnline: boolean;
  canInstallFromUnknownSources: boolean;
}

const STORAGE_LAST_CHECKED = "snapfind_update_last_checked";
const STORAGE_DISMISSED_VERSION = "snapfind_update_dismissed_version";
const STORAGE_LAST_INSTALLED = "snapfind_update_last_installed_version";
const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours cooldown between automatic checks

type UpdateListener = (state: UpdateState) => void;

class UpdateServiceEngine {
  private state: UpdateState = {
    status: "idle",
    currentVersion: APP_VERSION,
    currentVersionCode: APP_VERSION_CODE,
    latestRelease: null,
    downloadProgress: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    errorMessage: null,
    lastCheckedAt: this.loadLastChecked(),
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    canInstallFromUnknownSources: true,
  };

  private listeners: Set<UpdateListener> = new Set();
  private progressSubscription: any = null;
  private isChecking = false;
  private isDownloading = false;

  constructor() {
    this.initPlatformInfo();
    this.setupListeners();
  }

  private loadLastChecked(): number | null {
    try {
      const val = localStorage.getItem(STORAGE_LAST_CHECKED);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  }

  private saveLastChecked(timestamp: number): void {
    try {
      localStorage.setItem(STORAGE_LAST_CHECKED, timestamp.toString());
      this.state.lastCheckedAt = timestamp;
    } catch {}
  }

  public getDismissedVersion(): string | null {
    try {
      return localStorage.getItem(STORAGE_DISMISSED_VERSION);
    } catch {
      return null;
    }
  }

  public setDismissedVersion(version: string): void {
    try {
      localStorage.setItem(STORAGE_DISMISSED_VERSION, version);
    } catch {}
  }

  public getLastInstalledVersion(): string | null {
    try {
      return localStorage.getItem(STORAGE_LAST_INSTALLED);
    } catch {
      return null;
    }
  }

  public setLastInstalledVersion(version: string): void {
    try {
      localStorage.setItem(STORAGE_LAST_INSTALLED, version);
    } catch {}
  }

  private async initPlatformInfo(): Promise<void> {
    try {
      const versionInfo = await SnapFindAppUpdater.getAppVersion();
      if (versionInfo && versionInfo.versionName) {
        this.state.currentVersion = versionInfo.versionName.replace(/^v/i, "");
        this.state.currentVersionCode = Number(versionInfo.versionCode) || APP_VERSION_CODE;
      }
      const perm = await SnapFindAppUpdater.canRequestPackageInstalls();
      this.state.canInstallFromUnknownSources = Boolean(perm?.granted);
    } catch (e) {
      console.warn("[UpdateService] Native version retrieval fallback to config:", e);
    }
    this.notify();
  }

  private setupListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.state.isOnline = true;
        this.notify();
      });
      window.addEventListener("offline", () => {
        this.state.isOnline = false;
        this.notify();
      });

      // App resume check
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.checkOnResume();
        }
      });
    }

    try {
      SnapFindAppUpdater.addListener("downloadProgress", (payload: DownloadProgressPayload) => {
        this.state.downloadProgress = Math.min(100, Math.max(0, payload.progress));
        this.state.bytesDownloaded = payload.bytesDownloaded;
        this.state.totalBytes = payload.totalBytes;
        if (this.state.downloadProgress >= 100) {
          this.state.status = "downloaded";
          this.isDownloading = false;
        }
        this.notify();
      }).then((handle) => {
        this.progressSubscription = handle;
      });
    } catch (e) {
      console.warn("[UpdateService] Progress listener could not be registered:", e);
    }
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = { ...this.state };
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error("[UpdateService] Listener error:", err);
      }
    });
  }

  public getState(): UpdateState {
    return { ...this.state };
  }

  /**
   * Parse GitHub markdown release body into readable clean bullet points
   */
  public parseChangelogBullets(rawBody: string | null | undefined): string[] {
    if (!rawBody || !rawBody.trim()) {
      return [
        "Faster indexing and performance improvements",
        "Refined visual search and OCR extraction",
        "Bug fixes and system stability enhancements",
      ];
    }

    const lines = rawBody.split("\n");
    const bullets: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Skip markdown headers like "## What's Changed" or release asset links
      if (line.startsWith("#") || line.startsWith("---") || line.toLowerCase().includes("full changelog")) {
        continue;
      }
      // Match bullet list item
      if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
        const cleaned = line.replace(/^[-*•]\s+/, "").trim();
        // Remove github commit links/hashes like in @user or in 7f248b1
        const sansCommits = cleaned.replace(/\b[0-9a-f]{7,40}\b/g, "").replace(/\sby\s+@[\w-]+/g, "");
        if (sansCommits.trim().length > 3) {
          bullets.push(sansCommits.trim());
        }
      } else if (line.length > 5 && !line.startsWith("<") && !line.includes("http")) {
        bullets.push(line);
      }

      if (bullets.length >= 6) break;
    }

    if (bullets.length === 0) {
      return [
        "Faster indexing and OCR engine enhancements",
        "Optimized duplicate detection and storage",
        "Security fixes and performance improvements",
      ];
    }

    return bullets;
  }

  /**
   * Query GitHub Releases API for latest public release
   */
  public async checkForUpdates(isManual: boolean = false): Promise<ReleaseInfo | null> {
    if (this.isChecking) {
      return this.state.latestRelease;
    }

    const settings = loadSettings();
    if (!isManual && settings.autoCheckUpdates === false) {
      return null;
    }

    // Cooldown check for automatic startup/resume checks
    const now = Date.now();
    if (!isManual && this.state.lastCheckedAt) {
      if (now - this.state.lastCheckedAt < CHECK_COOLDOWN_MS) {
        return this.state.latestRelease;
      }
    }

    // Offline check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (isManual) {
        this.state.errorMessage = "You are currently offline. Connect to the internet to check for updates.";
        this.state.status = "error";
        this.notify();
      }
      return null;
    }

    this.isChecking = true;
    this.state.status = "checking";
    this.state.errorMessage = null;
    this.notify();

    try {
      const repo = OFFICIAL_GITHUB_REPO;
      const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;

      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        // If 404 (no releases created yet) or rate limit
        if (response.status === 404) {
          this.state.status = "up_to_date";
          this.saveLastChecked(now);
          this.isChecking = false;
          this.notify();
          return null;
        }
        throw new Error(`GitHub Releases returned status ${response.status}`);
      }

      const data = await response.json();
      const rawTag = data.tag_name || data.name || "";
      const cleanVer = rawTag.replace(/^[vV]/, "").trim();

      if (!cleanVer) {
        throw new Error("Release has no valid version tag");
      }

      // Find official APK asset
      let apkAsset: ReleaseAsset | null = null;
      if (Array.isArray(data.assets)) {
        // Prefer SnapFind-*.apk
        const preferred = data.assets.find(
          (a: any) =>
            typeof a.name === "string" &&
            a.name.toLowerCase().endsWith(".apk") &&
            a.name.toLowerCase().includes("snapfind")
        );
        const fallback = data.assets.find(
          (a: any) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
        );
        const matched = preferred || fallback;

        if (matched) {
          apkAsset = {
            id: matched.id,
            name: matched.name,
            size: matched.size || 0,
            downloadUrl: matched.browser_download_url,
            contentType: matched.content_type || "application/vnd.android.package-archive",
          };
        }
      }

      const bullets = this.parseChangelogBullets(data.body);

      const release: ReleaseInfo = {
        version: cleanVer,
        versionName: formatVersionDisplay(cleanVer),
        title: data.name || `SnapFind ${formatVersionDisplay(cleanVer)}`,
        publishedAt: data.published_at || new Date().toISOString(),
        changelog: data.body || "",
        bulletChanges: bullets,
        apkAsset,
        htmlUrl: data.html_url || `https://github.com/${repo}/releases`,
      };

      this.saveLastChecked(now);
      this.state.latestRelease = release;

      const hasNewer = isNewerVersion(cleanVer, this.state.currentVersion);

      if (hasNewer) {
        this.state.status = "available";

        // Push notification only if not already dismissed and not repeatedly
        const dismissed = this.getDismissedVersion();
        if (dismissed !== cleanVer) {
          NotificationService.pushNotification(
            "IMPORTANT",
            "SnapFind update available",
            `A new release (${release.versionName}) is available with faster indexing and enhancements.`,
            {
              id: `update_available_${cleanVer}`,
              priority: "medium",
              metadata: {
                isAppUpdate: true,
                version: release.versionName,
                releaseNotes: bullets.join("\n• "),
                downloadUrl: apkAsset?.downloadUrl,
              },
            }
          );
        }
      } else {
        this.state.status = "up_to_date";
      }

      this.isChecking = false;
      this.notify();
      return release;
    } catch (err: any) {
      console.warn("[UpdateService] Update check failed:", err.message);
      this.isChecking = false;
      this.state.status = isManual ? "error" : "idle";
      this.state.errorMessage = isManual
        ? `Could not reach GitHub Releases: ${err.message || "Network error"}`
        : null;
      this.notify();
      return null;
    }
  }

  /**
   * Called on app startup or foreground resume
   */
  public async checkOnStartup(): Promise<void> {
    await this.initPlatformInfo();
    // Non-manual background check respects cooldown & settings
    await this.checkForUpdates(false);
  }

  public async checkOnResume(): Promise<void> {
    // Check if cooldown elapsed
    const now = Date.now();
    if (!this.state.lastCheckedAt || now - this.state.lastCheckedAt >= CHECK_COOLDOWN_MS) {
      await this.checkForUpdates(false);
    }
  }

  /**
   * Start downloading and triggering Android APK installation
   */
  public async downloadAndInstall(releaseOverride?: ReleaseInfo): Promise<void> {
    const release = releaseOverride || this.state.latestRelease;
    if (!release) {
      throw new Error("No update release specified");
    }

    if (!release.apkAsset || !release.apkAsset.downloadUrl) {
      throw new Error("No APK asset found for this release. Visit GitHub Releases to download manually.");
    }

    const downloadUrl = release.apkAsset.downloadUrl;

    // Strict security check: must be HTTPS and from GitHub
    if (!downloadUrl.startsWith("https://")) {
      throw new Error("Insecure download URL: HTTPS required.");
    }

    const urlObj = new URL(downloadUrl);
    const allowedHosts = ["github.com", "objects.githubusercontent.com", "api.github.com"];
    if (!allowedHosts.some((h) => urlObj.hostname === h || urlObj.hostname.endsWith("." + h))) {
      throw new Error("Untrusted download domain. APK must be hosted on official GitHub Release infrastructure.");
    }

    // Check unknown sources install permission
    try {
      const perm = await SnapFindAppUpdater.canRequestPackageInstalls();
      if (!perm.granted) {
        this.state.status = "permission_required";
        this.notify();
        return;
      }
    } catch {}

    this.isDownloading = true;
    this.state.status = "downloading";
    this.state.downloadProgress = 0;
    this.state.bytesDownloaded = 0;
    this.state.totalBytes = release.apkAsset.size || 0;
    this.state.errorMessage = null;
    this.notify();

    try {
      const result = await SnapFindAppUpdater.downloadAndInstallApk({
        url: downloadUrl,
        version: release.version,
      });

      if (result.success) {
        this.state.status = "downloaded";
        this.state.downloadProgress = 100;
        this.isDownloading = false;
        this.notify();
      } else {
        throw new Error(result.error || "Installation failed to launch");
      }
    } catch (err: any) {
      this.isDownloading = false;
      this.state.status = "error";
      this.state.errorMessage = err.message || "Failed to download update APK.";
      this.notify();
      throw err;
    }
  }

  public async openPermissionSettings(): Promise<void> {
    try {
      await SnapFindAppUpdater.openInstallPermissionSettings();
    } catch (e) {
      console.warn("[UpdateService] Could not open install permission settings:", e);
    }
  }

  public async cancelDownload(): Promise<void> {
    try {
      await SnapFindAppUpdater.cancelDownload();
      this.isDownloading = false;
      this.state.status = this.state.latestRelease ? "available" : "idle";
      this.state.downloadProgress = 0;
      this.notify();
    } catch (e) {
      console.warn("[UpdateService] Error cancelling download:", e);
    }
  }

  public dismissCurrentUpdate(): void {
    if (this.state.latestRelease) {
      this.setDismissedVersion(this.state.latestRelease.version);
    }
    this.state.status = "idle";
    this.notify();
  }

  /**
   * First-run detection after update:
   * Compares currently running version with last recorded installed version.
   * If newer, returns the updated version string, otherwise null.
   */
  public checkFirstRunAfterUpdate(): { wasUpdated: boolean; version: string } {
    const lastInstalled = this.getLastInstalledVersion();
    const current = this.state.currentVersion;

    if (!lastInstalled) {
      // First fresh run of SnapFind: record current version
      this.setLastInstalledVersion(current);
      return { wasUpdated: false, version: current };
    }

    if (compareSemver(current, lastInstalled) > 0) {
      // App was successfully updated!
      this.setLastInstalledVersion(current);
      return { wasUpdated: true, version: current };
    }

    return { wasUpdated: false, version: current };
  }
}

export const UpdateService = new UpdateServiceEngine();
