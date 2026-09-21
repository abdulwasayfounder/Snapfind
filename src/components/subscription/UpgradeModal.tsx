import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Shield,
  Layers,
  Cloud,
  Search,
  Zap,
  HardDrive,
  X,
  ArrowRight,
  CreditCard,
  Crown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import {
  getFeatureUpgradeDetails,
  UpgradeFeatureKey,
  getResetDateString,
} from "./featureUpgradeConfig";
import { UsageProgress } from "./UsageProgress";
import { FounderBadge } from "./FounderBadge";
import { CurrencyService, CANONICAL_PRICING_USD } from "../../services/billing/CurrencyService";
import { PaymentService } from "../../services/billing/PaymentService";
import { PaddleBillingService } from "../../services/billing/PaddleBillingService";

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  customTitle?: string;
  customSubtitle?: string;
  usageInfo?: {
    used: number;
    limit: number;
    resetDate?: string;
    unit?: string;
  };
  isDark?: boolean;
  onUpgradeSuccess?: () => void;
}

const ICON_MAP = {
  Layers,
  Cloud,
  Search,
  Zap,
  HardDrive,
  Sparkles,
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature = "general",
  customTitle,
  customSubtitle,
  usageInfo,
  isDark = true,
  onUpgradeSuccess,
}) => {
  const { user, isPro, entitlement, refreshEntitlement } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isFounder = Boolean(user?.entitlement?.isFounder || entitlement?.isFounder);
  const founderNumber = user?.entitlement?.founderNumber || entitlement?.founderNumber;

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset feedback state on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Never show paywall to founder users
  if (isFounder) {
    return (
      <AnimatePresence>
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className={`max-w-md w-full rounded-3xl p-6 sm:p-8 border text-center space-y-4 shadow-2xl relative ${
              isDark
                ? "bg-[#0F0F14] border-amber-500/30 text-white"
                : "bg-white border-amber-300 text-slate-900"
            }`}
          >
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 rounded-xl transition-all cursor-pointer ${
                isDark
                  ? "text-slate-400 hover:text-white hover:bg-white/10"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              aria-label="Close upgrade modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crown className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-center">
                <FounderBadge founderNumber={founderNumber} size="md" />
              </div>
              <h3 className="text-lg font-bold">You Have Full Lifetime Pro Access</h3>
              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                As one of SnapFind's first 50 Founder users, all AI Collections, Multimodal Search, and unlimited screenshot capacity limits are permanently unlocked for your account.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              Continue with Founder Pro
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const details = getFeatureUpgradeDetails(feature);
  const title = customTitle || details.title;
  const subtitle = customSubtitle || details.subtitle;
  const IconComponent = ICON_MAP[details.iconName] || Sparkles;

  // Pricing formatting
  const curr = CurrencyService.getPreferredCurrency();
  const monthlyPrice = CurrencyService.convertPrice(CANONICAL_PRICING_USD.PRO_MONTHLY, curr).formatted;
  const yearlyPrice = CurrencyService.convertPrice(CANONICAL_PRICING_USD.PRO_YEARLY, curr).formatted;
  const yearlyMonthlyEquivalent = CurrencyService.convertPrice(CANONICAL_PRICING_USD.PRO_YEARLY / 12, curr).formatted;

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setErrorMsg(null);
    try {
      const planKey = billingCycle === "yearly" ? "yearly" : "monthly";
      const result = await PaddleBillingService.openCheckout({
        plan: planKey,
        user,
        onError: (err) => setErrorMsg(err),
      });

      if (result.success) {
        setSuccessMsg("Opening secure Paddle checkout...");
        if (onUpgradeSuccess) onUpgradeSuccess();
      } else {
        setErrorMsg(result.error || "Secure checkout is temporarily unavailable. Please try again later.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during upgrade.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`max-w-lg w-full rounded-3xl border p-5 sm:p-7 shadow-2xl relative my-auto transition-all ${
            isDark
              ? "bg-gradient-to-b from-[#13131A] to-[#0A0A0F] border-blue-500/25 text-white shadow-blue-500/10"
              : "bg-gradient-to-b from-white to-slate-50 border-blue-200 text-slate-900 shadow-xl"
          }`}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${
              isDark
                ? "text-slate-400 hover:text-white hover:bg-white/10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            aria-label="Close upgrade modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header & Feature Icon */}
          <div className="flex items-start gap-4 pr-6">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${
                isDark
                  ? "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-400/30 text-blue-400 shadow-blue-500/15"
                  : "bg-blue-50 border-blue-200 text-blue-600 shadow-blue-500/10"
              }`}
            >
              <IconComponent className="w-6 h-6" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Sparkles className="w-3 h-3" />
                SnapFind Pro
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                {title}
              </h2>
            </div>
          </div>

          {/* Subtitle Description */}
          <p className={`text-sm mt-3 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {subtitle}
          </p>

          {/* Usage Limit Information (if applicable) */}
          {(details.isLimit || usageInfo) && (
            <div className="mt-4">
              <UsageProgress
                used={usageInfo?.used ?? (details.limitType === "aiScans" ? 20 : 500)}
                limit={usageInfo?.limit ?? (details.limitType === "aiScans" ? 20 : 500)}
                unit={usageInfo?.unit || (details.limitType === "aiScans" ? "scans" : "screenshots")}
                label="Current Free Usage"
                resetDate={usageInfo?.resetDate || getResetDateString()}
                isDark={isDark}
              />
            </div>
          )}

          {/* Benefits Grid */}
          <div className="mt-5 space-y-2.5">
            <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              What you get with Pro:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {details.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold ${
                    isDark
                      ? "bg-white/[0.03] border-white/5 text-slate-200"
                      : "bg-slate-100/70 border-slate-200/80 text-slate-800"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Selector & Pricing */}
          <div className="mt-6 p-3.5 rounded-2xl border bg-white/[0.02] border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    billingCycle === "monthly"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    billingCycle === "yearly"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Yearly</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-[10px] font-extrabold text-slate-950">
                    Save 30%
                  </span>
                </button>
              </div>

              {/* Price Tag */}
              <div className="text-right">
                <div className="text-lg font-black text-blue-400">
                  {billingCycle === "monthly" ? `$2.99/month` : `${yearlyMonthlyEquivalent}/mo`}
                </div>
                <div className="text-[11px] text-slate-400">
                  {billingCycle === "monthly" ? "Billed monthly" : `Billed annually (${yearlyPrice}/yr)`}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isDark
                  ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Not now
            </button>

            <button
              type="button"
              disabled={isUpgrading}
              onClick={handleUpgrade}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isUpgrading ? (
                <span>Processing Upgrade...</span>
              ) : (
                <>
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] text-slate-500">
              Cancel anytime in Settings. 7-day money-back guarantee.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
