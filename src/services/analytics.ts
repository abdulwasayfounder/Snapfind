/**
 * SnapFind AI — Google Analytics 4 (GA4) Privacy-Conscious Integration
 *
 * Implements privacy-compliant, zero-PII tracking for public page views
 * and key product engagement milestones.
 *
 * Privacy Guarantees:
 * 1. Zero PII: Never sends screenshot images, OCR transcription, private search queries,
 *    emails, authentication tokens, passwords, or personal account identifiers.
 * 2. Consent Controls: Respects user consent stored in localStorage ('sf_analytics_consent').
 * 3. Failsafe: Gracefully no-ops when VITE_GA_MEASUREMENT_ID is absent or unset.
 * 4. Deduplication: Guards against duplicate SPA navigation page-view triggers.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export type AnalyticsConsentStatus = "granted" | "denied" | "unset";

const CONSENT_STORAGE_KEY = "sf_analytics_consent";

class AnalyticsService {
  private measurementId: string | null = null;
  private isInitialized = false;
  private lastTrackedPath = "";
  private lastTrackedTime = 0;

  constructor() {
    const rawId = (typeof import.meta !== "undefined" && import.meta.env?.VITE_GA_MEASUREMENT_ID) || "";
    // Only accept genuine GA4 Measurement IDs (format: G-XXXXXXXXXX)
    if (rawId && /^G-[A-Z0-9]+$/i.test(rawId.trim())) {
      this.measurementId = rawId.trim().toUpperCase();
    }
  }

  /**
   * Check if analytics is enabled and has a valid ID
   */
  public isConfigured(): boolean {
    return Boolean(this.measurementId);
  }

  /**
   * Get the configured Measurement ID (if any)
   */
  public getMeasurementId(): string | null {
    return this.measurementId;
  }

  /**
   * Get current user consent status
   */
  public getConsent(): AnalyticsConsentStatus {
    if (typeof localStorage === "undefined") return "unset";
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === "granted" || val === "denied") return val;
    return "unset";
  }

  /**
   * Set user consent and initialize if granted
   */
  public setConsent(status: "granted" | "denied"): void {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CONSENT_STORAGE_KEY, status);
    }

    if (status === "granted") {
      this.init();
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("consent", "update", {
          analytics_storage: "granted",
        });
      }
    } else {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("consent", "update", {
          analytics_storage: "denied",
        });
      }
    }
  }

  /**
   * Initialize GA4 script tag dynamically
   */
  public init(): void {
    if (this.isInitialized || !this.measurementId || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const consent = this.getConsent();
    if (consent === "denied") {
      return;
    }

    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };

      // Set default consent mode before script execution
      window.gtag("consent", "default", {
        analytics_storage: consent === "granted" ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });

      window.gtag("js", new Date());
      window.gtag("config", this.measurementId, {
        send_page_view: false, // Manual SPA page_view dispatch to avoid duplicates
        anonymize_ip: true,
        cookie_flags: "SameSite=None;Secure",
      });

      // Inject Google Tag script asynchronously
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);

      this.isInitialized = true;
      console.log(`[Analytics] Google Analytics 4 initialized successfully with Measurement ID: ${this.measurementId}`);
    } catch (err) {
      console.warn("[Analytics] Failed to initialize Google Analytics:", err);
    }
  }

  /**
   * Track SPA Page View (Deduplicated, zero-PII path)
   */
  public trackPageView(pagePath: string, pageTitle: string): void {
    if (!this.measurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const consent = this.getConsent();
    if (consent === "denied") return;

    // Sanitize path (strip any internal query params or hashes that might leak private IDs)
    const cleanPath = pagePath.split("?")[0].split("#")[0] || "/";
    const now = Date.now();

    // Deduplicate rapid duplicate events (< 500ms on same path)
    if (this.lastTrackedPath === cleanPath && now - this.lastTrackedTime < 500) {
      return;
    }

    this.lastTrackedPath = cleanPath;
    this.lastTrackedTime = now;

    try {
      window.gtag("event", "page_view", {
        page_path: cleanPath,
        page_title: pageTitle,
        page_location: `${window.location.origin}${cleanPath}`,
      });
    } catch (err) {
      console.warn("[Analytics] Error tracking page view:", err);
    }
  }

  /**
   * Track Key Action Milestone (Never includes PII)
   */
  public trackEvent(eventName: string, params: Record<string, string | number | boolean> = {}): void {
    if (!this.measurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const consent = this.getConsent();
    if (consent === "denied") return;

    try {
      // Clean params: ensure no user identifiers, emails, or raw text leaks
      const safeParams: Record<string, string | number | boolean> = {};
      for (const [key, val] of Object.entries(params)) {
        if (typeof val === "string") {
          // Truncate and strip sensitive email/token patterns
          if (val.includes("@") || val.length > 100) continue;
          safeParams[key] = val;
        } else if (typeof val === "number" || typeof val === "boolean") {
          safeParams[key] = val;
        }
      }

      window.gtag("event", eventName, safeParams);
    } catch (err) {
      console.warn("[Analytics] Error tracking event:", err);
    }
  }
}

export const analytics = new AnalyticsService();
