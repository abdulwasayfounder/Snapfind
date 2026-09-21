import { FeedbackItem, FeedbackSubmitPayload, FeedbackType, UserProfile } from "../types";
import { supabase, isSupabaseConfigured } from "./supabase";
import { NotificationService } from "./notificationService";

const STORAGE_PREFIX = "snapfind_feedback_user_";
const FOUNDER_DISMISSED_KEY = "snapfind_founder_feedback_prompt_dismissed_v1";
const APP_VERSION = "v2.4.0";

type FeedbackListener = (feedbackList: FeedbackItem[]) => void;

class FeedbackServiceClass {
  private listeners: Set<FeedbackListener> = new Set();
  private memoryCache: Map<string, FeedbackItem[]> = new Map();

  constructor() {
    // Initialized
  }

  /**
   * Subscribe to feedback changes for real-time reactivity
   */
  public subscribe(listener: FeedbackListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(userId: string): void {
    const list = this.getLocalFeedback(userId);
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (err) {
        console.warn("[FeedbackService] Listener error:", err);
      }
    });
  }

  /**
   * Detect current platform and browser safely
   */
  private getPlatformString(): string {
    if (typeof window === "undefined") return "Web (Server)";
    try {
      const userAgent = navigator.userAgent;
      let browser = "Web";
      if (userAgent.includes("Edg")) browser = "Edge";
      else if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Safari")) browser = "Safari";
      else if (userAgent.includes("Firefox")) browser = "Firefox";

      let os = "Desktop";
      if (/Android/i.test(userAgent)) os = "Android";
      else if (/iPhone|iPad|iPod/i.test(userAgent)) os = "iOS";
      else if (/Mac/i.test(userAgent)) os = "macOS";
      else if (/Win/i.test(userAgent)) os = "Windows";
      else if (/Linux/i.test(userAgent)) os = "Linux";

      return `${browser} on ${os}`;
    } catch {
      return "Web (Standard)";
    }
  }

  /**
   * Read local user-scoped feedback storage (Zero cross-user exposure)
   */
  private getLocalFeedback(userId: string): FeedbackItem[] {
    const targetId = userId || "guest";
    if (this.memoryCache.has(targetId)) {
      return this.memoryCache.get(targetId)!;
    }

    try {
      const key = `${STORAGE_PREFIX}${targetId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Strictly verify every record belongs to this user ID
          const verified = parsed.filter((item: FeedbackItem) => item.user_id === targetId);
          this.memoryCache.set(targetId, verified);
          return verified;
        }
      }
    } catch (err) {
      console.warn("[FeedbackService] Error reading local feedback:", err);
    }

    this.memoryCache.set(targetId, []);
    return [];
  }

  /**
   * Save user feedback locally
   */
  private saveLocalFeedback(userId: string, items: FeedbackItem[]): void {
    const targetId = userId || "guest";
    this.memoryCache.set(targetId, items);
    try {
      const key = `${STORAGE_PREFIX}${targetId}`;
      localStorage.setItem(key, JSON.stringify(items));
    } catch (err) {
      console.warn("[FeedbackService] Error saving local feedback:", err);
    }
  }

  /**
   * Fetch feedback history for the authenticated user only.
   * Ensures no other users' feedback is exposed.
   */
  public async getUserFeedback(userId: string): Promise<FeedbackItem[]> {
    const targetId = userId || "guest";
    const localItems = this.getLocalFeedback(targetId);

    // If Supabase is configured and user is not a guest, attempt sync
    if (isSupabaseConfigured && targetId !== "guest") {
      try {
        const { data, error } = await supabase
          .from("feedback")
          .select("id, user_id, type, title, description, rating, nps_score, screenshot_url, app_version, platform, created_at, status")
          .eq("user_id", targetId)
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          // Merge remote items with local items by ID
          const map = new Map<string, FeedbackItem>();
          // Remote first
          data.forEach((row: any) => {
            map.set(row.id, {
              id: row.id,
              user_id: row.user_id,
              type: (row.type as FeedbackType) || "Other",
              title: row.title || "Feedback",
              description: row.description || "",
              rating: Number(row.rating) || 5,
              nps_score: row.nps_score !== null && row.nps_score !== undefined ? Number(row.nps_score) : null,
              screenshot_url: row.screenshot_url || null,
              app_version: row.app_version || APP_VERSION,
              platform: row.platform || "Web",
              created_at: row.created_at || new Date().toISOString(),
              status: row.status || "pending",
            });
          });

          // Local overlay
          localItems.forEach((item) => {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            }
          });

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          this.saveLocalFeedback(targetId, merged);
          this.notifyListeners(targetId);
          return merged;
        }
      } catch (err) {
        console.info("[FeedbackService] Remote sync fallback to local storage:", err);
      }
    }

    return localItems;
  }

  /**
   * Submit new feedback from the user.
   * Stores securely in Supabase, backend API, and locally.
   */
  public async submitFeedback(
    payload: FeedbackSubmitPayload,
    user?: UserProfile | null,
    isFounder: boolean = false
  ): Promise<{ success: boolean; item: FeedbackItem; message: string }> {
    const userId = user?.isLoggedIn && user.id ? user.id : "guest";
    const userEmail = user?.isLoggedIn && user.email ? user.email : payload.user_email || "";

    const newId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    const platform = this.getPlatformString();
    const rawMessage = (payload.description || payload.message || "").trim();
    const effectiveTitle = (payload.title || "").trim() || `${payload.type} from ${payload.page || "App"}`;

    const newItem: FeedbackItem = {
      id: newId,
      user_id: userId,
      user_email: userEmail || undefined,
      type: payload.type,
      title: effectiveTitle,
      description: rawMessage,
      rating: Math.max(1, Math.min(5, payload.rating || 5)),
      nps_score:
        payload.nps_score !== undefined && payload.nps_score !== null
          ? Math.max(0, Math.min(10, payload.nps_score))
          : null,
      page: payload.page || "General",
      screenshot_url: payload.screenshot_url || null,
      app_version: APP_VERSION,
      platform,
      created_at: nowIso,
      status: "pending",
      user_plan: user?.plan || "Free",
      is_founder: isFounder,
    };

    // 1. Store in local state & cache
    const currentLocal = this.getLocalFeedback(userId);
    const updated = [newItem, ...currentLocal];
    this.saveLocalFeedback(userId, updated);

    // 2. Post to backend API
    try {
      await fetch("/api/feedback/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          type: newItem.type,
          title: newItem.title,
          description: newItem.description,
          rating: newItem.rating,
          nps_score: newItem.nps_score,
          page: newItem.page,
          screenshot_url: newItem.screenshot_url,
          platform: newItem.platform,
        }),
      });
    } catch (apiErr) {
      console.warn("[FeedbackService] Server feedback API offline fallback:", apiErr);
    }

    // 3. Persist to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("feedback").insert([
          {
            id: newItem.id,
            user_id: newItem.user_id,
            type: newItem.type,
            title: newItem.title,
            description: newItem.description,
            rating: newItem.rating,
            nps_score: newItem.nps_score,
            page: newItem.page,
            screenshot_url: newItem.screenshot_url,
            app_version: newItem.app_version,
            platform: newItem.platform,
            created_at: newItem.created_at,
            status: newItem.status,
          },
        ]);

        if (error) {
          console.warn("[FeedbackService] Supabase insert warning (local storage preserved):", error.message);
        } else {
          console.log("[FeedbackService] Feedback synced securely to Supabase.");
        }
      } catch (err) {
        console.warn("[FeedbackService] Supabase offline fallback:", err);
      }
    }

    // 4. Emit in-app notification
    NotificationService.pushNotification(
      "SYSTEM",
      "Feedback Received",
      `Thank you for sharing your feedback on "${newItem.title}". Our team reviews every submission.`,
      {
        userId,
        priority: "low",
        metadata: {
          feedbackId: newItem.id,
          feedbackType: newItem.type,
          rating: newItem.rating,
          page: newItem.page,
        },
      }
    );

    this.notifyListeners(userId);

    return {
      success: true,
      item: newItem,
      message: "Thanks! Your feedback has been received. 💙",
    };
  }

  /**
   * Founder User Prompt Dismissal Tracking
   */
  public hasDismissedFounderPrompt(): boolean {
    try {
      return localStorage.getItem(FOUNDER_DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  }

  public dismissFounderPrompt(): void {
    try {
      localStorage.setItem(FOUNDER_DISMISSED_KEY, "true");
    } catch (err) {
      console.warn("[FeedbackService] Error dismissing founder prompt:", err);
    }
  }

  /**
   * Check if the user has previously submitted feedback
   */
  public hasSubmittedAnyFeedback(userId: string): boolean {
    const list = this.getLocalFeedback(userId);
    return list.length > 0;
  }
}

export const FeedbackService = new FeedbackServiceClass();
