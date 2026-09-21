import { StorageProvider } from "./types";
import { ScreenshotItem, AppSettings, SearchHistoryItem, UserProfile } from "../../types";
import { DEFAULT_SETTINGS, DEFAULT_USER, normalizeScreenshotItem } from "../storage.ts";
import { IndexedDBStorageProvider } from "./IndexedDBStorageProvider";
import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";

/**
 * SQLiteStorageProvider
 * Native SQLite storage provider implementation for Android (Capacitor SQLite).
 * Automatically delegates to IndexedDB StorageProvider when running in web preview
 * or if native SQLite is unavailable.
 */
export class SQLiteStorageProvider implements StorageProvider {
  private fallbackWebProvider: IndexedDBStorageProvider;
  private isNativeAvailable: boolean = false;
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private dbName: string = "snapfind_sqlite_v1";
  private isInitialized: boolean = false;

  constructor() {
    this.fallbackWebProvider = new IndexedDBStorageProvider();
    this.isNativeAvailable = Capacitor.isNativePlatform();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isNativeAvailable) {
      console.log(
        "[SQLiteStorageProvider] Operating in web environment. Delegating storage to IndexedDBStorageProvider."
      );
      await this.fallbackWebProvider.initialize();
      this.isInitialized = true;
      return;
    }

