import { ScreenshotItem, AppSettings, SearchHistoryItem, UserProfile } from "../../types";

export interface StorageProvider {
  /**
   * Initialize storage provider (open database connection, setup schema, run automatic migrations)
   */
  initialize(): Promise<void>;

  /**
   * Save or insert a screenshot item into persistent storage
   */
  saveScreenshot(screenshot: ScreenshotItem): Promise<void>;

  /**
   * Retrieve a single screenshot by ID
   */
  getScreenshot(id: string): Promise<ScreenshotItem | null>;

  /**
   * Retrieve all stored screenshot items
   */
  getAllScreenshots(): Promise<ScreenshotItem[]>;

  /**
   * Update an existing screenshot by ID with partial fields
   */
  updateScreenshot(id: string, updates: Partial<ScreenshotItem>): Promise<ScreenshotItem | null>;

  /**
   * Delete a screenshot by ID
   */
  deleteScreenshot(id: string): Promise<boolean>;

  /**
   * Search stored screenshots matching a natural language or keyword query
   */
  searchScreenshots(query: string): Promise<ScreenshotItem[]>;

  /**
   * Save app settings to persistent storage
   */
  saveSettings(settings: AppSettings): Promise<void>;

  /**
   * Load app settings from persistent storage
   */
  loadSettings(): Promise<AppSettings>;

  /**
   * Batch save all screenshot items
   */
  saveAllScreenshots?(screenshots: ScreenshotItem[]): Promise<void>;

  /**
   * Batch insert or update a list of screenshot items efficiently in a single transaction
   */
  saveScreenshotsBatch?(items: ScreenshotItem[]): Promise<void>;

  /**
   * Save search history entries
   */
  saveSearchHistory?(history: SearchHistoryItem[]): Promise<void>;

  /**
   * Load search history entries
   */
  loadSearchHistory?(): Promise<SearchHistoryItem[]>;

  /**
   * Save user profile
   */
  saveUserProfile?(user: UserProfile): Promise<void>;

  /**
   * Load user profile
   */
  loadUserProfile?(): Promise<UserProfile>;

  /**
   * Get the last gallery scan timestamp
   */
  getLastScanTimestamp?(): Promise<string>;

  /**
   * Update the last gallery scan timestamp
   */
  setLastScanTimestamp?(timestampIso: string): Promise<void>;

  /**
   * Get set of indexed image IDs
   */
  getIndexedImageIds?(): Promise<Set<string>>;

  /**
   * Save set of indexed image IDs
   */
  saveIndexedImageIds?(idsSet: Set<string>): Promise<void>;

  /**
   * Clear all stored application data
   */
  clearAllData?(): Promise<void>;
}

export type StorageProviderType = "indexeddb" | "sqlite";
