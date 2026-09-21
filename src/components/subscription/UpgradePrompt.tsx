import React from "react";
import { UpgradeModal, UpgradeModalProps } from "./UpgradeModal";
import { FeatureLockedCard, FeatureLockedCardProps } from "./FeatureLockedCard";
import { UsageLimitBanner, UsageLimitBannerProps } from "./UsageLimitBanner";
import { ProBadge, ProBadgeProps } from "./ProBadge";
import { FounderBadge, FounderBadgeProps } from "./FounderBadge";
import { UsageProgress, UsageProgressProps } from "./UsageProgress";
import {
  FEATURE_UPGRADE_CONFIG,
  getFeatureUpgradeDetails,
  UpgradeFeatureKey,
} from "./featureUpgradeConfig";

export {
  UpgradeModal,
  FeatureLockedCard,
  UsageLimitBanner,
  ProBadge,
  FounderBadge,
  UsageProgress,
  FEATURE_UPGRADE_CONFIG,
  getFeatureUpgradeDetails,
};
export type {
  UpgradeModalProps,
  FeatureLockedCardProps,
  UsageLimitBannerProps,
  ProBadgeProps,
  FounderBadgeProps,
  UsageProgressProps,
  UpgradeFeatureKey,
};

export interface UpgradePromptProps extends UpgradeModalProps {}

/**
 * SnapFind AI UpgradePrompt Component
 * Contextual upgrade modal with feature-specific messaging, Pro/Founder badges, and usage meters.
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = (props) => {
  return <UpgradeModal {...props} />;
};
