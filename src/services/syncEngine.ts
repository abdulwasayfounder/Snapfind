import { supabase, isSupabaseConfigured } from "./supabase";
import { StorageManager, loadStoredScreenshots, saveStoredScreenshots, loadSettings, saveSettings, loadSearchHistory, saveSearchHistory } from "./storage";
import { ScreenshotItem, SyncStatus, AppSettings, SearchHistoryItem } from "../types";
import { searchEngine } from "./searchEngine";

import { SubscriptionManager } from "./billing/SubscriptionManager";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  currentUserId: string;
}

type SyncListener = (state: SyncState) => void;

class SyncEngineService {
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private currentUserId: string = "guest";
  private listeners: Set<SyncListener> = new Set();
  private syncTimer: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnlineStatusChange(true));
      window.addEventListener("offline", () => this.handleOnlineStatusChange(false));
    }
  }

  public setCurrentUserId(userId: string): void {
    this.currentUserId = userId || "guest";
    this.notify();
  }

  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): SyncState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      currentUserId: this.currentUserId,
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {}
    });
  }

  private handleOnlineStatusChange(online: boolean): void {
    this.isOnline = online;
    this.notify();

    if (online) {
      console.log("[SyncEngine] Network connection restored. Scheduling automatic background sync...");
      this.scheduleSync(1500);
    }
  }

  public scheduleSync(delayMs: number = 1000): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncNow().catch((err) => {
        console.warn("[SyncEngine] Scheduled sync error:", err);
      });
    }, delayMs);
  }

  /**
   * Mark a screenshot as pending sync in local storage & queue sync
   */
  public async markScreenshotPending(item: ScreenshotItem): Promise<ScreenshotItem> {
    const updated: ScreenshotItem = {
      ...item,
      user_id: item.user_id || item.userId || this.currentUserId,
      userId: item.user_id || item.userId || this.currentUserId,
      syncStatus: "Pending",
      syncError: undefined,
    };

    const provider = StorageManager.getProvider();
    await provider.saveScreenshot(updated);

    this.pendingCount++;
    this.notify();
    this.scheduleSync(500);

    return updated;
  }

  /**
   * Main sync process (Non-blocking background execution with exponential backoff)
   */
  public async syncNow(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const settings = loadSettings();
    if (settings.syncEnabled === false) {
      console.log("[SyncEngine] Cloud sync is disabled in user settings.");
      return;
    }

    const syncGate = SubscriptionManager.canUseCloudSync();
    if (!syncGate.allowed) {
      console.log("[SyncEngine] Cloud sync is reserved for SnapFind Pro users. Local SQLite storage active.");
      return;
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const provider = StorageManager.getProvider();
      const screenshots = await provider.getAllScreenshots();

      const pendingItems = screenshots.filter(
        (sc) => sc.syncStatus === "Pending" || sc.syncStatus === "Failed" || !sc.syncStatus
      );

      this.pendingCount = pendingItems.length;
      this.notify();

      if (pendingItems.length === 0) {
        // Sync settings & history if configured
        await this.syncSettingsAndHistory(settings);
        this.lastSyncedAt = new Date().toISOString();
        this.isSyncing = false;
        this.notify();
        return;
      }

      console.log(`[SyncEngine] Starting background sync for ${pendingItems.length} items...`);

      for (const item of pendingItems) {
        if (!this.isOnline) break;

        // Mark item as Uploading
        const uploadingItem: ScreenshotItem = { ...item, syncStatus: "Uploading" };
        await provider.saveScreenshot(uploadingItem);

        const success = await this.syncSingleScreenshotWithRetry(uploadingItem, settings, 3);
        if (success) {
          const syncedItem: ScreenshotItem = {
            ...uploadingItem,
            syncStatus: "Synced",
            lastSyncedAt: new Date().toISOString(),
            syncError: undefined,
          };
          await provider.saveScreenshot(syncedItem);
        } else {
          const failedItem: ScreenshotItem = {
            ...uploadingItem,
            syncStatus: "Failed",
            syncError: "Network or cloud sync failed",
          };
          await provider.saveScreenshot(failedItem);
        }
      }

      await this.syncSettingsAndHistory(settings);

      // Refresh in-memory list
      const refreshed = await provider.getAllScreenshots();
      saveStoredScreenshots(refreshed);

      this.pendingCount = refreshed.filter((sc) => sc.syncStatus === "Pending" || sc.syncStatus === "Failed").length;
      this.lastSyncedAt = new Date().toISOString();
    } catch (err: any) {
      console.error("[SyncEngine] Sync failure:", err);
      this.lastError = err?.message || "Sync execution error";
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Sync single screenshot record to Supabase with exponential backoff
   */
  private async syncSingleScreenshotWithRetry(
    item: ScreenshotItem,
    settings: AppSettings,
    maxRetries: number = 3
  ): Promise<boolean> {
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      try {
        attempt++;
        const success = await this.uploadToSupabase(item, settings);
        if (success) return true;
      } catch (err) {
        console.warn(`[SyncEngine] Attempt ${attempt}/${maxRetries} failed for screenshot ${item.id}:`, err);
      }

      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }

    return false;
  }

  /**
   * Upload payload to Supabase database & storage
   */
  private async uploadToSupabase(item: ScreenshotItem, settings: AppSettings): Promise<boolean> {
    const userIdToUse = (item.user_id && item.user_id !== "guest")
      ? item.user_id
      : (item.userId && item.userId !== "guest")
        ? item.userId
        : (this.currentUserId && this.currentUserId !== "guest")
          ? this.currentUserId
          : null;

    let imageUrlToUse = item.imageUrl || item.image_uri || "";

    // Upload image to Supabase Storage bucket if base64/blob
    if (isSupabaseConfigured && userIdToUse && imageUrlToUse.startsWith("data:")) {
      try {
        const res = await fetch(imageUrlToUse);
        const blob = await res.blob();
        const fileExt = blob.type.split("/")[1] || "png";
        const filePath = `${userIdToUse}/${item.id}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("screenshots")
          .upload(filePath, blob, { upsert: true });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from("screenshots")
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            imageUrlToUse = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn("[SyncEngine] Supabase storage upload warning:", err);
      }
    }

    const payload: any = {
      id: item.id,
      user_id: userIdToUse,
      title: item.title || "Screenshot",
      category: item.category || "Other",
      image_url: imageUrlToUse,
      image_uri: imageUrlToUse,
      ocr_snippet: item.summary || (item.fullText || "").slice(0, 200),
      ocr_text: item.fullText || item.ocr_text || "",
      full_ocr_text: item.fullText || item.ocr_text || "",
      ai_description: item.ai_description || item.description || item.summary || "",
      description: item.description || item.ai_description || item.summary || "",
      summary: item.summary || "",
      key_entities: item.keyEntities || item.keywords || [],
      tags: item.tags || [],
      keywords: item.keywords || item.keyEntities || [],
      objects: item.objects || item.objectsDetected || [],
      key_metrics: item.keyMetrics || [],
      file_name: item.fileName || item.file_name || "screenshot.png",
      file_size_mb: (item.fileSizeKB || 0) / 1024,
      file_size_kb: item.fileSizeKB || 0,
      is_favorite: Boolean(item.isFavorite || item.favorite),
      date_created: item.createdAt || item.date_created || new Date().toISOString(),
      date_modified: item.dateModified || item.date_modified || new Date().toISOString(),
      created_at: item.createdAt || item.date_created || new Date().toISOString(),
      indexed_at: item.indexedAt || item.indexed_at || new Date().toISOString(),
      sha256_hash: item.sha256Hash || item.hash || item.sha256_hash || item.fileHash || null,
      file_hash: item.sha256Hash || item.hash || item.sha256_hash || item.fileHash || null,
      website_name: item.website_name || item.websiteName || item.website?.name || null,
      website_domain: item.website_domain || item.websiteDomain || item.website?.domain || null,
      detected_urls: item.detected_urls || item.detectedUrls || item.urls || item.website?.detectedUrls || [],
      has_qr_code: Boolean(item.has_qr_code || item.hasQrCode || (typeof item.qr_code === "object" && item.qr_code?.hasQrCode)),
      qr_code_type: item.qr_code_type || item.qrCodeType || (typeof item.qr_code === "object" ? item.qr_code?.type : null),
      qr_code_data: item.qr_code_data || item.qrCodeData || (typeof item.qr_code === "object" ? item.qr_code?.data : typeof item.qr_code === "string" ? item.qr_code : null),
      qr_url: item.qr_url || item.qrUrl || (typeof item.qr_code === "object" ? item.qr_code?.url : null),
    };

    if (isSupabaseConfigured) {
      // Conflict resolution check
      const { data: remoteData } = await supabase
        .from("screenshots")
        .select("date_modified, created_at")
        .eq("id", item.id)
        .maybeSingle();

      if (remoteData && (remoteData.date_modified || remoteData.created_at)) {
        const remoteTime = new Date(remoteData.date_modified || remoteData.created_at).getTime();
        const localTime = new Date(item.dateModified || item.createdAt || Date.now()).getTime();

        if (remoteTime > localTime) {
          console.log(`[SyncEngine] Conflict resolved (Remote is newer for ${item.id}).`);
          return true;
        }
      }

      // Upsert local record into Supabase
      const { error } = await supabase.from("screenshots").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("[SyncEngine] Supabase upsert error:", error.message);
        return false;
      }
      return true;
    } else {
      // Offline / demo simulation
      await new Promise((res) => setTimeout(res, 300));
      return true;
    }
  }

  /**
   * Sync user settings & search history
   */
  private async syncSettingsAndHistory(settings: AppSettings): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUserId || this.currentUserId === "guest") return;

    try {
      const history = loadSearchHistory();
      await supabase.from("settings").upsert({
        user_id: this.currentUserId,
        theme: settings.theme,
        cloud_sync: settings.syncEnabled !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (history.length > 0) {
        const historyRecords = history.slice(0, 30).map((h) => ({
          id: h.id,
          user_id: this.currentUserId,
          query: h.query,
          timestamp: h.timestamp,
          result_count: h.resultCount,
          category_filter: h.categoryFilter || "All",
        }));
        await supabase.from("search_history").upsert(historyRecords, { onConflict: "id" });
      }
    } catch (e) {
      console.warn("[SyncEngine] Failed to sync settings/history to Supabase:", e);
    }
  }

  /**
   * Download user screenshots from Supabase
   */
  public async downloadUserScreenshotsFromSupabase(userId: string): Promise<ScreenshotItem[]> {
    if (!isSupabaseConfigured || !userId || userId === "guest") {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("screenshots")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.warn("[SyncEngine] Failed to download screenshots from Supabase:", error.message);
        return [];
      }

      if (!data || data.length === 0) return [];

      return data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id || userId,
        userId: row.user_id || userId,
        title: row.title || "Screenshot",
        category: row.category || "Other",
        summary: row.ai_description || row.ocr_snippet || "",
        ai_description: row.ai_description || row.ocr_snippet || "",
        fullText: row.full_ocr_text || row.ocr_text || "",
        ocr_text: row.full_ocr_text || row.ocr_text || "",
        keyEntities: Array.isArray(row.key_entities) ? row.key_entities : (Array.isArray(row.keywords) ? row.keywords : []),
        tags: Array.isArray(row.tags) ? row.tags : ["screenshot"],
        imageUrl: row.image_url || row.image_uri || "",
        image_uri: row.image_url || row.image_uri || "",
        createdAt: row.created_at || row.date_created || new Date().toISOString(),
        date_created: row.created_at || row.date_created || new Date().toISOString(),
        dateModified: row.date_modified || row.created_at || new Date().toISOString(),
        date_modified: row.date_modified || row.created_at || new Date().toISOString(),
        indexedAt: row.indexed_at || row.created_at || new Date().toISOString(),
        isFavorite: Boolean(row.is_favorite),
        favorite: Boolean(row.is_favorite),
        fileSizeKB: row.file_size_mb ? Math.round(row.file_size_mb * 1024) : (row.file_size_kb || 500),
        fileName: row.file_name || "screenshot.png",
        sha256Hash: row.sha256_hash || row.file_hash || row.hash || undefined,
        sha256_hash: row.sha256_hash || row.file_hash || row.hash || undefined,
        hash: row.sha256_hash || row.file_hash || row.hash || undefined,
        fileHash: row.file_hash || row.sha256_hash || row.hash || undefined,
        syncStatus: "Synced",
      }));
    } catch (err) {
      console.error("[SyncEngine] Exception downloading screenshots:", err);
      return [];
    }
  }

  /**
   * Restore all user data on Login (Screenshots, Settings, Search History, Search Engine Index)
   */
  public async restoreUserDataOnLogin(userId: string): Promise<{
    screenshots: ScreenshotItem[];
    settings?: AppSettings;
    history?: SearchHistoryItem[];
  }> {
    console.log(`[SyncEngine] Restoring user data on login for user_id: ${userId}...`);
    this.currentUserId = userId;

    // 1. Download screenshots from Supabase
    const remoteScreenshots = await this.downloadUserScreenshotsFromSupabase(userId);

    // 2. Load local screenshots from StorageProvider
    const provider = StorageManager.getProvider();
    const localScreenshots = await provider.getAllScreenshots();

    // 3. Merge remote & local screenshots
    const mergedMap = new Map<string, ScreenshotItem>();

    // Add local screenshots
    for (const item of localScreenshots) {
      if (!item.user_id || item.user_id === "guest" || item.user_id === userId) {
        mergedMap.set(item.id, {
          ...item,
          user_id: userId,
          userId: userId,
        });
      }
    }

    // Merge remote screenshots
    for (const remoteItem of remoteScreenshots) {
      const existingLocal = mergedMap.get(remoteItem.id);
      if (!existingLocal) {
        mergedMap.set(remoteItem.id, remoteItem);
      } else {
        const remoteTime = new Date(remoteItem.dateModified || remoteItem.createdAt || 0).getTime();
        const localTime = new Date(existingLocal.dateModified || existingLocal.createdAt || 0).getTime();

        if (remoteTime >= localTime) {
          mergedMap.set(remoteItem.id, { ...remoteItem, user_id: userId });
        }
      }
    }

    const mergedScreenshots = Array.from(mergedMap.values());

    // 4. Save restored cache to SQLite & Local Storage
    saveStoredScreenshots(mergedScreenshots);
    for (const sc of mergedScreenshots) {
      await provider.saveScreenshot(sc);
    }

    // 5. Rebuild SearchEngine inverted index & FlexSearch
    searchEngine.updateIndex(mergedScreenshots);

    // 6. Download & restore search history
    let restoredHistory: SearchHistoryItem[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data: historyData } = await supabase
          .from("search_history")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (historyData && historyData.length > 0) {
          restoredHistory = historyData.map((h: any) => ({
            id: h.id,
            query: h.query,
            timestamp: h.timestamp || h.created_at,
            resultCount: h.result_count || 0,
            categoryFilter: h.category_filter,
          }));
          saveSearchHistory(restoredHistory);
        }
      } catch (e) {
        console.warn("[SyncEngine] Search history restore warning:", e);
      }
    }

    // 7. Download & restore settings
    let restoredSettings: AppSettings | undefined;
    if (isSupabaseConfigured) {
      try {
        const { data: settingsData } = await supabase
          .from("settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (settingsData) {
          const local = loadSettings();
          restoredSettings = {
            ...local,
            theme: settingsData.theme || local.theme,
            syncEnabled: settingsData.cloud_sync !== false,
          };
          saveSettings(restoredSettings);
        }
      } catch (e) {
        console.warn("[SyncEngine] Settings restore warning:", e);
      }
    }

    this.pendingCount = mergedScreenshots.filter(
      (sc) => sc.syncStatus === "Pending" || sc.syncStatus === "Failed"
    ).length;
    this.lastSyncedAt = new Date().toISOString();
    this.notify();

    return {
      screenshots: mergedScreenshots,
      settings: restoredSettings,
      history: restoredHistory,
    };
  }
}

export const SyncEngine = new SyncEngineService();

