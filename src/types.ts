export type SyncStatus = "Synced" | "Pending" | "Uploading" | "Failed";

export type CategoryType =
  | "All"
  | "Favorites"
  | "Passport"
  | "Recipe"
  | "Electricity Bill"
  | "QR Code"
  | "Ticket & Travel"
  | "Receipt & Invoice"
  | "Chat & Message"
  | "Code & Dev"
  | "E-Commerce"
  | "Admission & Certificate"
  | "Financial"
  | "Notes & Ideas"
  | "Personal Photo"
  | "Vehicle"
  | "Website"
  | "Other";

export type ProcessingJobStatus =
  | "Queued"
  | "Preparing"
  | "Generating Thumbnail"
  | "OCR Processing"
  | "AI Analysis"
  | "Saving Metadata"
  | "Updating Search Index"
  | "Completed"
  | "CompletedWithLimitedMetadata"
  | "Failed";

export interface ScreenshotItem {
  id: string;
  user_id?: string;
  userId?: string;
  image_uri?: string;
  imageUrl: string;
  thumbnail_uri?: string;
  thumbnailUri?: string;
  ocr_text?: string;
  fullText: string;
  ai_description?: string;
  description?: string;
  summary: string;
  title: string;
  category: CategoryType;
  keyEntities: string[];
  keywords?: string[];
  tags: string[];
  objects?: string[];
  objectsDetected?: string[];
  textDensity?: "low" | "medium" | "high";
  keyMetrics?: string[];
  file_name?: string;
  fileName?: string;
  folder?: string;
  date_created?: string | number;
  createdAt: string;
  date_modified?: string | number;
  dateModified?: string | number;
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  file_size?: number;
  fileSizeKB: number;
  favorite?: boolean;
  isFavorite?: boolean;
  is_screenshot?: boolean;
  isScreenshot?: boolean;
  indexed_at?: string;
  indexedAt: string;
  last_scanned?: string | number;
  lastScanned?: string | number;
  processing_status?: ProcessingJobStatus;
  processingStatus?: ProcessingJobStatus;
  processing_timestamp?: string;
  processingTimestamp?: string;
  syncStatus?: SyncStatus;
  syncError?: string;
  lastSyncedAt?: string;
  ocrAccuracyScore?: number;
  content_hash?: string;
  contentHash?: string;
  sha256Hash?: string;
  sha256_hash?: string;
  hash?: string;
  fileHash?: string;
  privacy_level?: "normal" | "private" | "highly_sensitive";
  privacyLevel?: "normal" | "private" | "highly_sensitive";
  sensitive_categories?: string[];
  sensitiveCategories?: string[];
  is_sensitive?: boolean;
  isSensitive?: boolean;
  masked_ocr_text?: string;
  maskedOcrText?: string;
  privacy_reasons?: string[];
  privacyReasons?: string[];
  collectionName?: string;
  collection?: string;
  isDuplicate?: boolean;
  isAlreadyIndexed?: boolean;
  duplicateBadge?: string;
  duplicateReason?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
  deletedAt?: string;
  deleted_at?: string;
  userNotes?: string;
  notes?: string;
  source_app?: string;
  sourceApp?: string;
  source_app_confidence?: number;
  detected_urls?: string[];
  detectedUrls?: string[];
  urls?: string[];
  website_name?: string;
  websiteName?: string;
  website_domain?: string;
  websiteDomain?: string;
  website_url?: string;
  websiteUrl?: string;
  website?: {
    name?: string;
    domain?: string;
    url?: string;
    websiteUrl?: string;
    detectedUrls?: string[];
  };
  websites?: Array<{ name?: string; domain?: string; url?: string }>;
  has_qr_code?: boolean;
  hasQrCode?: boolean;
  qr_code_data?: string | null;
  qrCodeData?: string | null;
  qr_code_type?: "URL" | "TEXT" | "EMAIL" | "PHONE" | "WIFI" | "OTHER";
  qrCodeType?: "URL" | "TEXT" | "EMAIL" | "PHONE" | "WIFI" | "OTHER";
  qr_url?: string | null;
  qrUrl?: string | null;
  colors?: string[];
  scene?: string;
  visual_features?:
    | string[]
    | {
        visualType?: string;
        dominantColors?: string[];
        hasCode?: boolean;
        hasCharts?: boolean;
        isDiagram?: boolean;
      };
  image_type?: string;
  imageType?: string;
  detected_qr?: string;
  qr_code?:
    | string
    | {
        hasQrCode: boolean;
        data: string;
        type: "URL" | "TEXT" | "EMAIL" | "PHONE" | "WIFI" | "OTHER";
        url?: string;
      };
  detected_phone?: string;
  detected_email?: string;
  detected_date?: string;
  detected_price?: string;
  sensitive_reason?: string;
  sensitiveReason?: string;
  is_locked?: boolean;
  isLocked?: boolean;
  reminder_date?: string;
  reminderDate?: string;
  reminder_text?: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isAiGenerated?: boolean;
  createdAt: string;
  updatedAt?: string;
  itemCount?: number;
  color?: string;
  icon?: string;
}

