import { Capacitor } from "@capacitor/core";
import {
  PaymentProvider,
  PaymentProviderId,
  PurchaseOptions,
  PurchaseResult,
  RestoreResult,
  CancelResult,
  CustomerPortalResult,
} from "./PaymentProvider";
import { BillingProduct, SubscriptionRecord } from "../../types";

export const GOOGLE_PLAY_CONFIG = {
  PACKAGE_NAME: "com.snapfind.app",
  SKUS: {
    PRODUCT_ID: "snapfind_pro",
    BASE_PLAN_MONTHLY: "pro-monthly",
    BASE_PLAN_YEARLY: "pro-yearly",
    PRO_MONTHLY: "snapfind_pro:pro-monthly",
    PRO_ANNUAL: "snapfind_pro:pro-yearly",
    PRO_LIFETIME: "snapfind_pro_lifetime",
  },
  PLAY_STORE_SUBSCRIPTION_URL: "https://play.google.com/store/account/subscriptions",
} as const;

/**
 * Android Google Play Billing Provider
 *
 * Implements Android Google Play Billing Library v6.x / v7.x architecture.
 *
 * PRODUCTION INTEGRATION POINTS:
 * 1. Native Plugin Bridge:
 *    Communicates with `SnapFindBillingPlugin` in `android/app/src/main/java/com/snapfind/app/billing/`.
 * 2. In-App Purchase Flow:
 *    Invokes `BillingClient.launchBillingFlow(activity, billingFlowParams)`.
 * 3. Purchase Token Verification:
 *    Sends raw `purchaseToken` to the authoritative backend endpoint `/api/billing/verify-purchase`.
 * 4. Backend Acknowledgement:
 *    The server uses Google Play Developer API (`androidpublisher.googleapis.com`) to verify and acknowledge
 *    the purchase with `purchases.subscriptionsv2.get` before granting entitlements.
 */
export class GooglePlayBillingProvider implements PaymentProvider {
  public readonly providerId: PaymentProviderId = "google_play";
  public readonly name: string = "Google Play Billing (Android)";
  public readonly isSandbox: boolean = false;

  private isInitialized: boolean = false;
  private cachedProducts: BillingProduct[] = [];

