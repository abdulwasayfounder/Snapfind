import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { SubscriptionManager, PLAN_LIMITS } from "../services/billing/SubscriptionManager";
import { UpgradeFeatureKey } from "../components/subscription/featureUpgradeConfig";
import { FeatureKey } from "../types";

export interface UpgradePromptContext {
  feature?: UpgradeFeatureKey | string;
  title?: string;
  subtitle?: string;
  usageInfo?: {
    used: number;
    limit: number;
    resetDate?: string;
    unit?: string;
  };
}

/**
 * Central Authoritative Entitlement Hook
 * All subscription & upgrade checks throughout the app route through this hook.
 */
export function useEntitlement() {
  const { user, entitlement, isPro, refreshEntitlement } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activePromptContext, setActivePromptContext] = useState<UpgradePromptContext>({
    feature: "general",
  });

  const isFounder = Boolean(user?.entitlement?.isFounder || entitlement?.isFounder);
  const founderNumber = user?.entitlement?.founderNumber || entitlement?.founderNumber;
  const tier = isFounder ? "Founder" : isPro ? "Pro" : "Free";
  const plan = isFounder ? "founder" : isPro ? "pro" : "free";

  /**
   * Check if a feature is unlocked.
   * If not unlocked, returns false and optionally prompts the contextual upgrade modal.
   */
  const checkFeature = useCallback(
    (feature: FeatureKey | UpgradeFeatureKey, autoPrompt: boolean = false): boolean => {
      // Founders and Pro users have all features unlocked
      if (isFounder || isPro) return true;

      const has = SubscriptionManager.hasFeature(user?.id, feature as FeatureKey);
      if (!has && autoPrompt) {
        setActivePromptContext({
          feature: feature as UpgradeFeatureKey,
        });
        setIsUpgradeModalOpen(true);
      }
      return has;
    },
    [isFounder, isPro, user?.id]
  );

  /**
   * Programmatically open the contextual upgrade modal with specific copy and benefits
   */
  const promptUpgrade = useCallback(
    (context?: UpgradePromptContext | UpgradeFeatureKey | string) => {
      // Never prompt Founders
      if (isFounder) return;

      if (typeof context === "string") {
        setActivePromptContext({ feature: context });
      } else if (context && typeof context === "object") {
        setActivePromptContext(context);
      } else {
        setActivePromptContext({ feature: "general" });
      }
      setIsUpgradeModalOpen(true);
    },
    [isFounder]
  );

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  return {
    isPro: isPro || isFounder,
    isFounder,
    founderNumber,
    tier,
    plan,
    entitlement,
    checkFeature,
    promptUpgrade,
    isUpgradeModalOpen,
    activePromptContext,
    closeUpgradeModal,
    refreshEntitlement,
    PLAN_LIMITS,
  };
}