export interface ProcessingJob {
  id: string;
  imageId: string;
  imageUri: string;
  fileName: string;
  folder?: string;
  sha256Hash?: string;
  hash?: string;
  status: ProcessingJobStatus;
  progressPercent: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  processingTimestamp?: string;
  thumbnailUri?: string;
  base64Data?: string;
  ocrText?: string;
  aiDescription?: string;
  description?: string;
  tags?: string[];
  keywords?: string[];
  keyEntities?: string[];
  category?: CategoryType;
  collectionName?: string;
  title?: string;
  objects?: string[];
  batchTotal?: number;
  batchCurrent?: number;
  batchProgressText?: string;
}

export interface SearchResultMatch {
  id: string;
  score: number;
  matchReason: string;
  highlightSnippet?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  categoryFilter?: CategoryType;
}

export type SubscriptionTier = "Free" | "Pro" | "Founder" | "Enterprise";
export type PlanType = "free" | "monthly" | "yearly" | "lifetime" | "founder" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "cancelled"
  | "canceled"
  | "expired"
  | "past_due"
  | "incomplete"
  | "grace_period"
  | "on_hold"
  | "paused";

export interface PlanFeatureLimits {
  maxIndexedScreenshots: number;
  maxAIScansPerMonth: number;
  maxStorageMB: number;
  cloudSync: boolean;
  advancedSearch: boolean;
  aiCollections: boolean;
  priorityProcessing: boolean;
}

export type FeatureKey = keyof PlanFeatureLimits;

export interface GooglePlayProduct {
  id?: string;
  productId?: string;
  type?: "subs" | "inapp";
  title?: string;
  name: string;
  description: string;
  formattedPrice?: string;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
  billingPeriod?: "P1M" | "P1Y" | "P1W" | "lifetime";
  freeTrialPeriod?: string;
  introductoryPrice?: string;
  badge?: string;
  planType?: string;
  price?: number;
  currency?: string;
  interval?: string;
  features?: string[];
  maxScreenshots?: number;
  isPopular?: boolean;
}

/**
 * Domain: Product
 * Catalog representation of purchasable items and subscriptions
 */
export type BillingProduct = GooglePlayProduct;
export type Product = GooglePlayProduct;

/**
 * Domain: Entitlement
 * User capability and quota permissions granted by the system
 */
export interface UserEntitlement {
  userId: string;
  tier: SubscriptionTier;
  plan: PlanType;
  isPro: boolean;
  isFounder: boolean;
  founderNumber?: number | null;
  founderRank?: number | null;
  founderGrantedAt?: string | null;
  founderExpiresAt?: string | null;
  features: PlanFeatureLimits;
  maxScreenshots: number; // Backwards-compatible convenience accessor
  canCloudSync: boolean;
  canAiMultimodalSearch: boolean;
  priorityProcessing: boolean;
  activeSubscriptionId?: string;
  productId?: string;
  expiresAt?: string;
  renewalAt?: string;
  startedAt?: string;
  autoRenewing?: boolean;
  status?: SubscriptionStatus;
  isLifetime?: boolean;
  updatedAt?: string;
}

/**
 * Domain: Subscription
 * Ongoing recurring billing contract maintained across provider and server
 */
export interface SubscriptionRecord {
  id: string;
  user_id?: string;
  userId: string;
  plan: PlanType | string;
  status: SubscriptionStatus;
  provider: "google_play" | "stripe" | "paddle" | "revenuecat" | "founder_grant" | "android_google_play" | "test" | "mock" | "web" | string;
  provider_customer_id?: string;
  providerCustomerId?: string;
  provider_subscription_id?: string;
  providerSubscriptionId?: string;
  price_id?: string;
  productId?: string;
  purchaseToken?: string;
  orderId?: string;
  currency?: string;
  priceCurrencyCode?: string;
  amount?: number;
  priceAmountMicros?: number;
  started_at?: string;
  currentPeriodStart?: string;
  renewal_at?: string;
  currentPeriodEnd?: string;
  expires_at?: string;
  expiryTime?: string;
  cancelled_at?: string;
  is_lifetime?: boolean;
  is_founder?: boolean;
  founder_rank?: number | null;
  cancelAtPeriodEnd?: boolean;
  platform?: "android_google_play" | "web_stripe" | "web" | "test" | "mock";
  autoRenewing?: boolean;
  isSandbox?: boolean;
  created_at?: string;
  createdAt: string;
  updated_at?: string;
  updatedAt: string;
}

