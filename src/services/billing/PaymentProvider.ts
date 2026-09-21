import { BillingProduct, SubscriptionRecord, UserEntitlement } from "../../types";

export type PaymentPlatform = "android" | "web" | "ios" | "mock";
export type PaymentProviderId = "google_play" | "web" | "mock";

export interface PurchaseOptions {
  productId: string;
  userId?: string;
  customerEmail?: string;
  planCycle?: "monthly" | "yearly" | "lifetime";
}

export interface PurchaseResult {
  success: boolean;
  orderId?: string;
  purchaseToken?: string;
  subscriptionId?: string;
  productId?: string;
  platform: PaymentPlatform;
  isSandbox?: boolean;
  entitlement?: UserEntitlement;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  entitlement?: UserEntitlement;
  message: string;
  error?: string;
}

export interface CancelResult {
  success: boolean;
  message: string;
  effectiveDate?: string;
  error?: string;
}

export interface CustomerPortalResult {
  url?: string;
  openedExternally: boolean;
  instructions?: string;
}

/**
 * Abstract Payment Provider Interface
 * Decouples the UI layer from underlying payment engines (Google Play Billing, Web Stripe, or Sandbox/Mock)
 */
export interface PaymentProvider {
  readonly providerId: PaymentProviderId;
  readonly name: string;
  readonly isSandbox: boolean;

  /**
   * Determine if this payment provider is supported in the current runtime environment
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize SDKs, verify bridge connection, and prefetch products
   */
  initialize(): Promise<boolean>;

  /**
   * Fetch active catalog products from the store or server
   */
  getProducts(): Promise<BillingProduct[]>;

  /**
   * Retrieve active subscription contract for the specified user
   */
  getSubscriptionStatus(userId?: string): Promise<SubscriptionRecord | null>;

  /**
   * Initiate purchase or upgrade checkout flow
   */
  purchaseSubscription(options: PurchaseOptions): Promise<PurchaseResult>;

  /**
   * Query existing purchases attached to store account and sync with server
   */
  restorePurchases(userId?: string): Promise<RestoreResult>;

  /**
   * Cancel auto-renew or terminate subscription
   */
  cancelSubscription(subscriptionId: string, userId?: string): Promise<CancelResult>;

  /**
   * Direct user to the native platform management UI or web billing portal
   */
  openCustomerPortal(subscriptionId?: string): Promise<CustomerPortalResult>;
}
