import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, Sparkles, Check, ArrowRight, X, Shield, Zap, Cloud } from "lucide-react";
import { SubscriptionManager } from "../../services/billing/SubscriptionManager";
import { CurrencyService, CANONICAL_PRICING_USD } from "../../services/billing/CurrencyService";
import { useFounder } from "../../context/FounderContext";
import { UserProfile } from "../../types";

interface SignupUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPricing: () => void;
  user?: UserProfile | null;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
  onFounderClaimed?: () => void;
  isDark?: boolean;
}

export const SignupUpgradeModal: React.FC<SignupUpgradeModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPricing,
  user,
  addToast,
  onFounderClaimed,
  isDark = true,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const founderStats = useFounder();
  const [founderInfo, setFounderInfo] = useState<{
    claimedSpots: number;
    totalSpots: number;
    remainingSpots: number;
    isAvailable: boolean;
  }>({
    claimedSpots: founderStats.claimed,
    totalSpots: founderStats.totalSpots || 50,
    remainingSpots: founderStats.remaining,
    isAvailable: founderStats.isAvailable,
  });

  const isFounder = Boolean(user?.entitlement?.isFounder || user?.plan === "Founder");
  const founderNumber = user?.entitlement?.founderNumber;

  useEffect(() => {
    if (!isOpen) return;

    // Fetch live founder availability status directly from authoritative endpoints
    fetch("/api/billing/founder-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const total = data.totalSpots || 50;
          const claimed = typeof data.claimedSpots === "number" ? data.claimedSpots : typeof data.claimed === "number" ? data.claimed : 0;
          const remaining = Math.max(0, total - claimed);
          setFounderInfo({
            claimedSpots: claimed,
            totalSpots: total,
            remainingSpots: remaining,
            isAvailable: remaining > 0 || isFounder,
          });
        }
      })
      .catch((err) => {
        console.warn("[SignupUpgradeModal] Error fetching founder status:", err);
      });
  }, [isOpen, isFounder]);

  const handleClaimFounder = async () => {
    if (!user || user.id === "guest" || user.id.startsWith("local-guest")) {
      addToast?.({
        title: "Sign-In Required",
        description: "Please create an account or sign in to claim your Founder 50 spot.",
        type: "error",
      });
      return;
    }

    try {
      setIsClaiming(true);
      const res = await SubscriptionManager.claimFounder(user.id);

      if (res.success && res.entitlement) {
        addToast?.({
          title: "👑 Founder Status Activated!",
          description: `Congratulations! You are officially Founder #${res.founderNumber || "50"} with complimentary Lifetime Pro access.`,
          type: "success",
        });
        if (onFounderClaimed) onFounderClaimed();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        addToast?.({
          title: "Founder Allocation Full",
          description: res.error || "Founder spots have been fully allocated. You can upgrade to Pro anytime!",
          type: "info",
        });
      }
    } catch (err: any) {
      addToast?.({
        title: "Claim Failed",
        description: err.message || "Failed to claim founder position.",
        type: "error",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[#0F111A] border border-blue-500/30 text-white shadow-2xl shadow-blue-500/10"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 right-0 w-60 h-60 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition z-10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8 space-y-6 relative z-10">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-blue-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wide">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>WELCOME TO SNAPFIND AI</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {isFounder ? (
                  "Welcome, Founding Pioneer!"
                ) : founderInfo.remainingSpots > 0 ? (
                  <>
                    Claim Your Free <span className="text-amber-400">Founder 50</span> Lifetime Spot
                  </>
                ) : (
                  "Choose Your SnapFind AI Plan"
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                {isFounder
                  ? `Your account is permanently upgraded with Lifetime Pro as Founder #${founderNumber || "VIP"}.`
                  : founderInfo.remainingSpots > 0
                  ? "As one of our first 50 pioneer members, you are eligible for 100% free Lifetime Pro access with an official Crown tag!"
                  : "Supercharge your workflow with instant OCR, multimodal Gemini AI search, and cloud sync."}
              </p>
            </div>

            {/* Founder 50 Special Promotion Box */}
            {!isFounder && founderInfo.remainingSpots > 0 ? (
              <div className="rounded-2xl p-5 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border border-amber-400/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-amber-200">First 50 Users Offer</div>
                      <div className="text-xs text-amber-400/80">Lifetime Pro · $0 Forever</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {founderInfo.claimedSpots} / {founderInfo.totalSpots} claimed
                    </span>
                    <div className="w-20 bg-slate-900 rounded-full h-1.5 mt-1 overflow-hidden border border-amber-400/30">
                      <div
                        className="bg-amber-400 h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (founderInfo.claimedSpots / founderInfo.totalSpots) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Advantages List */}
                <div className="space-y-2 pt-1 border-t border-amber-400/20">
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Founder 50 Advantages
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>👑 Official Founder Crown Tag on account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>💎 100% Free Lifetime Pro ($39.99 value)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>🚀 Unlimited indexed screenshot quota</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>🧠 Gemini Multimodal Vision AI</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>☁️ Multi-device encrypted cloud sync</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>🛡️ Zero subscription fees forever</span>
                    </li>
                  </ul>
                </div>

                {/* Claim Button */}
                <button
                  onClick={handleClaimFounder}
                  disabled={isClaiming}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <Crown className="w-4 h-4" />
                  <span>{isClaiming ? "Securing Founder Spot..." : "Claim Free Founder 👑 Lifetime Spot"}</span>
                </button>
              </div>
            ) : isFounder ? (
              <div className="rounded-2xl p-5 bg-gradient-to-r from-amber-500/20 to-blue-500/20 border border-amber-400/40 text-center space-y-3">
                <Crown className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-lg font-black text-amber-300">
                  Founder 👑 VIP #{founderNumber || "50"} Active
                </div>
                <p className="text-xs text-slate-300">
                  Your account enjoys permanent Lifetime Pro access. You will never be asked to pay or subscribe.
                </p>
              </div>
            ) : null}

            {/* Plan Overview & Pricing Page Lead */}
            <div className="rounded-2xl p-4 bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-white">SnapFind AI Plans Available:</span>
                <span className="text-slate-400">Free · Pro ($2.99/mo or $24.99/yr) · Lifetime ($39.99)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="font-bold text-white">Free</div>
                  <div className="text-[11px] text-slate-400">100 items</div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-900/40 border border-blue-500/30">
                  <div className="font-bold text-blue-300">Pro</div>
                  <div className="text-[11px] text-slate-300">$2.99 / mo</div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-900/40 border border-purple-500/30">
                  <div className="font-bold text-purple-300">Lifetime</div>
                  <div className="text-[11px] text-slate-300">$39.99 once</div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToPricing();
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <span>View Full Pricing & Plans</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs sm:text-sm transition duration-200 cursor-pointer"
              >
                Continue to App
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
