import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  HardDrive,
  Layers,
  Sparkles,
  Cloud,
  Calendar,
  ShieldCheck,
  RefreshCw,
  PieChart,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem, UserProfile } from "../../types";
import { UsageService, UsageMetrics } from "../../services/billing/UsageService";
import { YourUsageCard } from "./YourUsageCard";
import { ProBadge } from "./ProBadge";
import { FounderBadge } from "./FounderBadge";
import { useEntitlement } from "../../hooks/useEntitlement";

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshots: ScreenshotItem[];
  user?: UserProfile | null;
  isDark?: boolean;
  onOpenUpgrade?: () => void;
}

export const UsageModal: React.FC<UsageModalProps> = ({
  isOpen,
  onClose,
  screenshots,
  user,
  isDark = false,
  onOpenUpgrade,
}) => {
  const { isPro, isFounder, entitlement } = useEntitlement();
  const metrics = UsageService.computeMetrics(screenshots, user?.id);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Category breakdown calculation
  const categoryStats = React.useMemo(() => {
    const stats: Record<string, { count: number; bytes: number }> = {};
    screenshots.forEach((item) => {
      if ((item as any).isDeleted || (item as any).is_deleted) return;
      const cat = item.category || "Uncategorized";
      if (!stats[cat]) stats[cat] = { count: 0, bytes: 0 };
      stats[cat].count += 1;
      const textLen = (item.fullText || "").length + (item.summary || "").length;
      stats[cat].bytes += 350 * 1024 + textLen * 2 + 1024;
    });
    return Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
  }, [screenshots]);

  const handleExportAudit = () => {
    setDownloading(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        deviceId: UsageService.getDeviceId(),
        userTier: metrics.tierName,
        entitlement,
        metrics,
        categoryBreakdown: categoryStats.map(([cat, val]) => ({
          category: cat,
          count: val.count,
          estimatedBytes: val.bytes,
          formattedSize: UsageService.formatBytes(val.bytes),
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snapfind-usage-audit-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden z-10 my-8 ${
            isDark
              ? "bg-slate-900 border-slate-800 text-slate-100"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Usage & Quota Breakdown</h3>
                  {isFounder ? (
                    <FounderBadge founderNumber={metrics.founderNumber} size="sm" isDark={isDark} />
                  ) : isPro ? (
                    <ProBadge size="sm" isDark={isDark} />
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transparent capacity limits & storage utilization
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark
                  ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Embedded Your Usage Card */}
            <YourUsageCard
              screenshots={screenshots}
              user={user}
              isDark={isDark}
              onOpenUpgrade={onOpenUpgrade}
              showDetailedBreakdown={true}
            />

            {/* Storage Breakdown by Category */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <PieChart className="w-4 h-4 text-indigo-500" />
                <span>Storage Breakdown by Category</span>
              </h4>

              {categoryStats.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                  No screenshots indexed yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categoryStats.slice(0, 6).map(([cat, val]) => (
                    <div
                      key={cat}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isDark
                          ? "bg-slate-800/40 border-slate-700/60"
                          : "bg-slate-50/80 border-slate-200/70"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {cat}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {val.count} {val.count === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                        {UsageService.formatBytes(val.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anti-Tampering & Synchronization Notice */}
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                isDark
                  ? "bg-slate-800/30 border-slate-700/50 text-slate-300"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Authoritative Quota Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                SnapFind AI enforces real server-side capacity counters linked to your persistent
                device token and account. Reinstalling or clearing cache seamlessly restores your
                usage status without disrupting local OCR offline capabilities.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              onClick={handleExportAudit}
              disabled={downloading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Exporting..." : "Export Usage Audit"}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
