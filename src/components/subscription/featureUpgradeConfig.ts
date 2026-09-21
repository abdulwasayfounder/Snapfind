import { Layers, Cloud, Search, Zap, HardDrive, Sparkles } from "lucide-react";
import React from "react";

export type UpgradeFeatureKey =
  | "aiCollections"
  | "cloudSync"
  | "advancedSearch"
  | "priorityProcessing"
  | "aiLimit"
  | "screenshotQuota"
  | "general";

export interface UpgradeFeatureDetails {
  key: UpgradeFeatureKey;
  title: string;
  subtitle: string;
  iconName: "Layers" | "Cloud" | "Search" | "Zap" | "HardDrive" | "Sparkles";
  benefits: string[];
  isLimit?: boolean;
  limitType?: "aiScans" | "screenshots" | "storage";
}

export const FEATURE_UPGRADE_CONFIG: Record<UpgradeFeatureKey, UpgradeFeatureDetails> = {
  aiCollections: {
    key: "aiCollections",
    title: "Organize screenshots with AI",
    subtitle: "Turn thousands of screenshots into intelligent collections automatically.",
    iconName: "Layers",
    benefits: [
      "AI-powered collections",
      "Advanced search",
      "Higher processing limits",
      "Cloud sync",
    ],
  },
  cloudSync: {
    key: "cloudSync",
    title: "Sync across all your devices",
    subtitle: "Never lose a screenshot with automatic encrypted cloud backup and real-time sync.",
    iconName: "Cloud",
    benefits: [
      "Multi-device instant sync",
      "Encrypted cloud backup",
      "Cross-platform access",
      "Unlimited history",
    ],
  },
  advancedSearch: {
    key: "advancedSearch",
    title: "Search screenshots with AI reasoning",
    subtitle: "Search concepts, objects, and visual context beyond simple text matching.",
    iconName: "Search",
    benefits: [
      "Multimodal natural language search",
      "Visual object & scene recognition",
      "Instant semantic matches",
      "Zero-lag vector indexing",
    ],
  },
  priorityProcessing: {
    key: "priorityProcessing",
    title: "Instant priority processing",
    subtitle: "Bypass processing queues with high-speed parallel OCR and vision recognition.",
    iconName: "Zap",
    benefits: [
      "Sub-second OCR extraction",
      "Priority background queues",
      "High-throughput batch indexing",
      "Dedicated server infrastructure",
    ],
  },
  aiLimit: {
    key: "aiLimit",
    title: "You've reached your free monthly AI processing limit",
    subtitle: "Free tier includes 20 AI vision scans each month. Upgrade to Pro for 2,000 monthly scans.",
    iconName: "Sparkles",
    isLimit: true,
    limitType: "aiScans",
    benefits: [
      "2,000 monthly AI vision scans",
      "10,000 screenshot library capacity",
      "AI-powered collections & smart tagging",
      "Encrypted cloud backup & sync",
    ],
  },
  screenshotQuota: {
    key: "screenshotQuota",
    title: "You've reached your free screenshot limit",
    subtitle: "Free tier includes 30 indexed screenshots. Upgrade to Pro for up to 15,000+ screenshots.",
    iconName: "HardDrive",
    isLimit: true,
    limitType: "screenshots",
    benefits: [
      "Up to 15,000 – 100,000 indexed screenshots capacity",
      "Higher monthly AI processing limits",
      "Automated AI Collections",
      "Cross-device encrypted sync",
    ],
  },
  general: {
    key: "general",
    title: "Unlock SnapFind Pro",
    subtitle: "Supercharge your visual knowledge base with advanced AI, unlimited collections, and cloud sync.",
    iconName: "Sparkles",
    benefits: [
      "AI-powered collections",
      "Advanced search",
      "Higher processing limits",
      "Cloud sync",
    ],
  },
};

export function getFeatureUpgradeDetails(featureKey?: string): UpgradeFeatureDetails {
  if (!featureKey) return FEATURE_UPGRADE_CONFIG.general;
  if (featureKey in FEATURE_UPGRADE_CONFIG) {
    return FEATURE_UPGRADE_CONFIG[featureKey as UpgradeFeatureKey];
  }
  // Normalize match
  const lower = featureKey.toLowerCase();
  if (lower.includes("collection")) return FEATURE_UPGRADE_CONFIG.aiCollections;
  if (lower.includes("sync") || lower.includes("cloud")) return FEATURE_UPGRADE_CONFIG.cloudSync;
  if (lower.includes("search") || lower.includes("multimodal")) return FEATURE_UPGRADE_CONFIG.advancedSearch;
  if (lower.includes("priority") || lower.includes("speed")) return FEATURE_UPGRADE_CONFIG.priorityProcessing;
  if (lower.includes("ai") || lower.includes("scan")) return FEATURE_UPGRADE_CONFIG.aiLimit;
  if (lower.includes("quota") || lower.includes("storage") || lower.includes("limit")) return FEATURE_UPGRADE_CONFIG.screenshotQuota;
  return FEATURE_UPGRADE_CONFIG.general;
}

export function getResetDateString(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
