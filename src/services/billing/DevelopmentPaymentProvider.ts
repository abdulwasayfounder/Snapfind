import {
  PaymentProvider,
  PaymentProviderId,
  PurchaseOptions,
  PurchaseResult,
  RestoreResult,
  CancelResult,
  CustomerPortalResult,
} from "./PaymentProvider";
import { BillingProduct, SubscriptionRecord, UserEntitlement } from "../../types";

const DEV_DEFAULT_PRODUCTS: BillingProduct[] = [
  {
    productId: "snapfind_pro:pro-yearly",
    type: "subs",
    title: "SnapFind Pro (Yearly)",
    name: "SnapFind Pro Yearly Plan",
    description: "10,000 indexed screenshots, advanced AI search, cloud sync, priority processing",
    formattedPrice: "$24.99/year",
    priceCurrencyCode: "USD",
    priceAmountMicros: 24990000,
    billingPeriod: "P1Y",
    badge: "Best Value (Save 30%)",
  },
  {
    productId: "snapfind_pro:pro-monthly",
    type: "subs",
    title: "SnapFind Pro (Monthly)",
    name: "SnapFind Pro Monthly Plan",
    description: "10,000 indexed screenshots, advanced AI search, cloud sync, priority processing",
    formattedPrice: "$2.99/month",
    priceCurrencyCode: "USD",
    priceAmountMicros: 2990000,
    billingPeriod: "P1M",
  },
  {
    productId: "snapfind_pro_lifetime",
    type: "inapp",
    title: "SnapFind Pro Lifetime",
    name: "SnapFind Pro Lifetime Pass",
    description: "Permanent Pro entitlement for 10,000 screenshots, all future AI vision upgrades",
    formattedPrice: "$79.99",
    priceCurrencyCode: "USD",
    priceAmountMicros: 79990000,
    billingPeriod: "lifetime",
    badge: "One-Time Payment",
  },
];

/**
 * Development & Mock Payment Provider
 *
 * Used for development, testing, staging, and preview sandbox environments.
 * - Safely simulates store purchases without processing real payments.
 * - Enforces server-side verification: sends generated test purchase tokens to the backend
 *   verification endpoint `/api/billing/verify-purchase` so backend state, events, and entitlements
 *   follow the exact same cryptographic lifecycle as production.
 */
export class DevelopmentPaymentProvider implements PaymentProvider {
  public readonly providerId: PaymentProviderId = "mock";
  public readonly name: string = "Development / Sandbox Provider";
  public readonly isSandbox: boolean = true;

  private cachedProducts: BillingProduct[] = DEV_DEFAULT_PRODUCTS;
  private isInit: boolean = false;

  public async isAvailable(): Promise<boolean> {
    return true; // Always available in development / web test modes
  }

  public async initialize(): Promise<boolean> {
    if (this.isInit) return true;
    try {
      await this.getProducts();
    } catch {
      // Products fallback to defaults
    }
    this.isInit = true;
    return true;
  }

  public async getProducts(): Promise<BillingProduct[]> {
    try {
      const res = await fetch("/api/billing/products");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          this.cachedProducts = data.products;
        }
      }
    } catch (err) {
      console.warn("[DevPaymentProvider] Could not reach backend product catalog, using local defaults:", err);
    }
    return this.cachedProducts;
  }

  public async getSubscriptionStatus(userId: string = "guest"): Promise<SubscriptionRecord | null> {
    try {
      const res = await fetch(`/api/billing/subscription-status?userId=${encodeURIComponent(userId)}`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.subscription) {
          return data.subscription;
        }
      }
    } catch (err) {
      console.warn("[DevPaymentProvider] Failed to fetch subscription status from server:", err);
    }
    return null;
  }

  public async purchaseSubscription(options: PurchaseOptions): Promise<PurchaseResult> {
    const { productId, userId = "guest" } = options;

    // Simulate realistic store checkout interaction latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate compliant mock purchase order and token
    const mockOrderId = `DEV.GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10000 + Math.random() * 90000)}`;
    const mockPurchaseToken = `token_sandbox_${productId.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    try {
      // Authoritative Backend Verification Call
      const verifyRes = await fetch("/api/billing/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId,
          purchaseToken: mockPurchaseToken,
          orderId: mockOrderId,
          platform: "mock",
          isSandbox: true,
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        return {
          success: false,
          platform: "mock",
          isSandbox: true,
          error: errJson.error || `Server verification failed with HTTP ${verifyRes.status}`,
        };
      }

      const verifyData = await verifyRes.json();
      if (!verifyData.success || !verifyData.entitlement) {
        return {
          success: false,
          platform: "mock",
          isSandbox: true,
          error: verifyData.error || "Server rejected purchase verification.",
        };
      }

      return {
        success: true,
        orderId: mockOrderId,
        purchaseToken: mockPurchaseToken,
        subscriptionId: verifyData.subscription?.id,
        productId,
        platform: "mock",
        isSandbox: true,
        entitlement: verifyData.entitlement,
      };
    } catch (err: any) {
      return {
        success: false,
        platform: "mock",
        isSandbox: true,
        error: err.message || "Network error while verifying test purchase with server.",
      };
    }
  }

  public async restorePurchases(userId: string = "guest"): Promise<RestoreResult> {
    try {
      const res = await fetch("/api/billing/restore-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          purchases: [],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          restoredCount: 0,
          message: errJson.error || "Failed to restore purchases from server.",
          error: errJson.error,
        };
      }

      const data = await res.json();
      return {
        success: Boolean(data.success),
        restoredCount: data.restoredCount || (data.success ? 1 : 0),
        entitlement: data.entitlement,
        message: data.message || "Sandbox purchases checked.",
      };
    } catch (err: any) {
      return {
        success: false,
        restoredCount: 0,
        message: "Failed to communicate with billing server during restore.",
        error: err.message,
      };
    }
  }

  public async cancelSubscription(subscriptionId: string, userId: string = "guest"): Promise<CancelResult> {
    try {
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, userId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || "Subscription auto-renewal canceled.",
          effectiveDate: data.effectiveDate,
        };
      }
      return {
        success: false,
        message: data.error || "Could not cancel subscription.",
        error: data.error,
      };
    } catch (err: any) {
      return {
        success: false,
        message: "Failed to contact billing server for cancellation.",
        error: err.message,
      };
    }
  }

  public async openCustomerPortal(subscriptionId?: string): Promise<CustomerPortalResult> {
    console.log("[DevPaymentProvider] Opening simulated customer portal for subscription:", subscriptionId);
    return {
      openedExternally: false,
      instructions: "Development Mode: Subscriptions can be managed, canceled, or renewed directly via the SnapFind Pro Settings panel.",
    };
  }
}
