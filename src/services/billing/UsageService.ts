import { ScreenshotItem, UserEntitlement } from "../../types";
import { SubscriptionManager, PLAN_LIMITS } from "./SubscriptionManager";

export interface UsageMetrics {
  // 1. AI Vision Analysis
  aiAnalysesUsed: number;
  aiAnalysesLimit: number;
  aiAnalysesRemaining: number;
  aiAnalysesPercent: number;

  // 2. Storage Usage
  storageUsedBytes: number;
  storageLimitBytes: number;
  storageUsedFormatted: string;
  storageLimitFormatted: string;
  storageRemainingBytes: number;
  storageRemainingFormatted: string;
  storagePercent: number;

  // 3. Indexed Screenshots
  screenshotsIndexed: number;
  screenshotsLimit: number;
  screenshotsRemaining: number;
  screenshotsPercent: number;

  // 4. Cloud Sync
  cloudSyncCount: number;
  cloudSyncTotal: number;
  cloudSyncPercent: number;
  isCloudSyncEnabled: boolean;
  isSyncing: boolean;
  lastSyncedAt?: string;

  // 5. Tier & Timing
  tierName: "Free" | "Pro" | "Founder Pro";
  plan: "free" | "pro" | "founder";
  isPro: boolean;
  isFounder: boolean;
  founderNumber?: number | null;
  nextResetDate: string;
  nextResetDateFormatted: string;
  daysUntilReset: number;
  isUnlimitedResource: boolean; // Must be false unless backend actually provides unlimited
}

const DEVICE_ID_KEY = "snapfind_authoritative_device_id";
const LOCAL_USAGE_KEY = "snapfind_persisted_usage_v1";

