import { ScreenshotItem, SearchHistoryItem, AppSettings, UserProfile, AppNotification } from "../types";
import { INITIAL_SAMPLE_SCREENSHOTS } from "../data/sampleScreenshots";
import { StorageManager, storageProvider } from "./storage/StorageManager";
import { StorageProvider } from "./storage/types";
import { IndexedDBStorageProvider } from "./storage/IndexedDBStorageProvider";
import { SQLiteStorageProvider } from "./storage/SQLiteStorageProvider";
import { SyncEngine } from "./syncEngine";

export { StorageManager, storageProvider, IndexedDBStorageProvider, SQLiteStorageProvider, SyncEngine };
export type { StorageProvider };

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  accentColor: "blue",
  compactGridView: false,
  reducedMotion: false,
  fontScale: "normal",

  language: "en-US",
  autoLaunchAtStartup: true,
  confirmBeforeDelete: true,
  defaultView: "gallery",

  enableNotifications: true,
  notifyOnSecurityAlerts: true,
  notifyOnSubscription: true,
  notifyOnIndexing: true,
  notifyOnStorageWarnings: true,
  notifyOnMarketing: false,
  soundEnabled: true,

  syncEnabled: true,
  uploadImagesToCloud: false,
  maxStorageLimitMB: 1024,
  autoCleanTrashDays: 30,
  offlineCacheEnabled: true,

  autoIndexNewScreenshots: true,
  ocrAccuracy: "accurate",
  detectLanguages: ["en", "es", "fr", "de", "zh", "ja"],
  ocrEngine: "hybrid",
  autoTagging: true,
  generateThumbnails: true,

  aiModel: "gemini-3.6-flash",
  aiSummaryLength: "detailed",
  extractKeyEntities: true,
  enableSemanticSearch: true,
  aiCreativityLevel: "balanced",

  telemetryEnabled: false,
  anonymizeOcrData: true,
  encryptLocalCache: true,
  biometricLock: false,
  autoLockMinutes: 15,

  planTier: "Pro",
  founder_banner_enabled: true,
  founderBannerEnabled: true,
};

export const DEFAULT_USER: UserProfile = {
  id: "guest",
  name: "Sign In",
  email: "",
  avatarUrl: "",
  isLoggedIn: false,
  plan: "Free",
  storageLimitMB: 1000,
};

export function getDefaultCollectionForCategory(category?: string): string {
  if (!category) return "General Vault";
  switch (category) {
    case "Passport":
    case "Ticket & Travel":
      return "Travel & Identity";
    case "Electricity Bill":
      return "Utility Bills";
    case "Recipe":
      return "Food & Recipes";
    case "QR Code":
    case "Admission & Certificate":
      return "Education & Passes";
    case "Receipt & Invoice":
    case "E-Commerce":
      return "Shopping & Receipts";
    case "Chat & Message":
      return "Chats & Messages";
    case "Code & Dev":
      return "Development & Code";
    case "Financial":
      return "Financial Statements";
    case "Notes & Ideas":
      return "Ideas & Notes";
    default:
      return "General Vault";
  }
}

