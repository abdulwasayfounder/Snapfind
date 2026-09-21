import { Capacitor } from "@capacitor/core";
import { GooglePlayProduct } from "../../types";

export interface PurchaseResult {
  success: boolean;
  purchaseToken?: string;
  orderId?: string;
  productId?: string;
  platform: "android_google_play" | "web_sandbox";
  error?: string;
}

export interface ActivePurchaseItem {
  purchaseToken: string;
  productId: string;
  orderId?: string;
  purchaseTime: number;
  acknowledged: boolean;
}

// Standard Google Play Subscription Product & Base Plan IDs
export const PLAY_STORE_SKUS = {
  PRODUCT_ID: "snapfind_pro",
  BASE_PLAN_MONTHLY: "pro-monthly",
  BASE_PLAN_YEARLY: "pro-yearly",
  PRO_MONTHLY: "snapfind_pro:pro-monthly",
  PRO_ANNUAL: "snapfind_pro:pro-yearly",
  PRO_LIFETIME: "snapfind_pro_lifetime",
} as const;

// Default catalog metadata (dynamic prices are fetched from Google Play Billing / Backend in production)
const DEFAULT_PRODUCTS: GooglePlayProduct[] = [
  {
    productId: PLAY_STORE_SKUS.PRO_ANNUAL,
    type: "subs",
    title: "SnapFind Pro (Yearly)",
    name: "SnapFind Pro Yearly Plan",
    description: "Unlimited indexed screenshots, advanced AI search, cloud sync, priority processing",
    formattedPrice: "$14.99/year",
    priceCurrencyCode: "USD",
    priceAmountMicros: 14990000,
    billingPeriod: "P1Y",
    badge: "BEST VALUE",
  },
  {
    productId: PLAY_STORE_SKUS.PRO_MONTHLY,
    type: "subs",
    title: "SnapFind Pro (Monthly)",
    name: "SnapFind Pro Monthly Plan",
    description: "Unlimited indexed screenshots, advanced AI search, cloud sync, priority processing",
    formattedPrice: "$1.99/month",
    priceCurrencyCode: "USD",
    priceAmountMicros: 1990000,
    billingPeriod: "P1M",
  },
  {
    productId: PLAY_STORE_SKUS.PRO_LIFETIME,
    type: "inapp",
    title: "SnapFind Pro Lifetime",
    name: "SnapFind Pro Lifetime Pass",
    description: "Lifetime access to SnapFind Pro with unlimited screenshots and future upgrades",
    formattedPrice: "$29.99",
    priceCurrencyCode: "USD",
    priceAmountMicros: 29990000,
    billingPeriod: "lifetime",
    badge: "One-Time Payment",
  },
];

class GooglePlayBillingService {
  private isInitialized: boolean = false;
  private cachedProducts: GooglePlayProduct[] = DEFAULT_PRODUCTS;

  /**
   * Initialize Billing Client
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        // Native Android initialization (Capacitor Bridge)
        const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
        if (customPlugin && customPlugin.initializeBilling) {
          await customPlugin.initializeBilling();
        }
      }

      // Fetch dynamic localized products from server/Google Play catalog
      await this.fetchProducts();
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn("[GooglePlayBilling] Initialization fallback to catalog:", err);
      this.isInitialized = true;
      return true;
    }
  }

  /**
   * Query Available Subscription Products with real Store Currency
   */
  public async fetchProducts(): Promise<GooglePlayProduct[]> {
    try {
      const response = await fetch("/api/billing/products");
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          this.cachedProducts = data.products;
          return this.cachedProducts;
        }
      }
    } catch (err) {
      console.warn("[GooglePlayBilling] Failed to fetch server products, using cache:", err);
    }
    return this.cachedProducts;
  }

  public getCachedProducts(): GooglePlayProduct[] {
    return this.cachedProducts;
  }

  /**
   * Launch Native Google Play Billing Flow
   */
  public async launchPurchaseFlow(productId: string): Promise<PurchaseResult> {
    await this.initialize();

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
      if (customPlugin && customPlugin.launchPurchaseFlow) {
        try {
          const res = await customPlugin.launchPurchaseFlow({ productId });
          return {
            success: true,
            purchaseToken: res.purchaseToken,
            orderId: res.orderId,
            productId: res.productId || productId,
            platform: "android_google_play",
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message || "Google Play billing flow was cancelled or failed.",
            platform: "android_google_play",
          };
        }
      }
    }

    // Web / Sandbox test purchase token generation
    const mockOrderId = `GPA.${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10000 + Math.random() * 90000)}`;
    const mockPurchaseToken = `token_play_${productId}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

    return {
      success: true,
      purchaseToken: mockPurchaseToken,
      orderId: mockOrderId,
      productId,
      platform: "web_sandbox",
    };
  }

  /**
   * Query Existing Active Purchases for Restore Flow
   */
  public async queryPurchases(): Promise<ActivePurchaseItem[]> {
    await this.initialize();

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      const customPlugin = (window as any).Capacitor?.Plugins?.SnapFindBillingPlugin;
      if (customPlugin && customPlugin.queryPurchases) {
        try {
          const res = await customPlugin.queryPurchases();
          return res.purchases || [];
        } catch (err) {
          console.warn("[GooglePlayBilling] Error querying native purchases:", err);
        }
      }
    }

    return [];
  }
}

export const googlePlayBilling = new GooglePlayBillingService();
