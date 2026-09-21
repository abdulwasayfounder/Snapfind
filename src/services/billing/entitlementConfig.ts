import { PlanFeatureLimits, SubscriptionTier, PlanType } from "../../types";

export interface PlanDefinition {
  id: PlanType | "monthly" | "yearly" | "lifetime" | "founder";
  tier: SubscriptionTier;
  name: string;
  badge?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  lifetimePrice?: number;
  formattedMonthlyPrice: string;
  formattedYearlyPrice: string;
  formattedLifetimePrice?: string;
  yearlySavingsPercent: number;
  description: string;
  features: PlanFeatureLimits;
  featureList: string[];
}

/**
 * Authoritative Centralized Plan Limits & Features Configuration
 *
 * PLANS SPECIFICATION:
 *
 * 1. FREE:
 * - PKR 0
 * - 100 lifetime indexed screenshots
 *
 * 2. PRO MONTHLY:
 * - PKR 249/month
 * - 1,000 screenshots / month
 * - Status: COMING SOON
 *
 * 3. PRO YEARLY:
 * - PKR 1,999/year
 * - 15,000 screenshots / year
 * - Status: COMING SOON
 *
 * 4. PRO LIFETIME:
 * - PKR 5,999 one-time
 * - 100,000 total screenshots
 * - Status: COMING SOON
 *
 * 5. FOUNDER:
 * - FREE (PKR 0, No payment required)
 * - Maximum 50 founder seats (Hard Ceiling)
 * - Permanent Founder rank (#1 to #50)
 * - 100,000 screenshot capacity + Lifetime Free Pro VIP
 */