    try {
      console.log("[SQLiteStorageProvider] Initializing native SQLite connection...");
      this.sqlite = new SQLiteConnection(CapacitorSQLite);

      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

      if (isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(this.dbName, false, "no-encryption", 1, false);
      }

      await this.db.open();

      // Create tables for screenshots, settings, search_history, and metadata
      const createTablesSql = `
        CREATE TABLE IF NOT EXISTS screenshots (
          id TEXT PRIMARY KEY,
          title TEXT,
          fullText TEXT,
          summary TEXT,
          category TEXT,
          dateAdded INTEGER,
          jsonData TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
        CREATE TABLE IF NOT EXISTS search_history (
          id TEXT PRIMARY KEY,
          query TEXT,
          timestamp TEXT,
          jsonData TEXT
        );
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `;

      await this.db.execute(createTablesSql);
      this.isInitialized = true;
      console.log("[SQLiteStorageProvider] Native SQLite database & schema initialized successfully.");
    } catch (err) {
      console.warn("[SQLiteStorageProvider] Error initializing native SQLite database. Falling back to IndexedDB:", err);
      this.isNativeAvailable = false;
      await this.fallbackWebProvider.initialize();
      this.isInitialized = true;
    }
  }

  public async saveScreenshot(screenshot: ScreenshotItem): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveScreenshot(screenshot);
    }

    const normalized = normalizeScreenshotItem(screenshot);
    const query = `INSERT OR REPLACE INTO screenshots (id, title, fullText, summary, category, dateAdded, jsonData) VALUES (?, ?, ?, ?, ?, ?, ?);`;
    const dateMs = normalized.dateModified
      ? Number(normalized.dateModified)
      : normalized.createdAt
      ? new Date(normalized.createdAt).getTime()
      : Date.now();

    const values = [
      normalized.id,
      normalized.title || "",
      normalized.fullText || normalized.ocr_text || "",
      normalized.summary || normalized.ai_description || "",
      normalized.category || "General",
      dateMs,
      JSON.stringify(normalized),
    ];

    await this.db.run(query, values);
  }

  public async getScreenshot(id: string): Promise<ScreenshotItem | null> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.getScreenshot(id);
    }

    const res = await this.db.query("SELECT jsonData FROM screenshots WHERE id = ?;", [id]);
    if (res.values && res.values.length > 0) {
      try {
        return normalizeScreenshotItem(JSON.parse(res.values[0].jsonData));
      } catch (e) {
        console.error("[SQLiteStorageProvider] Failed to parse screenshot jsonData:", e);
      }
    }
    return null;
  }

  public async getAllScreenshots(): Promise<ScreenshotItem[]> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.getAllScreenshots();
    }

    const res = await this.db.query("SELECT jsonData FROM screenshots ORDER BY dateAdded DESC;");
    if (res.values && res.values.length > 0) {
      const items: ScreenshotItem[] = [];
      for (const row of res.values) {
        try {
          items.push(normalizeScreenshotItem(JSON.parse(row.jsonData)));
        } catch (e) {
          console.error("[SQLiteStorageProvider] Failed to parse screenshot row:", e);
        }
      }
      return items;
    }
    return [];
  }

  public async updateScreenshot(id: string, updates: Partial<ScreenshotItem>): Promise<ScreenshotItem | null> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.updateScreenshot(id, updates);
    }

    const existing = await this.getScreenshot(id);
    if (!existing) return null;

    const updated = normalizeScreenshotItem({
      ...existing,
      ...updates,
      id,
    });

    await this.saveScreenshot(updated);
    return updated;
  }

  public async deleteScreenshot(id: string): Promise<boolean> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.deleteScreenshot(id);
    }

    await this.db.run("DELETE FROM screenshots WHERE id = ?;", [id]);
    return true;
  }

  public async searchScreenshots(query: string): Promise<ScreenshotItem[]> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.searchScreenshots(query);
    }

    if (!query || !query.trim()) {
      return this.getAllScreenshots();
    }

    const qLower = `%${query.toLowerCase().trim()}%`;
    const sql = `
      SELECT jsonData FROM screenshots 
      WHERE LOWER(title) LIKE ? 
         OR LOWER(fullText) LIKE ? 
         OR LOWER(summary) LIKE ? 
         OR LOWER(category) LIKE ? 
      ORDER BY dateAdded DESC;
    `;

    const res = await this.db.query(sql, [qLower, qLower, qLower, qLower]);
    if (res.values && res.values.length > 0) {
      const results: ScreenshotItem[] = [];
      for (const row of res.values) {
        try {
          results.push(normalizeScreenshotItem(JSON.parse(row.jsonData)));
        } catch (e) {}
      }
      return results;
    }

    return [];
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveSettings(settings);
    }

    const jsonVal = JSON.stringify(settings);
    await this.db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);", ["app_settings", jsonVal]);
  }

  public async loadSettings(): Promise<AppSettings> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.loadSettings();
    }

    const res = await this.db.query("SELECT value FROM settings WHERE key = ?;", ["app_settings"]);
    if (res.values && res.values.length > 0) {
      try {
        const parsed = JSON.parse(res.values[0].value);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  }

  public async saveScreenshotsBatch(items: ScreenshotItem[]): Promise<void> {
    if (!items || items.length === 0) return;
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveScreenshotsBatch(items);
    }

    try {
      await this.db.execute("BEGIN TRANSACTION;");
      const query = `INSERT OR REPLACE INTO screenshots (id, title, fullText, summary, category, dateAdded, jsonData) VALUES (?, ?, ?, ?, ?, ?, ?);`;

      for (const sc of items) {
        const normalized = normalizeScreenshotItem(sc);
        const dateMs = normalized.dateModified
          ? Number(normalized.dateModified)
          : normalized.createdAt
          ? new Date(normalized.createdAt).getTime()
          : Date.now();

        const values = [
          normalized.id,
          normalized.title || "",
          normalized.fullText || normalized.ocr_text || "",
          normalized.summary || normalized.ai_description || "",
          normalized.category || "General",
          dateMs,
          JSON.stringify(normalized),
        ];

        await this.db.run(query, values);
      }
      await this.db.execute("COMMIT;");
    } catch (err) {
      console.warn("[SQLiteStorageProvider] Batch insert error, attempting rollback:", err);
      try {
        await this.db.execute("ROLLBACK;");
      } catch {}
      // Fallback sequentially if transaction failed
      for (const sc of items) {
        await this.saveScreenshot(sc);
      }
    }
  }

  public async saveAllScreenshots(screenshots: ScreenshotItem[]): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveAllScreenshots(screenshots);
    }
    if (!screenshots || screenshots.length === 0) return;

    try {
      await this.db.execute("BEGIN TRANSACTION;");

      const query = `INSERT OR REPLACE INTO screenshots (id, title, fullText, summary, category, dateAdded, jsonData) VALUES (?, ?, ?, ?, ?, ?, ?);`;
      for (const sc of screenshots) {
        const normalized = normalizeScreenshotItem(sc);
        const dateMs = normalized.dateModified
          ? Number(normalized.dateModified)
          : normalized.createdAt
          ? new Date(normalized.createdAt).getTime()
          : Date.now();

        const values = [
          normalized.id,
          normalized.title || "",
          normalized.fullText || normalized.ocr_text || "",
          normalized.summary || normalized.ai_description || "",
          normalized.category || "General",
          dateMs,
          JSON.stringify(normalized),
        ];

        await this.db.run(query, values);
      }
      await this.db.execute("COMMIT;");
    } catch (err) {
      console.warn("[SQLiteStorageProvider] saveAllScreenshots error, rollback:", err);
      try {
        await this.db.execute("ROLLBACK;");
      } catch {}
      await this.db.run("DELETE FROM screenshots;");
      for (const sc of screenshots) {
        await this.saveScreenshot(sc);
      }
    }
  }

  public async saveSearchHistory(history: SearchHistoryItem[]): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveSearchHistory(history);
    }

    await this.db.run("DELETE FROM search_history;");
    for (const item of history.slice(0, 30)) {
      await this.db.run(
        "INSERT OR REPLACE INTO search_history (id, query, timestamp, jsonData) VALUES (?, ?, ?, ?);",
        [item.id, item.query, item.timestamp, JSON.stringify(item)]
      );
    }
  }

  public async loadSearchHistory(): Promise<SearchHistoryItem[]> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.loadSearchHistory();
    }

    const res = await this.db.query("SELECT jsonData FROM search_history ORDER BY timestamp DESC;");
    if (res.values && res.values.length > 0) {
      const list: SearchHistoryItem[] = [];
      for (const row of res.values) {
        try {
          list.push(JSON.parse(row.jsonData));
        } catch (e) {}
      }
      return list;
    }
    return [];
  }

  public async saveUserProfile(user: UserProfile): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveUserProfile(user);
    }

    await this.db.run("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);", ["user_profile", JSON.stringify(user)]);
  }

  public async loadUserProfile(): Promise<UserProfile> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.loadUserProfile();
    }

    const res = await this.db.query("SELECT value FROM metadata WHERE key = ?;", ["user_profile"]);
    if (res.values && res.values.length > 0) {
      try {
        const parsed = JSON.parse(res.values[0].value);
        return { ...DEFAULT_USER, ...parsed };
      } catch (e) {}
    }
    return DEFAULT_USER;
  }

  public async getLastScanTimestamp(): Promise<string> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.getLastScanTimestamp();
    }

    const res = await this.db.query("SELECT value FROM metadata WHERE key = ?;", ["last_scan_timestamp"]);
    if (res.values && res.values.length > 0) {
      return res.values[0].value;
    }
    return "1970-01-01T00:00:00.000Z";
  }

  public async setLastScanTimestamp(timestampIso: string): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.setLastScanTimestamp(timestampIso);
    }

    await this.db.run("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);", ["last_scan_timestamp", timestampIso]);
  }

  public async getIndexedImageIds(): Promise<Set<string>> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.getIndexedImageIds();
    }

    const res = await this.db.query("SELECT value FROM metadata WHERE key = ?;", ["indexed_image_ids"]);
    if (res.values && res.values.length > 0) {
      try {
        const arr = JSON.parse(res.values[0].value);
        if (Array.isArray(arr)) return new Set(arr);
      } catch (e) {}
    }
    return new Set();
  }

  public async saveIndexedImageIds(idsSet: Set<string>): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.saveIndexedImageIds(idsSet);
    }

    const arr = Array.from(idsSet);
    await this.db.run("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);", ["indexed_image_ids", JSON.stringify(arr)]);
  }

  public async clearAllData(): Promise<void> {
    await this.initialize();
    if (!this.isNativeAvailable || !this.db) {
      return this.fallbackWebProvider.clearAllData();
    }

    await this.db.run("DELETE FROM screenshots;");
    await this.db.run("DELETE FROM settings;");
    await this.db.run("DELETE FROM search_history;");
    await this.db.run("DELETE FROM metadata;");
  }
}

