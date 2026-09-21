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

/**
 * Web Payment Provider
 *
 * Prepared abstraction for future web-based payment gateways (e.g. Stripe Checkout, Paddle, LemonSqueezy).
 *
 * INTEGRATION ARCHITECTURE:
 * 1. Checkout Session Creation:
 *    Calls backend POST `/api/billing/create-checkout-session` with { productId, userId, successUrl, cancelUrl }.
 * 2. Redirection:
 *    Redirects browser window to the secure hosted checkout URL.
 * 3. Server Webhooks:
 *    The server receives `checkout.session.completed` and `customer.subscription.updated` webhooks,
 *    updating `user_entitlements` and `subscriptions` tables authoritatively.
 * 4. Customer Portal:
 *    Calls POST `/api/billing/create-portal-session` to let users manage cards, invoices, and cancellations.
 */
export class WebPaymentProvider implements PaymentProvider {
  public readonly providerId: PaymentProviderId = "web";
  public readonly name: string = "Web Payment Gateway (Stripe / Hosted Checkout)";
  public readonly isSandbox: boolean = false;

  private isInit: boolean = false;
  private cachedProducts: BillingProduct[] = [];

  public async isAvailable(): Promise<boolean> {
    // Available when running on web / desktop browser (non-native Android)
    return typeof window !== "undefined";
  }

  public async initialize(): Promise<boolean> {
    if (this.isInit) return true;
    await this.getProducts();
    this.isInit = true;
    return true;
  }

  public async getProducts(): Promise<BillingProduct[]> {
    try {
      const res = await fetch("/api/billing/products");
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          this.cachedProducts = data.products;
          return this.cachedProducts;
        }
      }
    } catch (err) {
      console.warn("[WebPaymentProvider] Failed to fetch catalog:", err);
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
      console.warn("[WebPaymentProvider] Failed to fetch subscription status:", err);
    }
    return null;
  }

  public async purchaseSubscription(options: PurchaseOptions): Promise<PurchaseResult> {
    const { productId, userId = "guest", customerEmail } = options;

    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          userId,
          customerEmail,
          returnUrl: window.location.origin + "/pricing?payment_status=success",
          cancelUrl: window.location.origin + "/pricing?payment_status=cancelled",
        }),
      });

      const data = await res.json();

      if (res.ok && data.checkoutUrl) {
        // Redirect to provider checkout
        window.location.href = data.checkoutUrl;
        return {
          success: true,
          platform: "web",
          productId,
        };
      }

      return {
        success: false,
        platform: "web",
        error: data.error || "Web payment gateway is currently in preparation mode. Please use development mode.",
      };
    } catch (err: any) {
      return {
        success: false,
        platform: "web",
        error: err.message || "Failed to initialize web checkout session.",
      };
    }
  }

  public async restorePurchases(userId?: string): Promise<RestoreResult> {
    try {
      const res = await fetch("/api/billing/restore-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId || "guest" }),
      });

      const data = await res.json();
      return {
        success: Boolean(data.success),
        restoredCount: data.restoredCount || 0,
        entitlement: data.entitlement,
        message: data.message || "Web subscription checked.",
      };
    } catch (err: any) {
      return {
        success: false,
        restoredCount: 0,
        message: "Failed to restore web purchases.",
        error: err.message,
      };
    }
  }

  public async cancelSubscription(subscriptionId: string, userId?: string): Promise<CancelResult> {
    try {
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, userId }),
      });
      const data = await res.json();
      return {
        success: Boolean(data.success),
        message: data.message || "Subscription cancellation request processed.",
        effectiveDate: data.effectiveDate,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Failed to process cancellation.",
        error: err.message,
      };
    }
  }

  public async openCustomerPortal(subscriptionId?: string): Promise<CustomerPortalResult> {
    try {
      const res = await fetch("/api/billing/customer-portal", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank", "noopener,noreferrer");
        return { url: data.portalUrl, openedExternally: true };
      }
    } catch {}

    return {
      openedExternally: false,
      instructions: "To manage your subscription, please visit your account billing settings.",
    };
  }
}