  public async isAvailable(): Promise<boolean> {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (await this.isAvailable()) {
        const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
        if (customPlugin && customPlugin.initializeBilling) {
          await customPlugin.initializeBilling();
        }
      }
      await this.getProducts();
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn("[GooglePlayBillingProvider] Native initialization error:", err);
      this.isInitialized = true;
      return false;
    }
  }

  public async getProducts(): Promise<BillingProduct[]> {
    try {
      // 1. If native Android plugin is available, query real Play Console SKUs
      if (await this.isAvailable()) {
        const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
        if (customPlugin && customPlugin.queryProductDetails) {
          const res = await customPlugin.queryProductDetails({
            productIds: [
              GOOGLE_PLAY_CONFIG.SKUS.PRO_ANNUAL,
              GOOGLE_PLAY_CONFIG.SKUS.PRO_MONTHLY,
              GOOGLE_PLAY_CONFIG.SKUS.PRO_LIFETIME,
            ],
          });
          if (res?.products && Array.isArray(res.products) && res.products.length > 0) {
            this.cachedProducts = res.products;
            return this.cachedProducts;
          }
        }
      }

      // 2. Fetch catalog from backend API
      const response = await fetch("/api/billing/products");
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          this.cachedProducts = data.products;
          return this.cachedProducts;
        }
      }
    } catch (err) {
      console.warn("[GooglePlayBillingProvider] Could not load products, fallback to cache:", err);
    }
    return this.cachedProducts;
  }

  public async getSubscriptionStatus(userId?: string): Promise<SubscriptionRecord | null> {
    try {
      const res = await fetch(`/api/billing/subscription-status?userId=${encodeURIComponent(userId || "guest")}`, {
        headers: { "x-user-id": userId || "guest" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.subscription) {
          return data.subscription;
        }
      }
    } catch (err) {
      console.warn("[GooglePlayBillingProvider] Failed to fetch subscription status:", err);
    }
    return null;
  }

  public async purchaseSubscription(options: PurchaseOptions): Promise<PurchaseResult> {
    const { productId, userId = "guest" } = options;
    await this.initialize();

    let purchaseToken = "";
    let orderId = "";

    // 1. Launch native Google Play Billing dialog on Android device
    if (await this.isAvailable()) {
      const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
      if (customPlugin && customPlugin.launchPurchaseFlow) {
        try {
          const res = await customPlugin.launchPurchaseFlow({ productId });
          if (!res || !res.purchaseToken) {
            return {
              success: false,
              platform: "android",
              error: "Google Play purchase was cancelled or did not return a purchase token.",
            };
          }
          purchaseToken = res.purchaseToken;
          orderId = res.orderId || "";
        } catch (err: any) {
          return {
            success: false,
            platform: "android",
            error: err.message || "Google Play billing flow encountered an error.",
          };
        }
      } else {
        return {
          success: false,
          platform: "android",
          error: "Native SnapFindBillingPlugin is not installed on this device build.",
        };
      }
    } else {
      // Running in web or preview environment: fallback to simulated sandbox token
      orderId = `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      purchaseToken = `token_play_${productId.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
    }

    // 2. Authoritative Server Verification (CRITICAL: Client NEVER decides entitlement directly)
    try {
      const verifyRes = await fetch("/api/billing/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId,
          purchaseToken,
          orderId,
          platform: "android_google_play",
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        return {
          success: false,
          platform: "android",
          error: errJson.error || `Server verification failed with status ${verifyRes.status}`,
        };
      }

      const verifyData = await verifyRes.json();
      if (!verifyData.success || !verifyData.entitlement) {
        return {
          success: false,
          platform: "android",
          error: verifyData.error || "Server could not verify Google Play purchase token.",
        };
      }

      return {
        success: true,
        orderId,
        purchaseToken,
        subscriptionId: verifyData.subscription?.id,
        productId,
        platform: "android",
        entitlement: verifyData.entitlement,
      };
    } catch (err: any) {
      return {
        success: false,
        platform: "android",
        error: err.message || "Failed to reach verification server.",
      };
    }
  }

  public async restorePurchases(userId?: string): Promise<RestoreResult> {
    await this.initialize();
    let nativePurchases: any[] = [];

    if (await this.isAvailable()) {
      const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
      if (customPlugin && customPlugin.queryPurchases) {
        try {
          const res = await customPlugin.queryPurchases();
          nativePurchases = res?.purchases || [];
        } catch (err) {
          console.warn("[GooglePlayBillingProvider] Query native purchases error:", err);
        }
      }
    }

    try {
      const res = await fetch("/api/billing/restore-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || "guest",
          purchases: nativePurchases,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          restoredCount: 0,
          message: errJson.error || "Failed to verify purchases with server.",
          error: errJson.error,
        };
      }

      const data = await res.json();
      return {
        success: Boolean(data.success),
        restoredCount: data.restoredCount || 0,
        entitlement: data.entitlement,
        message: data.message || "Google Play purchases queried successfully.",
      };
    } catch (err: any) {
      return {
        success: false,
        restoredCount: 0,
        message: err.message || "Network error while restoring purchases.",
        error: err.message,
      };
    }
  }

  public async cancelSubscription(subscriptionId: string, userId?: string): Promise<CancelResult> {
    // In Google Play Billing, subscriptions cannot be terminated directly by app client code.
    // The user must be directed to Google Play subscription settings.
    await this.openCustomerPortal(subscriptionId);
    return {
      success: true,
      message: "Please cancel or manage your recurring subscription in Google Play Store settings.",
    };
  }

  public async openCustomerPortal(subscriptionId?: string): Promise<CustomerPortalResult> {
    const playUrl = `${GOOGLE_PLAY_CONFIG.PLAY_STORE_SUBSCRIPTION_URL}?sku=${encodeURIComponent(GOOGLE_PLAY_CONFIG.SKUS.PRODUCT_ID)}&package=${encodeURIComponent(GOOGLE_PLAY_CONFIG.PACKAGE_NAME)}`;

    if (await this.isAvailable()) {
      const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
      if (customPlugin && customPlugin.openSubscriptionManagement) {
        try {
          await customPlugin.openSubscriptionManagement({
            sku: GOOGLE_PLAY_CONFIG.SKUS.PRODUCT_ID,
            packageName: GOOGLE_PLAY_CONFIG.PACKAGE_NAME,
          });
          return { url: playUrl, openedExternally: true };
        } catch {}
      }
    }

    window.open(playUrl, "_blank", "noopener,noreferrer");
    return { url: playUrl, openedExternally: true };
  }
}