export function normalizeScreenshotItem(item: Partial<ScreenshotItem>): ScreenshotItem {
  const imageUrl = item.imageUrl || item.image_uri || "";
  const fullText = item.fullText || item.ocr_text || "";
  const descriptionText = item.description || item.ai_description || item.summary || "";
  const summary = item.summary || descriptionText || "Imported screenshot";
  const isFavorite = item.isFavorite ?? item.favorite ?? false;
  const indexedAt = item.indexedAt || item.indexed_at || new Date().toISOString();
  const fileSizeKB = item.fileSizeKB ?? (item.file_size ? Math.round(item.file_size / 1024) : 0);

  const procStatus = item.processingStatus || item.processing_status || "Completed";
  const procTimestamp = item.processingTimestamp || item.processing_timestamp || indexedAt;
  
  // Keep keyEntities and keywords distinct
  const keyEntitiesList = Array.isArray(item.keyEntities) 
    ? item.keyEntities 
    : (Array.isArray((item as any).key_entities) ? (item as any).key_entities : []);
  const keywordsList = Array.isArray(item.keywords) 
    ? item.keywords 
    : [];
  const objectsList = Array.isArray(item.objects) && item.objects.length > 0
    ? item.objects
    : (Array.isArray(item.objectsDetected) ? item.objectsDetected : []);

  const tagsList = Array.isArray(item.tags)
    ? item.tags.map((t: string) => String(t).toLowerCase().replace(/^#/, ''))
    : [];

  const category = item.category || "Other";
  const colName =
    item.collectionName || item.collection || getDefaultCollectionForCategory(category);

  return {
    id: item.id || `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: item.user_id || item.userId || "guest",
    userId: item.userId || item.user_id || "guest",
    image_uri: item.image_uri || imageUrl,
    imageUrl: imageUrl,
    thumbnail_uri: item.thumbnail_uri || item.thumbnailUri || imageUrl,
    thumbnailUri: item.thumbnailUri || item.thumbnail_uri || imageUrl,
    ocr_text: item.ocr_text || fullText,
    fullText: fullText,
    ai_description: item.ai_description || descriptionText,
    description: descriptionText,
    summary: summary,
    title: item.title || "Screenshot",
    category: category,
    collectionName: colName,
    collection: colName,
    keyEntities: keyEntitiesList,
    keywords: keywordsList,
    tags: tagsList,
    objects: objectsList,
    objectsDetected: objectsList,
    textDensity: item.textDensity || "medium",
    keyMetrics: item.keyMetrics || [],
    file_name: item.file_name || item.fileName || "screenshot.png",
    fileName: item.fileName || item.file_name || "screenshot.png",
    folder: item.folder || "Screenshots",
    date_created: item.date_created || item.createdAt || new Date().toISOString(),
    createdAt: item.createdAt || String(item.date_created || new Date().toISOString()),
    date_modified: item.date_modified || item.dateModified || new Date().toISOString(),
    dateModified: item.dateModified || item.date_modified || new Date().toISOString(),
    width: item.width || item.dimensions?.width || 1080,
    height: item.height || item.dimensions?.height || 1920,
    dimensions: item.dimensions || { width: item.width || 1080, height: item.height || 1920 },
    file_size: item.file_size || fileSizeKB * 1024,
    fileSizeKB: fileSizeKB,
    favorite: isFavorite,
    isFavorite: isFavorite,
    is_screenshot: item.is_screenshot ?? item.isScreenshot ?? true,
    isScreenshot: item.isScreenshot ?? item.is_screenshot ?? true,
    indexed_at: item.indexed_at || indexedAt,
    indexedAt: indexedAt,
    last_scanned: item.last_scanned || item.lastScanned || new Date().toISOString(),
    lastScanned: item.lastScanned || item.last_scanned || new Date().toISOString(),
    processing_status: procStatus,
    processingStatus: procStatus,
    processing_timestamp: procTimestamp,
    processingTimestamp: procTimestamp,
    syncStatus: item.syncStatus || "Synced",
    syncError: item.syncError || undefined,
    lastSyncedAt: item.lastSyncedAt || undefined,
    content_hash: item.content_hash || item.contentHash || item.sha256Hash || item.hash || item.sha256_hash || item.fileHash || undefined,
    contentHash: item.contentHash || item.content_hash || item.sha256Hash || item.hash || item.sha256_hash || item.fileHash || undefined,
    sha256Hash: item.sha256Hash || item.content_hash || item.hash || item.sha256_hash || item.fileHash || undefined,
    sha256_hash: item.sha256_hash || item.content_hash || item.sha256Hash || item.hash || item.fileHash || undefined,
    hash: item.hash || item.content_hash || item.sha256Hash || item.sha256_hash || item.fileHash || undefined,
    fileHash: item.fileHash || item.content_hash || item.sha256Hash || item.hash || item.sha256_hash || undefined,
    privacy_level: item.privacy_level || item.privacyLevel || (item.is_sensitive || item.isSensitive ? "private" : "normal"),
    privacyLevel: item.privacyLevel || item.privacy_level || (item.is_sensitive || item.isSensitive ? "private" : "normal"),
    sensitive_categories: Array.isArray(item.sensitive_categories) ? item.sensitive_categories : Array.isArray(item.sensitiveCategories) ? item.sensitiveCategories : [],
    sensitiveCategories: Array.isArray(item.sensitiveCategories) ? item.sensitiveCategories : Array.isArray(item.sensitive_categories) ? item.sensitive_categories : [],
    is_sensitive: Boolean(item.is_sensitive || item.isSensitive || item.privacy_level === "private" || item.privacy_level === "highly_sensitive" || item.privacyLevel === "private" || item.privacyLevel === "highly_sensitive"),
    isSensitive: Boolean(item.isSensitive || item.is_sensitive || item.privacy_level === "private" || item.privacy_level === "highly_sensitive" || item.privacyLevel === "private" || item.privacyLevel === "highly_sensitive"),
    masked_ocr_text: item.masked_ocr_text || item.maskedOcrText || undefined,
    maskedOcrText: item.maskedOcrText || item.masked_ocr_text || undefined,
    privacy_reasons: item.privacy_reasons || item.privacyReasons || [],
    privacyReasons: item.privacyReasons || item.privacy_reasons || [],
    smart_category: item.smart_category || item.smartCategory || "Other",
    smartCategory: item.smartCategory || item.smart_category || "Other",
    in_vault: Boolean(item.in_vault ?? item.inVault ?? false),
    inVault: Boolean(item.inVault ?? item.in_vault ?? false),
    is_blurred: Boolean(item.is_blurred ?? item.isBlurred ?? (item.is_sensitive || item.isSensitive || item.privacy_level === "private" || item.privacy_level === "highly_sensitive" || item.privacyLevel === "private" || item.privacyLevel === "highly_sensitive")),
    isBlurred: Boolean(item.isBlurred ?? item.is_blurred ?? (item.is_sensitive || item.isSensitive || item.privacy_level === "private" || item.privacy_level === "highly_sensitive" || item.privacyLevel === "private" || item.privacyLevel === "highly_sensitive")),
    isDuplicate: item.isDuplicate ?? false,
    isAlreadyIndexed: item.isAlreadyIndexed ?? false,
    duplicateBadge: item.duplicateBadge || (item.isAlreadyIndexed || item.isDuplicate ? "Already Indexed" : undefined),
    duplicateReason: item.duplicateReason || undefined,
    isDeleted: item.isDeleted ?? item.is_deleted ?? false,
    is_deleted: item.is_deleted ?? item.isDeleted ?? false,
    deletedAt: item.deletedAt || item.deleted_at || undefined,
    deleted_at: item.deleted_at || item.deletedAt || undefined,
    // URL, Website & QR Code Structured Metadata
    website_name: item.website_name || item.websiteName || item.website?.name || undefined,
    websiteName: item.websiteName || item.website_name || item.website?.name || undefined,
    website_domain: item.website_domain || item.websiteDomain || item.website?.domain || undefined,
    websiteDomain: item.websiteDomain || item.website_domain || item.website?.domain || undefined,
    website_url: item.website_url || item.websiteUrl || item.website?.websiteUrl || item.website?.url || undefined,
    websiteUrl: item.websiteUrl || item.website_url || item.website?.websiteUrl || item.website?.url || undefined,
    detected_urls: Array.isArray(item.detected_urls)
      ? item.detected_urls
      : Array.isArray(item.detectedUrls)
      ? item.detectedUrls
      : Array.isArray(item.urls)
      ? item.urls
      : Array.isArray(item.website?.detectedUrls)
      ? item.website?.detectedUrls
      : [],
    detectedUrls: Array.isArray(item.detectedUrls)
      ? item.detectedUrls
      : Array.isArray(item.detected_urls)
      ? item.detected_urls
      : Array.isArray(item.urls)
      ? item.urls
      : Array.isArray(item.website?.detectedUrls)
      ? item.website?.detectedUrls
      : [],
    urls: Array.isArray(item.urls)
      ? item.urls
      : Array.isArray(item.detected_urls)
      ? item.detected_urls
      : Array.isArray(item.detectedUrls)
      ? item.detectedUrls
      : [],
    website: item.website || (item.website_domain || item.website_name || (item.detected_urls && item.detected_urls.length > 0) ? {
      name: item.website_name || item.websiteName,
      domain: item.website_domain || item.websiteDomain,
      url: item.website_url || item.websiteUrl || (item.detected_urls && item.detected_urls[0]),
      websiteUrl: item.website_url || item.websiteUrl || (item.detected_urls && item.detected_urls[0]),
      detectedUrls: item.detected_urls || item.detectedUrls || [],
    } : undefined),
    has_qr_code: Boolean(
      item.has_qr_code ||
      item.hasQrCode ||
      (typeof item.qr_code === "object" && item.qr_code?.hasQrCode) ||
      Boolean(item.qr_code_data) ||
      Boolean(item.qrCodeData)
    ),
    hasQrCode: Boolean(
      item.hasQrCode ||
      item.has_qr_code ||
      (typeof item.qr_code === "object" && item.qr_code?.hasQrCode) ||
      Boolean(item.qr_code_data) ||
      Boolean(item.qrCodeData)
    ),
    qr_code_type: item.qr_code_type || item.qrCodeType || (typeof item.qr_code === "object" ? item.qr_code?.type : undefined) || "OTHER",
    qrCodeType: item.qrCodeType || item.qr_code_type || (typeof item.qr_code === "object" ? item.qr_code?.type : undefined) || "OTHER",
    qr_code_data: item.qr_code_data ?? item.qrCodeData ?? (typeof item.qr_code === "object" ? item.qr_code?.data : typeof item.qr_code === "string" ? item.qr_code : null),
    qrCodeData: item.qrCodeData ?? item.qr_code_data ?? (typeof item.qr_code === "object" ? item.qr_code?.data : typeof item.qr_code === "string" ? item.qr_code : null),
    qr_url: item.qr_url ?? item.qrUrl ?? (typeof item.qr_code === "object" ? item.qr_code?.url : null),
    qrUrl: item.qrUrl ?? item.qr_url ?? (typeof item.qr_code === "object" ? item.qr_code?.url : null),
    qr_code: item.qr_code || (item.has_qr_code || item.hasQrCode || item.qr_code_data ? {
      hasQrCode: true,
      data: item.qr_code_data || item.qrCodeData || "",
      type: (item.qr_code_type || item.qrCodeType || "OTHER") as any,
      url: item.qr_url || item.qrUrl || undefined,
    } : undefined),
    visual_features: item.visual_features,
  };
}

// Global In-Memory Cache for 0ms Instant UI Renders while background async operations complete
let cachedScreenshots: ScreenshotItem[] | null = null;
let cachedSettings: AppSettings | null = null;
let cachedSearchHistory: SearchHistoryItem[] | null = null;
let cachedUserProfile: UserProfile | null = null;
let cachedNotifications: AppNotification[] | null = null;

export async function initializeStorage(): Promise<void> {
  await StorageManager.initialize();
  const provider = StorageManager.getProvider();

  cachedScreenshots = await provider.getAllScreenshots();
  if (!cachedScreenshots || cachedScreenshots.length === 0) {
    const samples = INITIAL_SAMPLE_SCREENSHOTS.map(normalizeScreenshotItem);
    if (provider.saveAllScreenshots) {
      await provider.saveAllScreenshots(samples);
    }
    cachedScreenshots = samples;
  }

  cachedSettings = await provider.loadSettings();
  if (provider.loadSearchHistory) {
    cachedSearchHistory = await provider.loadSearchHistory();
  }
  if (provider.loadUserProfile) {
    cachedUserProfile = await provider.loadUserProfile();
  }
}

export function loadStoredScreenshots(): ScreenshotItem[] {
  if (cachedScreenshots) return cachedScreenshots;
  
  // Synchronous fallback from localStorage if cache not initialized yet
  try {
    const raw = localStorage.getItem("snapfind_screenshots_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedScreenshots = parsed.map(normalizeScreenshotItem);
        return cachedScreenshots;
      }
    }
  } catch (err) {}

  cachedScreenshots = INITIAL_SAMPLE_SCREENSHOTS.map(normalizeScreenshotItem);
  return cachedScreenshots;
}

export function saveStoredScreenshots(items: ScreenshotItem[]): void {
  // Deduplicate items by ID and SHA-256 Hash to prevent duplicate storage
  const uniqueItemsMap = new Map<string, ScreenshotItem>();
  const seenHashes = new Set<string>();

  for (const item of items) {
    const normalized = normalizeScreenshotItem(item);
    const itemHash = normalized.sha256Hash || normalized.hash || normalized.fileHash;

    if (itemHash) {
      if (seenHashes.has(itemHash)) {
        // Skip duplicate hash record
        continue;
      }
      seenHashes.add(itemHash);
    }

    if (!uniqueItemsMap.has(normalized.id)) {
      uniqueItemsMap.set(normalized.id, normalized);
    }
  }

  const normalized = Array.from(uniqueItemsMap.values());
  cachedScreenshots = normalized;

  // Persist fast synchronous localStorage backup (lightweight metadata)
  try {
    const lightweight = normalized.slice(0, 100).map((s) => ({
      ...s,
      imageUrl: s.imageUrl?.startsWith("data:") && s.imageUrl.length > 50000 ? s.thumbnailUri || s.imageUrl : s.imageUrl,
    }));
    localStorage.setItem("snapfind_screenshots_v1", JSON.stringify(lightweight));
  } catch (e) {}

  const provider = StorageManager.getProvider();
  if (provider.saveAllScreenshots) {
    provider.saveAllScreenshots(normalized).catch((err) => {
      console.warn("StorageProvider saveAllScreenshots error:", err);
    });
  } else {
    normalized.forEach((sc) => provider.saveScreenshot(sc));
  }
  SyncEngine.scheduleSync(3000);
}

/**
 * Batch-save a subset of newly created/updated screenshot items efficiently
 */
export function saveStoredScreenshotsBatch(newOrUpdatedItems: ScreenshotItem[]): void {
  if (!newOrUpdatedItems || newOrUpdatedItems.length === 0) return;

  const current = loadStoredScreenshots();
  const currentMap = new Map<string, ScreenshotItem>();
  current.forEach((item) => currentMap.set(item.id, item));

  const itemsToPersist: ScreenshotItem[] = [];
  for (const item of newOrUpdatedItems) {
    const normalized = normalizeScreenshotItem(item);
    currentMap.set(normalized.id, normalized);
    itemsToPersist.push(normalized);
  }

  const updatedList = Array.from(currentMap.values());
  cachedScreenshots = updatedList;

  try {
    const lightweight = updatedList.slice(0, 100).map((s) => ({
      ...s,
      imageUrl: s.imageUrl?.startsWith("data:") && s.imageUrl.length > 50000 ? s.thumbnailUri || s.imageUrl : s.imageUrl,
    }));
    localStorage.setItem("snapfind_screenshots_v1", JSON.stringify(lightweight));
  } catch (e) {}

  const provider = StorageManager.getProvider();
  if (provider.saveScreenshotsBatch) {
    provider.saveScreenshotsBatch(itemsToPersist).catch((err) => {
      console.warn("StorageProvider saveScreenshotsBatch error:", err);
    });
  } else if (provider.saveAllScreenshots) {
    provider.saveAllScreenshots(updatedList).catch((err) => {
      console.warn("StorageProvider saveAllScreenshots fallback error:", err);
    });
  } else {
    itemsToPersist.forEach((sc) => provider.saveScreenshot(sc));
  }

  SyncEngine.scheduleSync(3000);
}

/**
 * Permanently delete a screenshot from persistent storage (IndexedDB / SQLite)
 */
export function deleteStoredScreenshot(id: string): void {
  const current = loadStoredScreenshots();
  const updated = current.filter((s) => s.id !== id);
  cachedScreenshots = updated;

  try {
    const lightweight = updated.slice(0, 100).map((s) => ({
      ...s,
      imageUrl: s.imageUrl?.startsWith("data:") && s.imageUrl.length > 50000 ? s.thumbnailUri || s.imageUrl : s.imageUrl,
    }));
    localStorage.setItem("snapfind_screenshots_v1", JSON.stringify(lightweight));
  } catch (e) {}

  const provider = StorageManager.getProvider();
  provider.deleteScreenshot(id).catch((err) => {
    console.warn("StorageProvider deleteScreenshot error:", err);
  });
}

/**
 * Permanently delete a batch of screenshots from persistent storage
 */
export function deleteStoredScreenshotsBatch(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = loadStoredScreenshots();
  const updated = current.filter((s) => !idSet.has(s.id));
  cachedScreenshots = updated;

  try {
    const lightweight = updated.slice(0, 100).map((s) => ({
      ...s,
      imageUrl: s.imageUrl?.startsWith("data:") && s.imageUrl.length > 50000 ? s.thumbnailUri || s.imageUrl : s.imageUrl,
    }));
    localStorage.setItem("snapfind_screenshots_v1", JSON.stringify(lightweight));
  } catch (e) {}

  const provider = StorageManager.getProvider();
  ids.forEach((id) => {
    provider.deleteScreenshot(id).catch((err) => {
      console.warn("StorageProvider deleteScreenshot batch item error:", err);
    });
  });
}

export function clearUserSessionData(): void {
  // Clear transient search session cache but preserve indexed screenshot cache
  cachedSearchHistory = [];
  try {
    localStorage.removeItem("snapfind_search_history_v1");
  } catch (e) {}
}

export function loadSearchHistory(): SearchHistoryItem[] {
  if (cachedSearchHistory) return cachedSearchHistory;
  try {
    const raw = localStorage.getItem("snapfind_search_history_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedSearchHistory = parsed;
        return parsed;
      }
    }
  } catch {}
  cachedSearchHistory = [];
  return [];
}

export function saveSearchHistory(history: SearchHistoryItem[]): void {
  cachedSearchHistory = history.slice(0, 30);
  const provider = StorageManager.getProvider();
  if (provider.saveSearchHistory) {
    provider.saveSearchHistory(cachedSearchHistory).catch((err) => {
      console.warn("StorageProvider saveSearchHistory error:", err);
    });
  }
}

export function loadSettings(): AppSettings {
  if (cachedSettings) return cachedSettings;
  try {
    const raw = localStorage.getItem("snapfind_settings_v1");
    if (raw) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return cachedSettings;
    }
  } catch {}
  cachedSettings = DEFAULT_SETTINGS;
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  cachedSettings = settings;
  const provider = StorageManager.getProvider();
  provider.saveSettings(settings).catch((err) => {
    console.warn("StorageProvider saveSettings error:", err);
  });
}

export function loadUserProfile(): UserProfile {
  if (cachedUserProfile) return cachedUserProfile;
  try {
    const raw = localStorage.getItem("snapfind_user_v1");
    if (raw) {
      cachedUserProfile = { ...DEFAULT_USER, ...JSON.parse(raw) };
      return cachedUserProfile;
    }
  } catch {}
  cachedUserProfile = DEFAULT_USER;
  return DEFAULT_USER;
}

export function saveUserProfile(user: UserProfile): void {
  cachedUserProfile = user;
  const provider = StorageManager.getProvider();
  if (provider.saveUserProfile) {
    provider.saveUserProfile(user).catch((err) => {
      console.warn("StorageProvider saveUserProfile error:", err);
    });
  }
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

const TOMBSTONE_KEY = "snapfind_tombstone_notifs_v1";
const CLEARED_ALL_KEY = "snapfind_notifs_cleared_at_v1";

export function getTombstonedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(String));
      }
    }
  } catch {}
  return new Set();
}

export function addTombstonedNotificationId(id: string): void {
  if (!id) return;
  try {
    const set = getTombstonedNotificationIds();
    set.add(id);
    const arr = Array.from(set).slice(-500); // keep last 500 tombstones
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("[Storage] Error saving tombstone ID:", e);
  }
}

export function addTombstonedNotificationIds(ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const set = getTombstonedNotificationIds();
    ids.forEach((id) => {
      if (id) set.add(id);
    });
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("[Storage] Error saving tombstone IDs:", e);
  }
}

export function getLastClearedAllTimestamp(): number {
  try {
    const raw = localStorage.getItem(CLEARED_ALL_KEY);
    if (raw) {
      const num = parseInt(raw, 10);
      if (!isNaN(num)) return num;
    }
  } catch {}
  return 0;
}

export function setLastClearedAllTimestamp(timestamp: number): void {
  try {
    localStorage.setItem(CLEARED_ALL_KEY, String(timestamp));
  } catch (e) {
    console.warn("[Storage] Error saving cleared timestamp:", e);
  }
}

export function loadNotifications(): AppNotification[] {
  if (cachedNotifications) return cachedNotifications;
  try {
    const raw = localStorage.getItem("snapfind_notifications_v1");
    const tombstones = getTombstonedNotificationIds();
    const clearedAt = getLastClearedAllTimestamp();

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy dummy/fake notifications, tombstoned items, and items created before clearedAt
        const seenIds = new Set<string>();
        const realNotifications: AppNotification[] = parsed
          .filter((n: any) => {
            const id = String(n?.id || "");
            if (!id || seenIds.has(id)) return false;
            // Filter out tombstones
            if (tombstones.has(id)) return false;
            // Filter out old hardcoded sample mock notifications
            if (
              id === "notif-idx-1" ||
              id === "notif-ocr-1" ||
              id === "notif-ai-1" ||
              id === "notif-sync-1" ||
              id === "notif-sys-1" ||
              id.startsWith("mock-")
            ) {
              return false;
            }

            const itemTime = new Date(n?.created_at || n?.timestamp || 0).getTime();
            if (clearedAt > 0 && !isNaN(itemTime) && itemTime <= clearedAt) {
              return false;
            }

            seenIds.add(id);
            return Boolean(n?.title && (n?.message || n?.description));
          })
          .map((n: any) => {
            const isRead = Boolean(n.read ?? n.isRead);
            const createdAt = n.created_at || n.timestamp || new Date().toISOString();
            const message = n.message || n.description || "";
            return {
              id: n.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              user_id: n.user_id || n.userId || "guest",
              userId: n.userId || n.user_id || "guest",
              type: n.type || "SYSTEM",
              title: n.title || "Notification",
              message,
              description: message,
              priority: n.priority || "medium",
              read: isRead,
              isRead,
              created_at: createdAt,
              timestamp: createdAt,
              screenshotId: n.screenshotId || n.metadata?.screenshotId,
              thumbnailUri: n.thumbnailUri || n.metadata?.thumbnailUri,
              category: n.category,
              metadata: n.metadata || {},
            };
          });

        cachedNotifications = realNotifications;
        return realNotifications;
      }
    }
  } catch {}
  cachedNotifications = [];
  return [];
}

export function saveNotifications(notifications: AppNotification[]): void {
  cachedNotifications = notifications.slice(0, 100);
  try {
    localStorage.setItem("snapfind_notifications_v1", JSON.stringify(cachedNotifications));
  } catch (err) {
    console.warn("Error saving notifications to localStorage:", err);
  }
}