export type Subscription = SubscriptionRecord;

/**
 * Domain: Payment
 * An individual financial transaction or order receipt
 */
export interface PaymentTransaction {
  id: string;
  userId: string;
  subscriptionId?: string;
  provider: "google_play" | "stripe" | "web" | "mock" | "test";
  providerOrderId?: string;
  purchaseToken?: string;
  productId: string;
  amountMicros: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "canceled";
  isSandbox: boolean;
  platform: "android" | "web" | "ios" | "mock";
  createdAt: string;
  updatedAt: string;
}

export type Payment = PaymentTransaction;

/**
 * Domain: Payment Event
 * Immutable audit logs and lifecycle webhook records
 */
export interface SubscriptionEvent {
  id: string;
  userId: string;
  provider: string;
  eventType:
    | "subscription_created"
    | "subscription_renewed"
    | "subscription_canceled"
    | "subscription_expired"
    | "subscription_paused"
    | "payment_succeeded"
    | "payment_failed"
    | "entitlement_granted"
    | "entitlement_revoked";
  providerEventId?: string;
  payload?: Record<string, any>;
  isSandbox?: boolean;
  createdAt: string;
}

export type PaymentEvent = SubscriptionEvent;

/**
 * Domain: Manual Payment Request
 * For Pakistan local payment methods: Easypaisa & Bank Transfer
 */
export type ManualPaymentMethod = "easypaisa" | "bank_transfer";
export type PaymentRequestStatus = "pending" | "approved" | "rejected";

export interface PaymentRequest {
  id: string;
  user_id: string;
  userId?: string;
  user_email?: string;
  userEmail?: string;
  user_name?: string;
  userName?: string;
  plan: string; // 'lifetime'
  amount: number; // 7999
  currency: string; // 'PKR'
  payment_method: ManualPaymentMethod;
  paymentMethod?: ManualPaymentMethod;
  transaction_id: string;
  transactionId?: string;
  receipt_url?: string | null;
  receiptUrl?: string | null;
  sender_account?: string | null;
  senderAccount?: string | null;
  sender_name?: string | null;
  senderName?: string | null;
  notes?: string | null;
  status: PaymentRequestStatus;
  submitted_at: string;
  submittedAt?: string;
  verified_at?: string | null;
  verifiedAt?: string | null;
  verified_by?: string | null;
  verifiedBy?: string | null;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface PaymentAccountDetails {
  id: ManualPaymentMethod;
  title: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  iban?: string;
  branchCode?: string;
  branchName?: string;
  instructions: string[];
  badge: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
  plan: SubscriptionTier;
  storageLimitMB: number;
  createdAt?: string;
  emailConfirmedAt?: string;
  provider?: string;
  role?: string;
  entitlement?: UserEntitlement;
}

export interface AppSettings {
  // Appearance
  theme: "dark" | "light" | "system";
  accentColor?: "blue" | "indigo" | "purple" | "emerald" | "amber";
  compactGridView: boolean;
  reducedMotion?: boolean;
  fontScale?: "normal" | "large" | "compact";

  // General
  language?: string;
  autoLaunchAtStartup?: boolean;
  confirmBeforeDelete?: boolean;
  defaultView?: string;

  // Notifications
  enableNotifications: boolean; // Master toggle for important notifications
  notifyOnSecurityAlerts?: boolean; // Critical security alerts (Always ON / locked)
  notifyOnSubscription?: boolean; // Subscription & Billing events
  notifyOnIndexing?: boolean; // Screenshot Indexing completions
  notifyOnStorageWarnings?: boolean; // Approaching quota limits (90%+)
  notifyOnMarketing?: boolean; // Marketing & product updates (Default OFF)
  notifyOnOcrComplete?: boolean; // Deprecated legacy compatibility
  notifyOnAiFinished?: boolean; // Deprecated legacy compatibility
  notifyOnSyncComplete?: boolean; // Deprecated legacy compatibility
  notifyOnErrors?: boolean; // Deprecated legacy compatibility
  soundEnabled?: boolean;

  // Storage
  syncEnabled?: boolean;
  uploadImagesToCloud?: boolean;
  maxStorageLimitMB?: number;
  autoCleanTrashDays?: number;
  offlineCacheEnabled?: boolean;

