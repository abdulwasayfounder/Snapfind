/**
 * SnapFind AI - Centralized Paddle Billing Configuration
 * 
 * Manages client-safe Paddle configuration:
 * - Client-side token (test_... in sandbox, live_... in production)
 * - Environment ('sandbox' | 'production')
 * - Price IDs for Monthly, Yearly, Lifetime, and Founder plans
 * 
 * SECURITY:
 * Never put PADDLE_API_KEY, PAYMENT_SECRET_KEY, or webhook secrets in this file or on the frontend.
 */

export type PaddlePlanKey = "monthly" | "yearly" | "lifetime" | "founder";

export interface PaddlePriceIds {
  monthly: string;
  yearly: string;
  lifetime: string;
  founder: string;
}

export interface PaddleConfigState {
  isConfigured: boolean;
  environment: "sandbox" | "production";
  clientToken: string;
  priceIds: PaddlePriceIds;
  prices: {
    monthly: { pkr: number; label: string; interval: "monthly" | "yearly" | "one-time"; recurring: boolean; quota: number };
    yearly: { pkr: number; label: string; interval: "monthly" | "yearly" | "one-time"; recurring: boolean; quota: number };
    lifetime: { pkr: number; label: string; interval: "monthly" | "yearly" | "one-time"; recurring: boolean; quota: number };
    founder: { pkr: number; label: string; interval: "monthly" | "yearly" | "one-time"; recurring: boolean; quota: number; maxSeats: number };
  };
}

export const CANONICAL_PLANS: PaddleConfigState["prices"] = {
  monthly: {
    pkr: 249,
    label: "PKR 249/month",
    interval: "monthly",
    recurring: true,
    quota: 2500,
  },
  yearly: {
    pkr: 1999,
    label: "PKR 1,999/year",
    interval: "yearly",
    recurring: true,
    quota: 30000,
  },
  lifetime: {
    pkr: 5999,
    label: "PKR 5,999 one-time",
    interval: "one-time",
    recurring: false,
    quota: 100000,
  },
  founder: {
    pkr: 0,
    label: "Free (No payment required)",
    interval: "one-time",
    recurring: false,
    quota: 150000,
    maxSeats: 50,
  },
};

let cachedPaddleConfig: PaddleConfigState | null = null;

/**
 * Get active Paddle configuration from Vite env or server endpoint
 */
export async function getPaddleConfig(): Promise<PaddleConfigState> {
  if (cachedPaddleConfig) {
    return cachedPaddleConfig;
  }

  // 1. Check client-side Vite environment variables
  const envToken = (import.meta as any).env?.VITE_PADDLE_CLIENT_TOKEN || "";
  const envEnvironment = ((import.meta as any).env?.VITE_PADDLE_ENVIRONMENT || "sandbox").toLowerCase();
  const envPriceMonthly = (import.meta as any).env?.VITE_PADDLE_PRICE_ID_MONTHLY || "";
  const envPriceYearly = (import.meta as any).env?.VITE_PADDLE_PRICE_ID_YEARLY || "";
  const envPriceLifetime = (import.meta as any).env?.VITE_PADDLE_PRICE_ID_LIFETIME || "";
  const envPriceFounder = (import.meta as any).env?.VITE_PADDLE_PRICE_ID_FOUNDER || "";

  let clientToken = envToken;
  let environment: "sandbox" | "production" = envToken.startsWith("live_") ? "production" : (envEnvironment === "production" ? "production" : "sandbox");
  let priceIds: PaddlePriceIds = {
    monthly: envPriceMonthly,
    yearly: envPriceYearly,
    lifetime: envPriceLifetime,
    founder: envPriceFounder,
  };

  // 2. Fetch server-side configuration endpoint fallback
  try {
    const res = await fetch("/api/billing/paddle-config");
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (!clientToken && data.clientToken) {
          clientToken = data.clientToken;
        }
        if (data.environment) {
          environment = data.environment === "production" ? "production" : "sandbox";
        }
        if (data.priceIds) {
          priceIds = {
            monthly: priceIds.monthly || data.priceIds.monthly || "",
            yearly: priceIds.yearly || data.priceIds.yearly || "",
            lifetime: priceIds.lifetime || data.priceIds.lifetime || "",
            founder: priceIds.founder || data.priceIds.founder || "",
          };
        }
      }
    }
  } catch (err) {
    console.warn("[PaddleConfig] Could not fetch server paddle-config:", err);
  }

  // Check if token starts with test_ -> sandbox, live_ -> production
  if (clientToken.startsWith("test_")) {
    environment = "sandbox";
  } else if (clientToken.startsWith("live_")) {
    environment = "production";
  }

  const isConfigured = Boolean(
    clientToken &&
    (priceIds.monthly || priceIds.yearly || priceIds.lifetime || priceIds.founder)
  );

  cachedPaddleConfig = {
    isConfigured,
    environment,
    clientToken,
    priceIds,
    prices: CANONICAL_PLANS,
  };

  return cachedPaddleConfig;
}

/**
 * Clear cached config to reload
 */
export function resetCachedPaddleConfig(): void {
  cachedPaddleConfig = null;
}
