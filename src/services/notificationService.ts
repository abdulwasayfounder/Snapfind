import {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  ScreenshotItem,
} from "../types";
import {
  loadNotifications,
  saveNotifications,
  loadSettings,
  getTombstonedNotificationIds,
  addTombstonedNotificationId,
  addTombstonedNotificationIds,
  getLastClearedAllTimestamp,
  setLastClearedAllTimestamp,
} from "./storage";

export type NotificationListener = (notifications: AppNotification[]) => void;

export interface NotifyOptions {
  id?: string;
  userId?: string;
  priority?: NotificationPriority;
  screenshotId?: string;
  thumbnailUri?: string;
  metadata?: Record<string, any>;
  playSound?: boolean;
  bypassMasterToggle?: boolean;
}

export interface EmailAuditLog {
  id: string;
  recipient: string;
  eventType: string;
  subject: string;
  body: string;
  sentAt: string;
}

/**
 * SnapFind AI Centralized Notification Manager & Service
 *
 * Core Principle:
 * "Notify the user only when the information is genuinely important or requires attention."
 *
 * Rules:
 * 1. ZERO notifications for routine background tasks:
 *    - No OCR step completions
 *    - No individual queue item processed
 *    - No AI analysis intermediate steps
 *    - No indexing percentage updates (10%, 20%, 50%, 90%)
 *    - No search activity or loading states
 *    - No normal background sync completions
 *    - No database or cache writes
 *
 * 2. IMPORTANT NOTIFICATIONS ONLY:
 *    - Screenshot(s) indexed (debounced & grouped into ONE single notification)
 *    - New login detected (with device/platform & timestamp, zero sensitive creds)
 *    - Password changed
 *    - Account security events (suspicious login, email changed, recovery)
 *    - Subscription events (started, payment failed, renewal warning, canceled, expired)
 *    - Storage warnings (approaching limit >= 90%)
 *    - Critical system alerts (sync action required, permanent data failure)
 *
 * 3. PRIORITY SYSTEM:
 *    - CRITICAL: Security alerts, password changes, suspicious logins, payment failures, account recovery
 *    - HIGH: Subscription ending/renewal warning, storage >= 90%, sync action required
 *    - NORMAL: New screenshot(s) indexed (debounced/grouped)
 *    - LOW: Suppressed from user notifications (logged internally for debug only)
 */
class NotificationServiceEngine {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private recentFingerprints: Map<string, number> = new Map();
  private recentNotifiedScreenshotIds: Set<string> = new Set();
  private emailAuditLogs: EmailAuditLog[] = [];
  private isInitialized: boolean = false;

  // Grouping & Debouncing Buffer for Screenshot Indexing
  private pendingIndexedCount: number = 0;
  private pendingIndexedScreenshots: Array<{ id: string; title?: string; thumbnailUri?: string }> = [];
  private indexDebounceTimer: any = null;
  private lastStorageWarningPercent: number = 0;
  private lastStorageWarningTime: number = 0;
  private lastRenewalWarningDay: number = 0;

  constructor() {
    this.initializeFromStorage();
  }

  private initializeFromStorage(): void {
    try {
      const loaded = loadNotifications();
      this.notifications = Array.isArray(loaded) ? loaded : [];
    } catch {
      this.notifications = [];
    }
    this.isInitialized = true;
  }

  public getNotifications(): AppNotification[] {
    if (!this.isInitialized) {
      this.initializeFromStorage();
    }
    return [...(this.notifications || [])];
  }

