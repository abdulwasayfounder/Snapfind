import { getPaddleConfig, PaddlePlanKey, PaddleConfigState } from "./paddleConfig";
import { UserProfile } from "../../types";
import { SubscriptionManager } from "./SubscriptionManager";

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (env: "sandbox" | "production") => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: (event: { name: string; data?: any }) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: { email?: string };
          customData?: Record<string, any>;
          settings?: {
            displayMode?: "overlay" | "inline";
            theme?: "light" | "dark";
            locale?: string;
            successUrl?: string;
            allowLogout?: boolean;
            showAddTaxId?: boolean;
          };
        }) => void;
        close?: () => void;
      };
    };
  }
}

export interface PaddleCheckoutOptions {
  plan: PaddlePlanKey;
  user: UserProfile | null;
  onSuccess?: () => void;
  onClose?: () => void;
  onError?: (errorMessage: string) => void;
}

export interface PaddleCheckoutResult {
  success: boolean;
  requiresAuth?: boolean;
  error?: string;
}

class PaddleBillingServiceEngine {
  private isInitialized: boolean = false;
  private initializationPromise: Promise<boolean> | null = null;
  private activeConfig: PaddleConfigState | null = null;

  /**
   * Dynamically loads Paddle.js v2 SDK if not already present on window
   */
  private async loadPaddleScript(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (window.Paddle && typeof window.Paddle.Initialize === "function") {
      return true;
    }

    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[src*="paddle.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(Boolean(window.Paddle)));
        existingScript.addEventListener("error", () => resolve(false));
        // If already loaded
        if (window.Paddle) {
          resolve(true);
          return;
        }
      }

      const script = document.createElement("script");
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async = true;
      script.onload = () => resolve(Boolean(window.Paddle));
      script.onerror = () => {
        console.error("[PaddleBillingService] Failed to load Paddle.js SDK script.");
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initializes Paddle.js exactly once with client-side token and correct environment
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized && window.Paddle) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const config = await getPaddleConfig();
        this.activeConfig = config;

        if (!config.clientToken) {
          console.warn("[PaddleBillingService] Paddle clientToken is not configured.");
          return false;
        }

        const scriptLoaded = await this.loadPaddleScript();
        if (!scriptLoaded || !window.Paddle) {
          console.error("[PaddleBillingService] window.Paddle is not available.");
          return false;
        }

        // Set Sandbox if token starts with test_ or environment is sandbox
        if (config.environment === "sandbox" || config.clientToken.startsWith("test_")) {
          if (window.Paddle.Environment && typeof window.Paddle.Environment.set === "function") {
            window.Paddle.Environment.set("sandbox");
            console.log("[PaddleBillingService] Paddle environment set to: sandbox");
          }
        }

        // Initialize with client-side token
        window.Paddle.Initialize({
          token: config.clientToken,
          eventCallback: (event) => {
            console.log("[PaddleBillingService] Event received:", event.name);
            if (event.name === "checkout.completed") {
              console.log("[PaddleBillingService] Checkout completed event emitted.");
              // Authoritative sync: Payment verification happens server-side via webhooks
              setTimeout(() => {
                SubscriptionManager.syncEntitlementsFromServer();
              }, 2500);
            }
          },
        });

        this.isInitialized = true;
        console.log("[PaddleBillingService] Paddle.js initialized successfully.");
        return true;
      } catch (err) {
        console.error("[PaddleBillingService] Initialization error:", err);
        return false;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Opens real Paddle Checkout for the selected plan and authenticated user
   */
  public async openCheckout(options: PaddleCheckoutOptions): Promise<PaddleCheckoutResult> {
    const { plan, user, onSuccess, onClose, onError } = options;

    // 1. Authentication Check
    if (!user || !user.id || user.id === "guest" || user.id.startsWith("local-guest")) {
      const authError = "Please sign in to continue with your purchase.";
      if (onError) onError(authError);
      return {
        success: false,
        requiresAuth: true,
        error: authError,
      };
    }

    // 2. Fetch active config
    const config = await getPaddleConfig();
    this.activeConfig = config;

    // 3. Resolve Price ID for the selected plan
    const priceId = config.priceIds[plan]?.trim();

    if (!priceId) {
      const configError = "Secure checkout is temporarily unavailable. Please try again later.";
      console.warn(`[PaddleBillingService] Missing Price ID for plan: ${plan}. Configured IDs:`, config.priceIds);
      if (onError) onError(configError);
      return {
        success: false,
        error: configError,
      };
    }

    // 4. Initialize Paddle.js if needed
    const initialized = await this.initialize();
    if (!initialized || !window.Paddle || !window.Paddle.Checkout) {
      const unavailableError = "Secure checkout is temporarily unavailable. Please try again later.";
      if (onError) onError(unavailableError);
      return {
        success: false,
        error: unavailableError,
      };
    }

    // 5. Open Paddle.Checkout.open() with ONLY the selected price ID
    try {
      window.Paddle.Checkout.open({
        items: [
          {
            priceId,
            quantity: 1,
          },
        ],
        customer: user.email ? { email: user.email } : undefined,
        customData: {
          userId: user.id,
          plan,
        },
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
          successUrl: `${window.location.origin}/pricing?checkout=success&plan=${plan}`,
        },
      });

      return { success: true };
    } catch (err: any) {
      console.error("[PaddleBillingService] Checkout open exception:", err);
      const checkoutErr = "Secure checkout is temporarily unavailable. Please try again later.";
      if (onError) onError(checkoutErr);
      return {
        success: false,
        error: checkoutErr,
      };
    }
  }

  /**
   * Retrieve current cached config
   */
  public getConfig(): PaddleConfigState | null {
    return this.activeConfig;
  }
}

export const PaddleBillingService = new PaddleBillingServiceEngine();
export default PaddleBillingService;
