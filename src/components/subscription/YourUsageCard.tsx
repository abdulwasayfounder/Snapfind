import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  HardDrive,
  Layers,
  Cloud,
  CloudCheck,
  Calendar,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Crown,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem, UserProfile } from "../../types";
import { UsageService, UsageMetrics } from "../../services/billing/UsageService";
import { ProBadge } from "./ProBadge";
import { FounderBadge } from "./FounderBadge";
import { useEntitlement } from "../../hooks/useEntitlement";

interface YourUsageCardProps {
  screenshots?: ScreenshotItem[];
  user?: UserProfile | null;
  isDark?: boolean;
  onOpenUpgrade?: (featureKey?: string) => void;
  onSyncNow?: () => void;
  compact?: boolean;
  className?: string;
  showDetailedBreakdown?: boolean;
}

export const YourUsageCard: React.FC<YourUsageCardProps> = ({
  screenshots = [],
  user,
  isDark = false,
  onOpenUpgrade,
  onSyncNow,
  compact = false,
  className = "",
  showDetailedBreakdown = false,
}) => {
  const { entitlement, isPro, isFounder, promptUpgrade } = useEntitlement();
  const [metrics, setMetrics] = useState<UsageMetrics>(() =>
    UsageService.computeMetrics(screenshots, user?.id)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Compute live metrics when screenshots, user, or entitlements change
  useEffect(() => {
    const updated = UsageService.computeMetrics(screenshots, user?.id);
    setMetrics(updated);

    // Subscribe to background usage updates
    const unsubscribe = UsageService.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    return () => unsubscribe();
  }, [screenshots, user?.id, entitlement]);

  // Initial and manual sync with authoritative server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const serverData = await UsageService.syncWithServer(user?.id);
      if (serverData) {
        const updated = UsageService.computeMetrics(screenshots, user?.id, serverData.usage);
        setMetrics(updated);
      }
    } catch (err) {
      console.warn("Usage sync failed:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleUpgradeClick = () => {
    if (onOpenUpgrade) {
      onOpenUpgrade("aiScans");
    } else {
      promptUpgrade({
        feature: "aiScans",
        title: "Higher Processing Limits & Storage",
        subtitle:
          "Upgrade to SnapFind Pro for unlimited indexed screenshots, unlimited AI vision analyses, and encrypted multi-device cloud storage.",
      });
    }
  };

  // Status Colors for Progress Bars
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-rose-500 text-rose-500";
    if (percent >= 75) return "bg-amber-500 text-amber-500";
    return "bg-emerald-500 text-emerald-500";
  };

  const getProgressBg = (percent: number) => {
    if (percent >= 90) return isDark ? "bg-rose-950/40" : "bg-rose-50";
    if (percent >= 75) return isDark ? "bg-amber-950/40" : "bg-amber-50";
    return isDark ? "bg-emerald-950/40" : "bg-emerald-50";
  };

  return (
    <div
      id="your-usage-card"
      className={`rounded-2xl border transition-all ${
        isDark
          ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl shadow-black/20"
          : "bg-white border-slate-200/80 text-slate-800 shadow-sm hover:shadow-md"
      } ${compact ? "p-4" : "p-6"} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
            }`}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Your usage</h2>
              {isFounder ? (
                <FounderBadge founderNumber={metrics.founderNumber} size="sm" isDark={isDark} />
              ) : isPro ? (
                <ProBadge size="sm" isDark={isDark} />
              ) : (
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    isDark
                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  Free Plan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authoritative capacity and monthly limits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            title="Refresh authoritative server usage"
            disabled={isRefreshing}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              isDark
                ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Grid of Usage Metrics */}
      <div className="space-y-4">
        {/* Metric 1: AI Analysis */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>AI Analysis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-white">
                {metrics.aiAnalysesUsed.toLocaleString()}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {metrics.aiAnalysesLimit.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({metrics.aiAnalysesPercent}%)
              </span>
            </div>
          </div>

          {/* Visual Progress Bar (Character / Continuous Representation) */}
          <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.aiAnalysesPercent)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${
                metrics.aiAnalysesPercent >= 90
                  ? "bg-rose-500"
                  : metrics.aiAnalysesPercent >= 75
                  ? "bg-amber-500"
                  : "bg-indigo-500"
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>
              {metrics.aiAnalysesRemaining > 0
                ? `${metrics.aiAnalysesRemaining.toLocaleString()} scans remaining`
                : "Monthly limit reached"}
            </span>
            <span>Resets on {metrics.nextResetDateFormatted}</span>
          </div>
        </div>

        {/* Metric 2: Storage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
              <span>Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-white">
                {metrics.storageUsedFormatted}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {metrics.storageLimitFormatted}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({metrics.storagePercent}%)
              </span>
            </div>
          </div>

          <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.storagePercent)}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className={`h-full rounded-full ${
                metrics.storagePercent >= 90
                  ? "bg-rose-500"
                  : metrics.storagePercent >= 75
                  ? "bg-amber-500"
                  : "bg-cyan-500"
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>{metrics.storageRemainingFormatted} available space</span>
            <span>Local vault & cache</span>
          </div>
        </div>

        {/* Metric 3: Indexed Screenshots */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>AI-indexed screenshots</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-white">
                {metrics.screenshotsIndexed.toLocaleString()}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {metrics.screenshotsLimit.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({metrics.screenshotsPercent}%)
              </span>
            </div>
          </div>

          <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.screenshotsPercent)}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className={`h-full rounded-full ${
                metrics.screenshotsPercent >= 100
                  ? "bg-rose-500"
                  : metrics.screenshotsPercent >= 80
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>
              {metrics.screenshotsRemaining > 0
                ? `${metrics.screenshotsRemaining.toLocaleString()} AI-indexed screenshots remaining`
                : "You've reached your plan's AI-indexing limit"}
            </span>
            <span>Multimodal visual memory</span>
          </div>

          {metrics.screenshotsPercent >= 100 && (
            <div className="mt-2 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between">
              <span>You've reached your plan's AI-indexing limit ({metrics.screenshotsIndexed} / {metrics.screenshotsLimit} used).</span>
              {!isPro && (
                <button
                  onClick={handleUpgradeClick}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}
        </div>

        {/* Metric 4: Cloud Sync Usage */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            isDark ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50/70 border-slate-200/70"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                metrics.isCloudSyncEnabled
                  ? isDark
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-emerald-50 text-emerald-600"
                  : isDark
                  ? "bg-slate-700 text-slate-400"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Cloud Sync</span>
                {metrics.isCloudSyncEnabled ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                    Pro Only
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {metrics.isCloudSyncEnabled
                  ? `${metrics.cloudSyncCount} / ${metrics.cloudSyncTotal} screenshots synced to encrypted cloud`
                  : "Local-only storage. Upgrade to sync across devices."}
              </p>
            </div>
          </div>

          {metrics.isCloudSyncEnabled && onSyncNow && (
            <button
              onClick={onSyncNow}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
              }`}
            >
              Sync Now
            </button>
          )}
        </div>
      </div>

      {/* Quota Integrity & Reset Date Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            Next reset:{" "}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
              {metrics.nextResetDateFormatted}
            </strong>{" "}
            ({metrics.daysUntilReset} {metrics.daysUntilReset === 1 ? "day" : "days"} left)
          </span>
        </div>

        {/* Free Plan Upgrade Callout */}
        {!isPro && (
          <button
            onClick={handleUpgradeClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade to Pro (PKR 249/mo)</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Pro / Founder Verified Badge */}
        {isPro && (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isFounder ? "Founder VIP Entitlement Active" : "Pro Capacity Active (10,000 items)"}
            </span>
          </div>
        )}
      </div>

      {/* Honest Capacity Note */}
      <div className="mt-2.5 pt-2 border-t border-slate-100/60 dark:border-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
        <Info className="w-3 h-3 shrink-0" />
        <span>
          Usage metrics are synchronized with authoritative server records. Offline actions are
          securely queued and reconciled automatically.
        </span>
      </div>
    </div>
  );
};