class UsageServiceEngine {
  private deviceId: string = "";
  private cachedMetrics: UsageMetrics | null = null;
  private listeners: Set<(metrics: UsageMetrics) => void> = new Set();
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor() {
    this.initDeviceId();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.syncWithServer();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Initialize or retrieve durable device identifier to prevent bypassing limits
   */
  private initDeviceId(): string {
    if (typeof window === "undefined") return "server-env";
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        // Generate pseudo-unique hardware/device hash
        const nav = window.navigator;
        const screen = window.screen;
        const rawSeed = `${nav.userAgent}_${screen.width}x${screen.height}_${nav.language}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        id = `sf_dev_${this.hashString(rawSeed)}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      this.deviceId = id;
      return id;
    } catch {
      this.deviceId = `sf_dev_fallback_${Date.now()}`;
      return this.deviceId;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  public getDeviceId(): string {
    if (!this.deviceId) {
      this.initDeviceId();
    }
    return this.deviceId;
  }

  /**
   * Helper: Format bytes into readable string (e.g. 240 MB, 1.2 GB)
   */
  public formatBytes(bytes: number, decimals: number = 1): string {
    if (bytes <= 0) return "0 MB";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // For smaller sizes, show in MB minimum for cleaner UI
    if (i < 2) {
      const mb = (bytes / (1024 * 1024)).toFixed(dm);
      return `${mb} MB`;
    }

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  /**
   * Calculate exact storage footprint of screenshots dataset (base64 image + thumbnail + OCR text + metadata)
   */
  public calculateScreenshotsStorageBytes(screenshots: ScreenshotItem[]): number {
    let totalBytes = 0;
    for (const item of screenshots) {
      if (item.isDeleted || item.is_deleted) continue;

      // 1. Image payload (estimate from base64 length or image bytes)
      if (item.imageUrl && item.imageUrl.startsWith("data:")) {
        const base64Len = item.imageUrl.length;
        totalBytes += Math.round(base64Len * 0.75); // approx raw byte size
      } else if (item.imageUrl) {
        totalBytes += 350 * 1024; // avg 350KB remote screenshot
      }

      // 2. Thumbnail preview
      const thumb = item.thumbnailUri || item.thumbnail_uri;
      if (thumb && thumb.startsWith("data:")) {
        totalBytes += Math.round(thumb.length * 0.75);
      } else {
        totalBytes += 25 * 1024; // avg 25KB thumbnail
      }

      // 3. OCR Text & Structured Metadata
      const textLen = (item.fullText || "").length + (item.summary || "").length + (item.ocr_text || "").length;
      totalBytes += textLen * 2; // UTF-16 bytes approx
      totalBytes += 1024; // JSON schema metadata overhead
    }

    // Include base app SQLite/IndexedDB indexes overhead (~2.5 MB)
    if (screenshots.length > 0) {
      totalBytes += 2.5 * 1024 * 1024;
    }

    return totalBytes;
  }

  /**
   * Compute comprehensive usage metrics combining local storage, memory, and authoritative entitlement limits
   */
  public computeMetrics(
    screenshots: ScreenshotItem[] = [],
    userId?: string,
    serverUsageData?: any
  ): UsageMetrics {
    const ent = SubscriptionManager.getUserEntitlements(userId);
    const isFounder = Boolean(ent.isFounder);
    const isPro = Boolean(ent.isPro || isFounder);
    const founderNumber = ent.founderNumber;

    // 1. Tier Name
    let tierName: "Free" | "Pro" | "Founder Pro" = "Free";
    let plan: "free" | "pro" | "founder" = "free";

    if (isFounder) {
      tierName = "Founder Pro";
      plan = "founder";
    } else if (isPro) {
      tierName = "Pro";
      plan = "pro";
    }

    // 2. Limits based on Authoritative Plan Features
    const screenshotsLimit = isPro
      ? PLAN_LIMITS.PRO_MAX_SCREENSHOTS
      : PLAN_LIMITS.FREE_MAX_SCREENSHOTS;

    const aiAnalysesLimit = isPro
      ? PLAN_LIMITS.PRO_AI_SCANS_MONTHLY
      : PLAN_LIMITS.FREE_AI_SCANS_MONTHLY;

    const storageLimitMB = isPro ? 10000 : 500; // 10 GB vs 500 MB
    const storageLimitBytes = storageLimitMB * 1024 * 1024;

    // 3. Calculated Usage
    const activeScreenshots = screenshots.filter((s) => !s.isDeleted && !s.is_deleted);
    const screenshotsIndexed = Math.max(
      activeScreenshots.length,
      serverUsageData?.screenshotsIndexed || 0
    );
    const screenshotsRemaining = Math.max(0, screenshotsLimit - screenshotsIndexed);
    const screenshotsPercent = Math.min(
      100,
      Math.round((screenshotsIndexed / Math.max(1, screenshotsLimit)) * 100)
    );

    // AI Analysis scans (monthly)
    const localSavedAiScans = this.getLocalAiScanCount();
    const aiAnalysesUsed = Math.max(
      localSavedAiScans,
      serverUsageData?.aiAnalysesUsed || 0
    );
    const aiAnalysesRemaining = Math.max(0, aiAnalysesLimit - aiAnalysesUsed);
    const aiAnalysesPercent = Math.min(
      100,
      Math.round((aiAnalysesUsed / Math.max(1, aiAnalysesLimit)) * 100)
    );

    // Storage bytes
    const calculatedBytes = this.calculateScreenshotsStorageBytes(screenshots);
    const storageUsedBytes = Math.max(calculatedBytes, serverUsageData?.storageBytesUsed || 0);
    const storageRemainingBytes = Math.max(0, storageLimitBytes - storageUsedBytes);
    const storagePercent = Math.min(
      100,
      Math.round((storageUsedBytes / Math.max(1, storageLimitBytes)) * 100)
    );

    // Cloud Sync
    const syncedItems = activeScreenshots.filter((s) => s.syncStatus === "Synced" || Boolean(s.lastSyncedAt));
    const cloudSyncCount = isPro ? syncedItems.length : 0;
    const cloudSyncTotal = activeScreenshots.length;
    const cloudSyncPercent =
      cloudSyncTotal > 0 ? Math.min(100, Math.round((cloudSyncCount / cloudSyncTotal) * 100)) : 0;

    // 4. Monthly Reset Date Calculation
    const now = new Date();
    const nextResetDateObj = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const nextResetDate = nextResetDateObj.toISOString();
    const nextResetDateFormatted = nextResetDateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const diffTime = nextResetDateObj.getTime() - now.getTime();
    const daysUntilReset = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const metrics: UsageMetrics = {
      aiAnalysesUsed,
      aiAnalysesLimit,
      aiAnalysesRemaining,
      aiAnalysesPercent,

      storageUsedBytes,
      storageLimitBytes,
      storageUsedFormatted: this.formatBytes(storageUsedBytes),
      storageLimitFormatted: this.formatBytes(storageLimitBytes),
      storageRemainingBytes,
      storageRemainingFormatted: this.formatBytes(storageRemainingBytes),
      storagePercent,

      screenshotsIndexed,
      screenshotsLimit,
      screenshotsRemaining,
      screenshotsPercent,

      cloudSyncCount,
      cloudSyncTotal,
      cloudSyncPercent,
      isCloudSyncEnabled: isPro,
      isSyncing: false,

      tierName,
      plan,
      isPro,
      isFounder,
      founderNumber,
      nextResetDate,
      nextResetDateFormatted,
      daysUntilReset,
      // We do not claim unlimited because backend provides exact 10,000 / 10 GB limits
      isUnlimitedResource: false,
    };

    this.cachedMetrics = metrics;
    this.notifyListeners(metrics);
    return metrics;
  }

  /**
   * Durable local AI scan count tracking with monthly rollover
   */
  private getLocalAiScanCount(): number {
    if (typeof localStorage === "undefined") return 0;
    try {
      const raw = localStorage.getItem(LOCAL_USAGE_KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      if (data.monthKey !== currentMonthKey) {
        // Rollover month
        localStorage.setItem(
          LOCAL_USAGE_KEY,
          JSON.stringify({ monthKey: currentMonthKey, count: 0 })
        );
        return 0;
      }
      return Number(data.count) || 0;
    } catch {
      return 0;
    }
  }

  public recordLocalAiScan(): number {
    if (typeof localStorage === "undefined") return 0;
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
      const count = this.getLocalAiScanCount() + 1;
      localStorage.setItem(
        LOCAL_USAGE_KEY,
        JSON.stringify({ monthKey: currentMonthKey, count, lastUpdated: now.toISOString() })
      );
      // Re-sync with server asynchronously
      this.syncWithServer();
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Synchronize usage metrics with authoritative server ledger (/api/usage)
   */
  public async syncWithServer(userId?: string): Promise<any> {
    if (!this.isOnline || typeof fetch === "undefined") {
      return null;
    }

    try {
      const deviceId = this.getDeviceId();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
      };
      if (userId) {
        headers["x-user-id"] = userId;
      }

      const res = await fetch("/api/usage", {
        method: "GET",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn("[UsageService] Server usage sync failed, using resilient local storage:", err);
    }
    return null;
  }

  public subscribe(listener: (metrics: UsageMetrics) => void): () => void {
    this.listeners.add(listener);
    if (this.cachedMetrics) {
      listener(this.cachedMetrics);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(metrics: UsageMetrics): void {
    this.listeners.forEach((fn) => {
      try {
        fn(metrics);
      } catch (err) {
        console.error("[UsageService] Listener notification error:", err);
      }
    });
  }

  public getCachedMetrics(): UsageMetrics | null {
    return this.cachedMetrics;
  }
}

export const UsageService = new UsageServiceEngine();