export const PLAN_CONFIG: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    tier: "Free",
    name: "SnapFind Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    lifetimePrice: 0,
    formattedMonthlyPrice: "PKR 0",
    formattedYearlyPrice: "PKR 0",
    formattedLifetimePrice: "PKR 0",
    yearlySavingsPercent: 0,
    description: "Essential screenshot visual memory with 250 lifetime AI-indexed screenshots.",
    features: {
      maxIndexedScreenshots: 250,
      maxAIScansPerMonth: 250,
      maxStorageMB: 1000,
      cloudSync: false,
      advancedSearch: true,
      aiCollections: true,
      priorityProcessing: false,
    },
    featureList: [
      "250 AI-indexed screenshots lifetime",
      "On-device & Server OCR text extraction",
      "Natural language visual search",
      "Website & QR Code intelligence",
      "Collections & smart albums",
      "Trash & restore management",
      "Local export & storage",
    ],
  },
  monthly: {
    id: "monthly",
    tier: "Pro",
    name: "Pro Monthly",
    badge: "Flexible",
    monthlyPrice: 249,
    yearlyPrice: 0,
    lifetimePrice: 0,
    formattedMonthlyPrice: "PKR 249/mo",
    formattedYearlyPrice: "PKR 249/mo",
    formattedLifetimePrice: "PKR 249/mo",
    yearlySavingsPercent: 0,
    description: "PKR 249/month for 2,500 AI-indexed screenshots per month with AI multimodal search.",
    features: {
      maxIndexedScreenshots: 2500,
      maxAIScansPerMonth: 2500,
      maxStorageMB: 5000,
      cloudSync: true,
      advancedSearch: true,
      aiCollections: true,
      priorityProcessing: false,
    },
    featureList: [
      "PKR 249 / month",
      "2,500 AI-indexed screenshots / month",
      "Full AI multimodal search",
      "Advanced search filters & date queries",
      "QR, Barcode & URL intelligence",
      "Smart organization & auto-collections",
      "Cloud synchronization & backup",
      "Cancel anytime",
    ],
  },
  yearly: {
    id: "yearly",
    tier: "Pro",
    name: "Pro Yearly",
    badge: "Best Value",
    monthlyPrice: 167,
    yearlyPrice: 1999,
    lifetimePrice: 0,
    formattedMonthlyPrice: "PKR 167/mo",
    formattedYearlyPrice: "PKR 1,999/yr",
    formattedLifetimePrice: "PKR 1,999/yr",
    yearlySavingsPercent: 33,
    description: "Everything Pro with 30,000 AI-indexed screenshots/year and priority processing.",
    features: {
      maxIndexedScreenshots: 30000,
      maxAIScansPerMonth: 30000,
      maxStorageMB: 15000,
      cloudSync: true,
      advancedSearch: true,
      aiCollections: true,
      priorityProcessing: true,
    },
    featureList: [
      "PKR 1,999 / year (Save PKR 989 vs monthly)",
      "30,000 AI-indexed screenshots / year",
      "Everything in Pro Monthly",
      "Priority AI vision processing queue",
      "Fast-track OCR indexing",
      "Encrypted multi-device sync",
      "Priority customer support",
    ],
  },
  lifetime: {
    id: "lifetime",
    tier: "Pro",
    name: "Pro Lifetime",
    badge: "One-Time Payment",
    monthlyPrice: 0,
    yearlyPrice: 0,
    lifetimePrice: 5999,
    formattedMonthlyPrice: "PKR 5,999 once",
    formattedYearlyPrice: "PKR 5,999 once",
    formattedLifetimePrice: "PKR 5,999 one-time",
    yearlySavingsPercent: 100,
    description: "One-time payment of PKR 5,999 for 100,000 AI-indexed screenshots and permanent Lifetime Pro access.",
    features: {
      maxIndexedScreenshots: 100000,
      maxAIScansPerMonth: 100000,
      maxStorageMB: 50000,
      cloudSync: true,
      advancedSearch: true,
      aiCollections: true,
      priorityProcessing: true,
    },
    featureList: [
      "PKR 5,999 one-time payment",
      "100,000 AI-indexed screenshots lifetime",
      "Permanent Lifetime Pro access",
      "No recurring subscriptions forever",
      "Advanced neural OCR & indexing",
      "Full multimodal AI understanding",
      "Encrypted cloud synchronization",
      "All future Pro features included",
    ],
  },
  founder: {
    id: "founder",
    tier: "Founder",
    name: "Founder Plan",
    badge: "First 50 Users Only",
    monthlyPrice: 0,
    yearlyPrice: 0,
    lifetimePrice: 0,
    formattedMonthlyPrice: "Free",
    formattedYearlyPrice: "Free",
    formattedLifetimePrice: "Free (No payment required)",
    yearlySavingsPercent: 100,
    description: "Limited to first 50 users: Lifetime Free for 150,000 AI-indexed screenshots + Founder crown badge + permanent rank (#1–#50).",
    features: {
      maxIndexedScreenshots: 150000,
      maxAIScansPerMonth: 150000,
      maxStorageMB: 100000,
      cloudSync: true,
      advancedSearch: true,
      aiCollections: true,
      priorityProcessing: true,
    },
    featureList: [
      "Free forever • No payment required (Strict 50-seat limit)",
      "Permanent Founder rank (👑 #1 to #50)",
      "150,000 AI-indexed screenshots lifetime",
      "Lifetime free Pro access with zero recurring fees",
      "Founder badge and recognition",
      "Early access to major new features",
      "Founder-exclusive priority queue",
    ],
  },
  // Backward compatibility alias for "pro"
  pro: {
    id: "pro",
    tier: "Pro",
    name: "Pro Lifetime",
    badge: "One-Time Payment",
    monthlyPrice: 0,
    yearlyPrice: 0,
    lifetimePrice: 5999,
    formattedMonthlyPrice: "PKR 5,999 once",
    formattedYearlyPrice: "PKR 5,999 once",
    formattedLifetimePrice: "PKR 5,999 one-time",
    yearlySavingsPercent: 100,
    description: "One-time payment of PKR 5,999 for 100,000 AI-indexed screenshots and permanent Lifetime Pro access.",
    features: {
      maxIndexedScreenshots: 100000,
      maxAIScansPerMonth: 100000,
      maxStorageMB: 50000,
      cloudSync: true,
      advancedSearch: true,
      aiCollections: true,
      priorityProcessing: true,
    },
    featureList: [
      "PKR 5,999 one-time payment",
      "100,000 AI-indexed screenshots lifetime",
      "Permanent Lifetime Pro access",
      "No recurring subscriptions forever",
      "Advanced neural OCR & indexing",
      "Full multimodal AI understanding",
      "Encrypted cloud synchronization",
    ],
  },
};

/**
 * Configurable Founder 50 system limits (controlled by persistent database state)
 */
export const FOUNDER_BENEFIT_CONFIG = {
  MAX_FOUNDER_USERS: 50,
  PRICE_PKR: 0,
  DEFAULT_DURATION_DAYS: null as number | null, // null = Lifetime
  ENABLED: true,
};

/**
 * Authoritative Plan Limits Constants
 */
export const PLAN_LIMITS = {
  FREE_MAX_SCREENSHOTS: 250, // 250 lifetime AI-indexed screenshots on Free plan
  PRO_MONTHLY_MAX_SCREENSHOTS: 2500, // 2,500/month on Pro Monthly
  PRO_YEARLY_MAX_SCREENSHOTS: 30000, // 30,000/year on Pro Yearly
  PRO_LIFETIME_MAX_SCREENSHOTS: 100000, // 100,000 lifetime on Pro Lifetime
  FOUNDER_MAX_SCREENSHOTS: 150000, // 150,000 lifetime on Founder (Lifetime Free)
  PRO_MAX_SCREENSHOTS: 100000,
  FREE_STORAGE_MB: PLAN_CONFIG.free.features.maxStorageMB,
  PRO_STORAGE_MB: PLAN_CONFIG.pro.features.maxStorageMB,
  FREE_AI_SCANS_MONTHLY: PLAN_CONFIG.free.features.maxAIScansPerMonth,
  PRO_AI_SCANS_MONTHLY: PLAN_CONFIG.pro.features.maxAIScansPerMonth,
} as const;