  public getUnreadCount(): number {
    return this.getNotifications().filter((n) => !n.read && !n.isRead).length;
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener(this.getNotifications());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const list = [...(this.notifications || [])];
    saveNotifications(list);
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (err) {
        console.warn("[NotificationManager] Listener error:", err);
      }
    });
  }

  /**
   * Central Core Dispatcher:
   * Handles priority classification, deduplication, user settings filtering, and audio chimes
   */
  public pushNotification(
    category: NotificationCategory,
    title: string,
    message: string,
    options: NotifyOptions = {}
  ): AppNotification | null {
    const priority: NotificationPriority = options.priority || "medium";

    // 1. Suppress LOW priority events entirely from user notification stream
    if (priority === "low") {
      console.log(`[NotificationManager:InternalLog] [${category}] ${title}: ${message}`);
      return null;
    }

    const settings = loadSettings();
    const isCritical = priority === "critical";

    // 2. Settings Permission Check
    // Critical security & urgent recovery notifications bypass the master toggle
    if (!settings.enableNotifications && !isCritical && !options.bypassMasterToggle) {
      return null;
    }

    // Category-specific settings filter
    if (!isCritical) {
      if (category === "INDEXING") {
        if (settings.notifyOnIndexing === false) return null;
      } else if (category === "SUBSCRIPTION") {
        if (settings.notifyOnSubscription === false) return null;
      } else if (category === "IMPORTANT" && options.metadata?.isStorageWarning) {
        if (settings.notifyOnStorageWarnings === false) return null;
      }
    }

    // 3. Deduplication & Anti-Spam (Suppress duplicate events within 10 seconds)
    const fingerprint = `${category}:${title}:${message}`;
    const now = Date.now();
    const lastEmitted = this.recentFingerprints.get(fingerprint);
    if (lastEmitted && now - lastEmitted < 10000) {
      console.log(`[NotificationManager] Suppressed duplicate notification within 10s: ${title}`);
      return null;
    }
    this.recentFingerprints.set(fingerprint, now);

    const createdAt = new Date().toISOString();
    const id = options.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Check if notification is tombstoned (previously deleted by user)
    const tombstones = getTombstonedNotificationIds();
    if (tombstones.has(id)) {
      console.log(`[NotificationManager] Suppressed tombstoned/deleted notification: ${id}`);
      return null;
    }

    // Check if created prior to last "Delete All" action
    const clearedAt = getLastClearedAllTimestamp();
    const itemTime = new Date(createdAt).getTime();
    if (clearedAt > 0 && !isNaN(itemTime) && itemTime <= clearedAt) {
      console.log(`[NotificationManager] Suppressed notification created before last clearAll: ${id}`);
      return null;
    }

    // Do not push duplicate if ID already present in memory stream
    if (this.notifications.some((n) => n.id === id)) {
      return null;
    }

    const notification: AppNotification = {
      id,
      user_id: options.userId || "guest",
      userId: options.userId || "guest",
      type: category,
      title,
      message,
      description: message,
      priority,
      read: false,
      isRead: false,
      created_at: createdAt,
      timestamp: createdAt,
      screenshotId: options.screenshotId,
      thumbnailUri: options.thumbnailUri,
      metadata: options.metadata || {},
    };

    // Prepend to notifications stream (keep latest 100)
    this.notifications = [notification, ...this.notifications.slice(0, 99)];
    this.notifyListeners();

    // Play subtle audio cue if enabled
    if (settings.soundEnabled && options.playSound !== false) {
      this.playNotificationSound(priority);
    }

    return notification;
  }

  // ==========================================
  // 1. SCREENSHOT INDEXING (Grouped & Debounced)
  // ==========================================

  /**
   * Notify completion of a single screenshot.
   * Debounced so rapid multiple screenshots are automatically grouped into ONE notification!
   */
  public notifyScreenshotIndexed(screenshot: ScreenshotItem): void {
    if (!screenshot || !screenshot.id) return;
    
    // Strict uniqueness check
    if (this.pendingIndexedScreenshots.some((item) => item.id === screenshot.id)) {
      return;
    }
    if (this.recentNotifiedScreenshotIds.has(screenshot.id)) {
      return;
    }
    this.recentNotifiedScreenshotIds.add(screenshot.id);
    if (this.recentNotifiedScreenshotIds.size > 300) {
      const first = this.recentNotifiedScreenshotIds.values().next().value;
      if (first) this.recentNotifiedScreenshotIds.delete(first);
    }

    this.pendingIndexedScreenshots.push({
      id: screenshot.id,
      title: screenshot.title || screenshot.fileName,
      thumbnailUri: screenshot.thumbnailUri || screenshot.imageUrl,
    });
    this.pendingIndexedCount = this.pendingIndexedScreenshots.length;
    this.scheduleIndexingGroupFlush();
  }

  /**
   * Notify completion of a batch of screenshots.
   * Automatically groups into ONE single notification.
   */
  public notifyBatchIndexed(count: number, _durationMs?: number): void {
    if (count <= 0) return;
    if (this.pendingIndexedScreenshots.length === 0) {
      this.pendingIndexedCount = count;
    } else {
      this.pendingIndexedCount = Math.max(this.pendingIndexedCount, this.pendingIndexedScreenshots.length);
    }
    this.scheduleIndexingGroupFlush();
  }

  /**
   * Notify multiple screenshots at once.
   */
  public notifyScreenshotsIndexed(screenshots: ScreenshotItem[]): void {
    if (!screenshots || screenshots.length === 0) return;
    screenshots.forEach((s) => {
      if (!s || !s.id) return;
      if (!this.pendingIndexedScreenshots.some((item) => item.id === s.id) && !this.recentNotifiedScreenshotIds.has(s.id)) {
        this.recentNotifiedScreenshotIds.add(s.id);
        this.pendingIndexedScreenshots.push({
          id: s.id,
          title: s.title || s.fileName,
          thumbnailUri: s.thumbnailUri || s.imageUrl,
        });
      }
    });
    this.pendingIndexedCount = this.pendingIndexedScreenshots.length;
    this.scheduleIndexingGroupFlush();
  }

  /**
   * Debounces indexing notifications across a 1200ms window.
   * Emits exactly ONE notification:
   * - If count == 1: "📸 Screenshot indexed" / "Your screenshot is now searchable."
   * - If count > 1: "📸 X screenshots indexed" / "Your new screenshots are ready to search."
   */
  private scheduleIndexingGroupFlush(): void {
    if (this.indexDebounceTimer) {
      clearTimeout(this.indexDebounceTimer);
    }

    this.indexDebounceTimer = setTimeout(() => {
      this.flushIndexingGroup();
    }, 1200);
  }

  public flushIndexingGroup(): void {
    if (this.indexDebounceTimer) {
      clearTimeout(this.indexDebounceTimer);
      this.indexDebounceTimer = null;
    }

    const total = this.pendingIndexedScreenshots.length > 0 ? this.pendingIndexedScreenshots.length : this.pendingIndexedCount;
    if (total <= 0) return;

    const singleItem = this.pendingIndexedScreenshots[0];
    this.pendingIndexedCount = 0;
    this.pendingIndexedScreenshots = [];

    if (total === 1) {
      this.pushNotification(
        "INDEXING",
        "📸 Screenshot indexed",
        "Your screenshot is now searchable.",
        {
          id: singleItem?.id ? `notif_sc_${singleItem.id}` : undefined,
          priority: "medium", // NORMAL
          screenshotId: singleItem?.id,
          thumbnailUri: singleItem?.thumbnailUri,
          metadata: {
            count: 1,
            title: singleItem?.title,
            eventType: "screenshot_indexed",
          },
        }
      );
    } else {
      this.pushNotification(
        "INDEXING",
        `📸 ${total} screenshots indexed`,
        "Your new screenshots are ready to search.",
        {
          id: `batch_indexed_${Date.now()}_${total}`,
          priority: "medium", // NORMAL
          screenshotId: singleItem?.id,
          thumbnailUri: singleItem?.thumbnailUri,
          metadata: {
            count: total,
            eventType: "batch_indexed",
          },
        }
      );
    }
  }

  // ==========================================
  // 2. NEW LOGIN (Security Event)
  // ==========================================

  public notifyNewLogin(options: {
    email?: string;
    device?: string;
    platform?: string;
    ip?: string;
    time?: string;
  } = {}): AppNotification | null {
    const platform = options.platform || (navigator.userAgent.includes("Android") ? "Android Device" : "Web Browser");
    const deviceStr = options.device || platform;
    const timeStr = options.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const notification = this.pushNotification(
      "SECURITY",
      "🔐 New login detected",
      `Your SnapFind account was accessed from a new device (${deviceStr}) at ${timeStr}.`,
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: {
          device: deviceStr,
          platform: options.platform || "Web",
          ip: options.ip || "Unknown IP",
          time: timeStr,
          email: options.email,
          eventType: "new_login",
        },
      }
    );

    if (options.email) {
      this.sendEmailNotification({
        recipient: options.email,
        eventType: "new_login",
        subject: "Security Alert: New login to your SnapFind account",
        body: `A new login to your SnapFind account was detected from ${deviceStr} (${platform}) at ${timeStr}. If this wasn't you, please change your password immediately.`,
      });
    }

    return notification;
  }

  // Compatibility alias for existing auth code
  public notifyLogin(email?: string, provider: string = "Email"): AppNotification | null {
    return this.notifyNewLogin({
      email,
      platform: provider,
    });
  }

  // ==========================================
  // 3. PASSWORD CHANGED (Security Event)
  // ==========================================

  public notifyPasswordChanged(userEmail?: string): AppNotification | null {
    const notification = this.pushNotification(
      "SECURITY",
      "🔑 Password changed",
      "Your SnapFind password was successfully changed.",
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { eventType: "password_changed" },
      }
    );

    if (userEmail) {
      this.sendEmailNotification({
        recipient: userEmail,
        eventType: "password_changed",
        subject: "Security Alert: Your SnapFind password was changed",
        body: "Your SnapFind account password was successfully updated. If you did not make this change, please contact support or reset your password immediately.",
      });
    }

    return notification;
  }

  // ==========================================
  // 4. ACCOUNT SECURITY EVENTS
  // ==========================================

  public notifyEmailChanged(newEmail: string, oldEmail?: string): AppNotification | null {
    const notification = this.pushNotification(
      "SECURITY",
      "✉️ Account email changed",
      `Your SnapFind account email was updated to ${newEmail}.`,
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { newEmail, oldEmail, eventType: "email_changed" },
      }
    );

    if (oldEmail) {
      this.sendEmailNotification({
        recipient: oldEmail,
        eventType: "email_changed",
        subject: "Security Alert: SnapFind account email changed",
        body: `Your SnapFind account email address was changed to ${newEmail}. If this was not requested by you, please secure your account immediately.`,
      });
    }

    return notification;
  }

  public notifyAccountRecovery(email: string): AppNotification | null {
    const notification = this.pushNotification(
      "SECURITY",
      "🔄 Account recovery initiated",
      `A password recovery link has been sent to ${email}.`,
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { email, eventType: "account_recovery" },
      }
    );

    this.sendEmailNotification({
      recipient: email,
      eventType: "account_recovery",
      subject: "SnapFind Account Recovery Request",
      body: "We received a request to reset your password. Use the link sent to your email to complete password recovery.",
    });

    return notification;
  }

  public notifySuspiciousLogin(ip?: string, location?: string, email?: string): AppNotification | null {
    const locationStr = location ? ` near ${location}` : "";
    const ipStr = ip ? ` (IP: ${ip})` : "";
    const notification = this.pushNotification(
      "SECURITY",
      "🚨 Suspicious login attempt detected",
      `An unrecognized login attempt was blocked${locationStr}${ipStr}.`,
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { ip, location, eventType: "suspicious_login" },
      }
    );

    if (email) {
      this.sendEmailNotification({
        recipient: email,
        eventType: "suspicious_login",
        subject: "CRITICAL: Suspicious login attempt blocked",
        body: `A suspicious sign-in attempt was detected${locationStr}${ipStr}. If you did not initiate this, your account may be at risk.`,
      });
    }

    return notification;
  }

  public notifyAuthThresholdExceeded(email?: string): AppNotification | null {
    return this.pushNotification(
      "SECURITY",
      "⚠️ Multiple failed login attempts",
      "Too many consecutive incorrect password attempts. Additional verification required.",
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { email, eventType: "auth_lockout_warning" },
      }
    );
  }

  public notifySecuritySettingsChanged(settingName: string = "Security preferences"): AppNotification | null {
    return this.pushNotification(
      "SECURITY",
      "🛡️ Account security settings updated",
      `${settingName} were modified on your account.`,
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { settingName, eventType: "security_settings_updated" },
      }
    );
  }

  // ==========================================
  // 5. SUBSCRIPTION & BILLING EVENTS
  // ==========================================

  public notifySubscriptionStarted(planName: string = "Pro", isFounder: boolean = false, userEmail?: string): AppNotification | null {
    const title = isFounder ? "🎉 Founder Status Activated!" : "🎉 Pro subscription activated";
    const msg = isFounder
      ? "Welcome Early Adopter! You have lifetime access to 10,000 screenshots, instant OCR, and all future AI features."
      : `Your SnapFind ${planName} plan is now active. 10,000 screenshot capacity and neural search unlocked.`;

    const notification = this.pushNotification("SUBSCRIPTION", title, msg, {
      priority: "high",
      metadata: { planName, isFounder, eventType: "subscription_started" },
    });

    if (userEmail) {
      this.sendEmailNotification({
        recipient: userEmail,
        eventType: "subscription_started",
        subject: `Your SnapFind ${planName} Plan is Active!`,
        body: `Thank you for subscribing to SnapFind ${planName}. Your account now enjoys expanded storage and AI intelligence.`,
      });
    }

    return notification;
  }

  // Compatibility alias
  public notifyProActivated(planCycle?: string, isFounder?: boolean): AppNotification | null {
    return this.notifySubscriptionStarted(planCycle ? `Pro (${planCycle})` : "Pro", isFounder);
  }

  /**
   * Exactly ONE notification created when manual payment confirmation is submitted
   */
  public notifyManualPaymentSubmitted(options: {
    requestId?: string;
    transactionId?: string;
    amount?: string;
    userId?: string;
    userEmail?: string;
    paymentMethod?: string;
  } = {}): AppNotification | null {
    const tx = options.transactionId ? ` (TID: ${options.transactionId})` : "";
    const canonicalId = options.requestId
      ? `notif_pay_sub_${options.requestId}`
      : options.transactionId
      ? `notif_pay_sub_${options.transactionId}`
      : undefined;

    const notification = this.pushNotification(
      "SUBSCRIPTION",
      "📝 Payment Submitted",
      `Your manual payment confirmation${tx} has been submitted and is pending verification. Lifetime Pro will activate once verified.`,
      {
        id: canonicalId,
        userId: options.userId,
        priority: "high",
        metadata: {
          eventType: "manual_payment_submitted",
          requestId: options.requestId,
          transactionId: options.transactionId,
          amount: options.amount || "PKR 7,999",
          paymentMethod: options.paymentMethod,
        },
      }
    );

    if (options.userEmail) {
      this.sendEmailNotification({
        recipient: options.userEmail,
        eventType: "manual_payment_submitted",
        subject: "SnapFind Payment Confirmation Received",
        body: `We have received your payment confirmation${tx}. Our team will review your transaction and activate Lifetime Pro shortly.`,
      });
    }

    return notification;
  }

  /**
   * Exactly ONE notification created when manual payment is verified and Lifetime Pro is activated
   */
  public notifyManualPaymentApproved(options: {
    requestId?: string;
    transactionId?: string;
    userEmail?: string;
    amount?: string;
    userId?: string;
  } = {}): AppNotification | null {
    const tx = options.transactionId ? ` (TID: ${options.transactionId})` : "";
    const canonicalId = options.requestId
      ? `notif_pay_appr_${options.requestId}`
      : options.transactionId
      ? `notif_pay_appr_${options.transactionId}`
      : undefined;

    const notification = this.pushNotification(
      "SUBSCRIPTION",
      "💎 Lifetime Pro Activated!",
      `Your manual payment${tx} has been verified. You now have permanent Lifetime Pro access with unlimited screenshots.`,
      {
        id: canonicalId,
        userId: options.userId,
        priority: "critical",
        bypassMasterToggle: true,
        metadata: {
          eventType: "manual_payment_approved",
          requestId: options.requestId,
          transactionId: options.transactionId,
          amount: options.amount || "PKR 7,999",
          plan: "lifetime",
        },
      }
    );

    if (options.userEmail) {
      this.sendEmailNotification({
        recipient: options.userEmail,
        eventType: "manual_payment_approved",
        subject: "Your SnapFind Lifetime Pro Access is Activated! 💎",
        body: `Your payment confirmation${tx} has been verified by the SnapFind administration. Your account is now upgraded to permanent Lifetime Pro with unlimited screenshots, deep AI OCR, and cloud sync.`,
      });
    }

    return notification;
  }

  /**
   * Exactly ONE notification created when manual payment request is rejected
   */
  public notifyManualPaymentRejected(options: {
    requestId?: string;
    transactionId?: string;
    reason?: string;
    userEmail?: string;
    userId?: string;
  } = {}): AppNotification | null {
    const tx = options.transactionId ? ` (TID: ${options.transactionId})` : "";
    const reasonText = options.reason ? `: ${options.reason}` : ".";
    const canonicalId = options.requestId
      ? `notif_pay_rej_${options.requestId}`
      : options.transactionId
      ? `notif_pay_rej_${options.transactionId}`
      : undefined;

    const notification = this.pushNotification(
      "SUBSCRIPTION",
      "⚠️ Payment Verification Notice",
      `Your payment confirmation${tx} could not be verified${reasonText} You can review and re-submit in your Account settings.`,
      {
        id: canonicalId,
        userId: options.userId,
        priority: "high",
        metadata: {
          eventType: "manual_payment_rejected",
          requestId: options.requestId,
          transactionId: options.transactionId,
          reason: options.reason,
        },
      }
    );

    if (options.userEmail) {
      this.sendEmailNotification({
        recipient: options.userEmail,
        eventType: "manual_payment_rejected",
        subject: "Update Regarding Your SnapFind Payment Confirmation",
        body: `We were unable to verify your payment${tx}. Reason: ${options.reason || "Transaction details could not be matched with banking records"}. Your account plan has remained unchanged. You can submit updated payment details in your Account settings.`,
      });
    }

    return notification;
  }

  public notifyPaymentSuccess(amount?: string, invoiceId?: string): AppNotification | null {
    return this.pushNotification(
      "SUBSCRIPTION",
      "💳 Payment successful",
      amount ? `Your payment of ${amount} was processed successfully.` : "Your recurring subscription payment was processed successfully.",
      {
        priority: "medium",
        metadata: { amount, invoiceId, eventType: "payment_success" },
      }
    );
  }

  public notifyPaymentFailed(reason?: string, userEmail?: string): AppNotification | null {
    const notification = this.pushNotification(
      "SUBSCRIPTION",
      "❌ Payment failed",
      reason || "Unable to process payment for your subscription. Please update your payment method to keep Pro features.",
      {
        priority: "critical",
        bypassMasterToggle: true,
        metadata: { reason, eventType: "payment_failed", actionUrl: "/settings?tab=account" },
      }
    );

    if (userEmail) {
      this.sendEmailNotification({
        recipient: userEmail,
        eventType: "payment_failed",
        subject: "Urgent: Payment failed for your SnapFind subscription",
        body: "We were unable to process your recent renewal payment. Please update your billing details to prevent service interruption.",
      });
    }

    return notification;
  }

  public notifySubscriptionRenewal(daysRemaining: number, renewDate?: string): AppNotification | null {
    // Deduplicate: Don't send multiple renewal warnings on the same day
    const nowDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    if (this.lastRenewalWarningDay === nowDay) {
      return null;
    }
    this.lastRenewalWarningDay = nowDay;

    return this.pushNotification(
      "SUBSCRIPTION",
      "⏰ Subscription renewal approaching",
      `Your SnapFind Pro subscription will renew in ${daysRemaining} days${renewDate ? ` on ${renewDate}` : ""}.`,
      {
        priority: "high",
        metadata: { daysRemaining, renewDate, eventType: "renewal_approaching" },
      }
    );
  }

  public notifySubscriptionCanceled(effectiveDate?: string, userEmail?: string): AppNotification | null {
    const notification = this.pushNotification(
      "SUBSCRIPTION",
      "⚠️ Subscription auto-renewal canceled",
      `Your recurring subscription was canceled. You will maintain full Pro access until ${effectiveDate || "the end of your current billing period"}.`,
      {
        priority: "high",
        metadata: { effectiveDate, eventType: "subscription_canceled" },
      }
    );

    if (userEmail) {
      this.sendEmailNotification({
        recipient: userEmail,
        eventType: "subscription_canceled",
        subject: "SnapFind Pro Subscription Cancellation Confirmed",
        body: `Your auto-renewal has been canceled. You retain full access until ${effectiveDate || "the end of the cycle"}.`,
      });
    }

    return notification;
  }

  public notifySubscriptionExpired(userEmail?: string): AppNotification | null {
    const notification = this.pushNotification(
      "SUBSCRIPTION",
      "Subscription expired",
      "Your SnapFind Pro subscription has expired. Re-subscribe anytime to unlock 10,000 screenshots and cloud sync.",
      {
        priority: "high",
        metadata: { eventType: "subscription_expired" },
      }
    );

    if (userEmail) {
      this.sendEmailNotification({
        recipient: userEmail,
        eventType: "subscription_expired",
        subject: "Your SnapFind Pro subscription has expired",
        body: "Your Pro subscription has ended. Your existing screenshots remain safe. Upgrade anytime to re-enable Pro limits.",
      });
    }

    return notification;
  }

  public notifyPlanChanged(oldPlan: string, newPlan: string): AppNotification | null {
    return this.pushNotification(
      "SUBSCRIPTION",
      "Plan updated",
      `Your plan has been changed from ${oldPlan} to ${newPlan}.`,
      {
        priority: "high",
        metadata: { oldPlan, newPlan, eventType: "plan_changed" },
      }
    );
  }

  // ==========================================
  // 6. STORAGE / ACCOUNT LIMIT WARNINGS
  // ==========================================

  /**
   * Only notify when user is approaching an important limit (>= 90% or 100% full).
   * Deduplicated so it does NOT fire repeatedly for normal storage usage.
   */
  public notifyStorageWarning(usedPercent: number, usedCount: number, maxCount: number): AppNotification | null {
    // Only notify if >= 90%
    if (usedPercent < 90) {
      return null;
    }

    const now = Date.now();
    // Throttle repeated warnings unless percent changed significantly (+5%) or 12 hours passed
    if (
      Math.abs(usedPercent - this.lastStorageWarningPercent) < 5 &&
      now - this.lastStorageWarningTime < 12 * 60 * 60 * 1000
    ) {
      return null;
    }

    this.lastStorageWarningPercent = usedPercent;
    this.lastStorageWarningTime = now;

    const isFull = usedPercent >= 100;
    const title = isFull ? "⚠️ Storage limit reached" : "⚠️ Storage almost full";
    const msg = isFull
      ? `You've reached 100% of your plan capacity (${usedCount}/${maxCount} screenshots). Upgrade to Pro for 10,000 items.`
      : `You've used ${Math.round(usedPercent)}% of your available storage (${usedCount}/${maxCount} screenshots).`;

    return this.pushNotification("IMPORTANT", title, msg, {
      priority: isFull ? "critical" : "high",
      metadata: {
        isStorageWarning: true,
        usedPercent,
        usedCount,
        maxCount,
        actionUrl: "/pricing",
        actionLabel: "Upgrade Plan",
      },
    });
  }

  public notifyQuotaExceeded(used: number, max: number): AppNotification | null {
    const percent = max > 0 ? (used / max) * 100 : 100;
    return this.notifyStorageWarning(percent, used, max);
  }

  // ==========================================
  // 7. CRITICAL SYSTEM ALERTS
  // ==========================================

  public notifyCriticalSystemAlert(title: string, message: string, options?: NotifyOptions): AppNotification | null {
    return this.pushNotification("IMPORTANT", title, message, {
      priority: "critical",
      ...options,
    });
  }

  public notifySyncActionRequired(error: string): AppNotification | null {
    return this.pushNotification(
      "IMPORTANT",
      "⚠️ Cloud sync action required",
      `Cloud sync paused: ${error}. Please verify your credentials or reconnect to resume backups.`,
      {
        priority: "high",
        metadata: { error, eventType: "sync_action_required" },
      }
    );
  }

  public notifyProcessingFailure(count: number, reason?: string, screenshotIds?: string[]): AppNotification | null {
    // Only notify if permanent failure affecting user items
    return this.pushNotification(
      "IMPORTANT",
      count === 1 ? "1 screenshot could not be processed" : `${count} screenshots could not be processed`,
      reason || "OCR text extraction or vision analysis could not complete. Original images preserved safely.",
      {
        priority: "high",
        metadata: { failedCount: count, screenshotIds, reason },
      }
    );
  }

  // ==========================================
  // EMAIL NOTIFICATIONS (Security / Billing only)
  // ==========================================

  private sendEmailNotification(payload: {
    recipient: string;
    eventType: string;
    subject: string;
    body: string;
  }): void {
    const log: EmailAuditLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipient: payload.recipient,
      eventType: payload.eventType,
      subject: payload.subject,
      body: payload.body,
      sentAt: new Date().toISOString(),
    };

    this.emailAuditLogs.unshift(log);
    if (this.emailAuditLogs.length > 50) {
      this.emailAuditLogs.pop();
    }

    console.log(`[NotificationManager:EmailSent] [${payload.eventType}] To: ${payload.recipient} | Subject: "${payload.subject}"`);
  }

  public getEmailAuditLogs(): EmailAuditLog[] {
    return [...this.emailAuditLogs];
  }

  // ==========================================
  // ACTIONS & IN-APP NOTIFICATION CENTER
  // ==========================================

  public markAsRead(id: string): void {
    let changed = false;
    this.notifications = this.notifications.map((n) => {
      if (n.id === id) {
        changed = true;
        return { ...n, read: true, isRead: true };
      }
      return n;
    });
    if (changed) this.notifyListeners();
  }

  public toggleRead(id: string): void {
    this.notifications = this.notifications.map((n) => {
      if (n.id === id) {
        const nextState = !(n.read ?? n.isRead);
        return { ...n, read: nextState, isRead: nextState };
      }
      return n;
    });
    this.notifyListeners();
  }

  public markAllAsRead(): void {
    if (this.notifications.every((n) => n.read || n.isRead)) return;
    this.notifications = this.notifications.map((n) => ({
      ...n,
      read: true,
      isRead: true,
    }));
    this.notifyListeners();
  }

  public deleteNotification(id: string): void {
    if (!id) return;
    addTombstonedNotificationId(id);
    const prevLen = this.notifications.length;
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.isInitialized = true;
    if (this.notifications.length !== prevLen) {
      this.notifyListeners();
    }
    try {
      fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    } catch {}
  }

  public clearAll(userId?: string): void {
    if (this.indexDebounceTimer) {
      clearTimeout(this.indexDebounceTimer);
      this.indexDebounceTimer = null;
    }
    const currentIds = this.notifications.map((n) => n.id);
    addTombstonedNotificationIds(currentIds);
    setLastClearedAllTimestamp(Date.now());

    this.notifications = [];
    this.pendingIndexedCount = 0;
    this.pendingIndexedScreenshots = [];
    this.recentNotifiedScreenshotIds.clear();
    this.recentFingerprints.clear();
    this.isInitialized = true;
    saveNotifications([]);
    this.notifyListeners();

    try {
      const effectiveUserId = userId || "guest";
      fetch(`/api/notifications?userId=${encodeURIComponent(effectiveUserId)}`, {
        method: "DELETE",
      }).catch(() => {});
    } catch {}
  }

  // ==========================================
  // COMPATIBILITY & LEGACY HANDLERS
  // ==========================================

  public notifyImportant(title: string, message: string, options?: NotifyOptions): AppNotification | null {
    return this.pushNotification("IMPORTANT", title, message, {
      priority: "high",
      ...options,
    });
  }

  public notifySecurity(title: string, message: string, options?: NotifyOptions): AppNotification | null {
    return this.pushNotification("SECURITY", title, message, {
      priority: "high",
      ...options,
    });
  }

  public notifySubscription(title: string, message: string, options?: NotifyOptions): AppNotification | null {
    return this.pushNotification("SUBSCRIPTION", title, message, {
      priority: "high",
      ...options,
    });
  }

  public notifyBiometricToggled(enabled: boolean): AppNotification | null {
    return this.notifySecuritySettingsChanged(enabled ? "Biometric App Lock enabled" : "Biometric App Lock disabled");
  }

  public notifyPurchasesRestored(count: number): AppNotification | null {
    if (count <= 0) return null;
    return this.pushNotification(
      "SUBSCRIPTION",
      "Purchases restored",
      `Successfully synced ${count} active Pro entitlement(s) with your store account.`,
      {
        priority: "medium",
        metadata: { count },
      }
    );
  }

  public notifySyncCompleted(_count: number): AppNotification | null {
    // ROUTINE EVENT SUPPRESSED: Normal sync completions do not create user-facing notifications.
    console.log(`[NotificationManager] Routine sync completed suppressed from user alerts.`);
    return null;
  }

  public notifySyncFailed(error?: string): AppNotification | null {
    if (!error) return null;
    // Only notify if actionable error
    if (error.includes("auth") || error.includes("expired") || error.includes("unauthorized")) {
      return this.notifySyncActionRequired(error);
    }
    console.log(`[NotificationManager] Temporary background sync warning logged internally: ${error}`);
    return null;
  }

  public notifyProfileUpdated(_details?: string): AppNotification | null {
    // ROUTINE EVENT SUPPRESSED: Routine name/avatar updates do not clutter the notifications center.
    return null;
  }

  public notifyAppUpdated(version: string = "v2.4"): AppNotification | null {
    return this.pushNotification(
      "IMPORTANT",
      "SnapFind AI updated",
      `SnapFind AI has been updated to ${version} with streamlined notifications, instant OCR indexing, and neural search.`,
      {
        priority: "medium",
        metadata: { version },
      }
    );
  }

  /**
   * Play clean audio chime for notifications
   */
  private playNotificationSound(priority?: NotificationPriority): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      if (priority === "critical" || priority === "high") {
        // Two-tone chime for critical/high priority
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.1); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else {
        // Subtle soft blip for normal priority
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.08); // B5
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio not supported or blocked by browser policy
    }
  }
}

export const NotificationService = new NotificationServiceEngine();
export const NotificationManager = NotificationService;