  // Indexing
  autoIndexNewScreenshots: boolean;
  ocrAccuracy: "fast" | "accurate";
  detectLanguages?: string[];
  ocrEngine?: "tesseract" | "gemini-vision" | "hybrid";
  autoTagging?: boolean;
  generateThumbnails?: boolean;

  // AI
  aiModel?: "gemini-3.6-flash" | "gemini-3.7-flash" | "gemini-3.5-pro";
  aiSummaryLength?: "brief" | "detailed" | "bullets";
  extractKeyEntities?: boolean;
  enableSemanticSearch?: boolean;
  aiCreativityLevel?: "deterministic" | "balanced" | "creative";

  // Privacy & Security
  telemetryEnabled?: boolean;
  anonymizeOcrData?: boolean;
  encryptLocalCache?: boolean;
  biometricLock?: boolean;
  autoLockMinutes?: number;

  // Account & Founder
  planTier?: "Free" | "Pro" | "Enterprise";
  founder_banner_enabled?: boolean;
  founderBannerEnabled?: boolean;
}

export type NotificationCategory =
  | "IMPORTANT"
  | "SECURITY"
  | "INDEXING"
  | "ACCOUNT"
  | "SUBSCRIPTION"
  | "SYSTEM"
  | "SYNC";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

// Backward compatibility alias
export type NotificationType =
  | NotificationCategory
  | "screenshot_indexed"
  | "ocr_completed"
  | "ai_finished"
  | "sync_completed"
  | "error"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  userId?: string;
  type: NotificationCategory | NotificationType;
  title: string;
  message: string;
  description?: string;
  priority: NotificationPriority;
  read: boolean;
  isRead?: boolean;
  created_at: string;
  timestamp?: string;
  screenshotId?: string;
  thumbnailUri?: string;
  category?: CategoryType;
  metadata?: {
    screenshotId?: string;
    thumbnailUri?: string;
    wordsCount?: number;
    accuracy?: number;
    tags?: string[];
    syncCount?: number;
    durationMs?: number;
    errorCode?: string;
    model?: string;
    failedCount?: number;
    successCount?: number;
    plan?: string;
    eventType?: string;
    ipAddress?: string;
    actionUrl?: string;
    actionLabel?: string;
    [key: string]: any;
  };
}

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  description?: string;
  timestamp: number;
}

export type FeedbackType =
  | "Bug Report"
  | "Bug"
  | "Feature Request"
  | "Search Quality"
  | "Search"
  | "AI Accuracy"
  | "AI"
  | "UI/UX Feedback"
  | "UI/UX"
  | "Game"
  | "Game Feedback"
  | "Performance"
  | "Other";

export type FeedbackStatus = "pending" | "reviewed" | "in_progress" | "resolved";

export interface FeedbackItem {
  id: string;
  user_id: string;
  user_email?: string;
  type: FeedbackType;
  title: string;
  description: string;
  rating: number; // 1 to 5
  nps_score?: number | null; // 0 to 10
  page?: string;
  screenshot_url?: string | null;
  app_version: string;
  platform: string;
  created_at: string;
  status: FeedbackStatus;
  user_plan?: string;
  is_founder?: boolean;
}

export interface FeedbackSubmitPayload {
  type: FeedbackType;
  title?: string;
  message?: string;
  description: string;
  rating?: number;
  nps_score?: number | null;
  page?: string;
  screenshot_url?: string | null;
  user_email?: string;
}

/**
 * Domain: Navigation Views
 */
export type NavViewType =
  | "landing"
  | "dashboard"
  | "collections"
  | "timeline"
  | "favorites"
  | "trash"
  | "gallery"
  | "search"
  | "import"
  | "history"
  | "settings"
  | "pricing"
  | "founders"
  | "account"
  | "notifications"
  | "feedback"
  | "admin-payments"
  | "game";

/**
 * Domain: SnapDash Mini-Game Types
 */
export type SnapDashGameState = "READY" | "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "GAME_OVER";

export interface GameProfile {
  id: string;
  user_id: string;
  game_username: string;
  high_score: number;
  total_games_played: number;
  created_at: string;
  updated_at: string;
}

export interface GameScoreRecord {
  id: string;
  user_id: string;
  game_username: string;
  score: number;
  duration_seconds: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  gameUsername: string;
  score: number;
  durationSeconds?: number;
  createdAt: string;
  isCurrentUser: boolean;
  tier?: string;
  isFounder?: boolean;
}

export interface UserGameStats {
  gameUsername: string;
  personalBest: number;
  currentRank: number | null;
  totalGamesPlayed: number;
  lastPlayedAt?: string;
}
