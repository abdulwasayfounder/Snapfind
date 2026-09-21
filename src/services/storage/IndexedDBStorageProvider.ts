import { StorageProvider } from "./types";
import { ScreenshotItem, AppSettings, SearchHistoryItem, UserProfile } from "../../types";
import { DEFAULT_SETTINGS, DEFAULT_USER, normalizeScreenshotItem } from "../storage.ts";
import { INITIAL_SAMPLE_SCREENSHOTS } from "../../data/sampleScreenshots";

export class IndexedDBStorageProvider implements StorageProvider {
  private dbName = "SnapFindDB_v1";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  public async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        console.warn("IndexedDB unavailable in current environment.");
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("screenshots")) {
          db.createObjectStore("screenshots", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("search_history")) {
          db.createObjectStore("search_history", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        try {
          await this.migrateFromLocalStorage();
        } catch (err) {
          console.warn("Migration warning during IndexedDB init:", err);
        }
        resolve();
      };

      request.onerror = () => {
        console.error("IndexedDB failed to open:", request.error);
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      const isMigrated = localStorage.getItem("snapfind_migrated_to_idb") === "true";
      if (isMigrated) return;

      console.log("[IndexedDBStorageProvider] Starting automatic migration from localStorage -> IndexedDB...");

      // 1. Screenshots Migration
      const rawScreenshots = localStorage.getItem("snapfind_screenshots_v1");
      let itemsToMigrate: ScreenshotItem[] = [];
      if (rawScreenshots) {
        try {
          const parsed = JSON.parse(rawScreenshots);
          if (Array.isArray(parsed) && parsed.length > 0) {
            itemsToMigrate = parsed.map(normalizeScreenshotItem);
          }
        } catch (e) {
          console.warn("Failed to parse legacy localStorage screenshots:", e);
        }
      }

      if (itemsToMigrate.length === 0) {
        itemsToMigrate = INITIAL_SAMPLE_SCREENSHOTS.map(normalizeScreenshotItem);
      }

      await this.saveAllScreenshots(itemsToMigrate);

      // 2. Settings Migration
      const rawSettings = localStorage.getItem("snapfind_settings_v1");
      if (rawSettings) {
        try {
          const parsedSettings = JSON.parse(rawSettings);
          await this.saveSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        } catch (e) {
          await this.saveSettings(DEFAULT_SETTINGS);
        }
      } else {
        await this.saveSettings(DEFAULT_SETTINGS);
      }

      // 3. Search History Migration
      const rawHistory = localStorage.getItem("snapfind_search_history_v1");
      if (rawHistory) {
        try {
          const parsedHistory = JSON.parse(rawHistory);
          if (Array.isArray(parsedHistory)) {
            await this.saveSearchHistory(parsedHistory);
          }
        } catch (e) {
          console.warn("Failed to parse legacy search history:", e);
        }
      }

      // 4. User Profile Migration
      const rawUser = localStorage.getItem("snapfind_user_v1");
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser);
          await this.saveUserProfile({ ...DEFAULT_USER, ...parsedUser });
        } catch (e) {
          await this.saveUserProfile(DEFAULT_USER);
        }
      }

      // 5. Metadata (last scan timestamp & indexed image IDs)
      const lastScan = localStorage.getItem("snapfind_last_scan_timestamp");
      if (lastScan) {
        await this.setLastScanTimestamp(lastScan);
      }

      const indexedIdsRaw = localStorage.getItem("snapfind_indexed_image_ids");
      if (indexedIdsRaw) {
        try {
          const parsedIds = JSON.parse(indexedIdsRaw);
          if (Array.isArray(parsedIds)) {
            await this.saveIndexedImageIds(new Set(parsedIds));
          }
        } catch (e) {}
      }

      localStorage.setItem("snapfind_migrated_to_idb", "true");
      console.log("[IndexedDBStorageProvider] Automatic localStorage migration completed successfully.");
    } catch (err) {
      console.error("Error migrating localStorage to IndexedDB:", err);
    }
  }

  public async saveScreenshot(screenshot: ScreenshotItem): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    const normalized = normalizeScreenshotItem(screenshot);
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("screenshots", "readwrite");
      const store = tx.objectStore("screenshots");
      const req = store.put(normalized);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getScreenshot(id: string): Promise<ScreenshotItem | null> {
    await this.initialize();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("screenshots", "readonly");
      const store = tx.objectStore("screenshots");
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          resolve(normalizeScreenshotItem(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllScreenshots(): Promise<ScreenshotItem[]> {
    await this.initialize();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("screenshots", "readonly");
      const store = tx.objectStore("screenshots");
      const req = store.getAll();
      req.onsuccess = () => {
        const results: ScreenshotItem[] = req.result || [];
        resolve(results.map(normalizeScreenshotItem));
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async updateScreenshot(id: string, updates: Partial<ScreenshotItem>): Promise<ScreenshotItem | null> {
    await this.initialize();
    const existing = await this.getScreenshot(id);
    if (!existing) return null;

    const updated = normalizeScreenshotItem({
      ...existing,
      ...updates,
      id, // Preserve ID
    });

    await this.saveScreenshot(updated);
    return updated;
  }

  public async deleteScreenshot(id: string): Promise<boolean> {
    await this.initialize();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("screenshots", "readwrite");
      const store = tx.objectStore("screenshots");
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  public async searchScreenshots(query: string): Promise<ScreenshotItem[]> {
    const all = await this.getAllScreenshots();
    if (!query || !query.trim()) return all;

    const qLower = query.toLowerCase().trim();
    return all.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const ocr = (item.fullText || item.ocr_text || "").toLowerCase();
      const summary = (item.summary || item.ai_description || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const tags = (item.tags || []).join(" ").toLowerCase();

      return (
        title.includes(qLower) ||
        ocr.includes(qLower) ||
        summary.includes(qLower) ||
        cat.includes(qLower) ||
        tags.includes(qLower)
      );
    });
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("settings", "readwrite");
      const store = tx.objectStore("settings");
      const req = store.put({ key: "app_settings", value: settings });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async loadSettings(): Promise<AppSettings> {
    await this.initialize();
    if (!this.db) return DEFAULT_SETTINGS;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("settings", "readonly");
      const store = tx.objectStore("settings");
      const req = store.get("app_settings");
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...req.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  }

  public async saveScreenshotsBatch(items: ScreenshotItem[]): Promise<void> {
    if (!items || items.length === 0) return;
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("screenshots", "readwrite");
      const store = tx.objectStore("screenshots");
      items.forEach((item) => store.put(normalizeScreenshotItem(item)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveAllScreenshots(screenshots: ScreenshotItem[]): Promise<void> {
    await this.initialize();
    if (!this.db) return;
    if (!screenshots || screenshots.length === 0) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("screenshots", "readwrite");
      const store = tx.objectStore("screenshots");
      screenshots.forEach((sc) => store.put(normalizeScreenshotItem(sc)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveSearchHistory(history: SearchHistoryItem[]): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("search_history", "readwrite");
      const store = tx.objectStore("search_history");
      store.clear();
      history.slice(0, 30).forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async loadSearchHistory(): Promise<SearchHistoryItem[]> {
    await this.initialize();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("search_history", "readonly");
      const store = tx.objectStore("search_history");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  public async saveUserProfile(user: UserProfile): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("metadata", "readwrite");
      const store = tx.objectStore("metadata");
      const req = store.put({ key: "user_profile", value: user });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async loadUserProfile(): Promise<UserProfile> {
    await this.initialize();
    if (!this.db) return DEFAULT_USER;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("metadata", "readonly");
      const store = tx.objectStore("metadata");
      const req = store.get("user_profile");
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_USER, ...req.result.value });
        } else {
          resolve(DEFAULT_USER);
        }
      };
      req.onerror = () => resolve(DEFAULT_USER);
    });
  }

  public async getLastScanTimestamp(): Promise<string> {
    await this.initialize();
    if (!this.db) return "1970-01-01T00:00:00.000Z";

    return new Promise((resolve) => {
      const tx = this.db!.transaction("metadata", "readonly");
      const store = tx.objectStore("metadata");
      const req = store.get("last_scan_timestamp");
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve(req.result.value);
        } else {
          resolve("1970-01-01T00:00:00.000Z");
        }
      };
      req.onerror = () => resolve("1970-01-01T00:00:00.000Z");
    });
  }

  public async setLastScanTimestamp(timestampIso: string): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("metadata", "readwrite");
      const store = tx.objectStore("metadata");
      const req = store.put({ key: "last_scan_timestamp", value: timestampIso });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getIndexedImageIds(): Promise<Set<string>> {
    await this.initialize();
    if (!this.db) return new Set();

    return new Promise((resolve) => {
      const tx = this.db!.transaction("metadata", "readonly");
      const store = tx.objectStore("metadata");
      const req = store.get("indexed_image_ids");
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.value)) {
          resolve(new Set(req.result.value));
        } else {
          resolve(new Set());
        }
      };
      req.onerror = () => resolve(new Set());
    });
  }

  public async saveIndexedImageIds(idsSet: Set<string>): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction("metadata", "readwrite");
      const store = tx.objectStore("metadata");
      const req = store.put({ key: "indexed_image_ids", value: Array.from(idsSet) });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllData(): Promise<void> {
    await this.initialize();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["screenshots", "settings", "search_history", "metadata"], "readwrite");
      tx.objectStore("screenshots").clear();
      tx.objectStore("settings").clear();
      tx.objectStore("search_history").clear();
      tx.objectStore("metadata").clear();
      tx.oncomplete = () => {
        localStorage.removeItem("snapfind_migrated_to_idb");
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}
