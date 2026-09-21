import React, { useState } from "react";
import {
  Check,
  Crown,
  ShieldCheck,
  RefreshCw,
  Infinity as InfinityIcon,
  Sparkles,
  Gem,
  Zap,
  Lock,
  Star,
  Activity,
  AlertCircle,
  Clock,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFounder } from "../context/FounderContext";
import { PaddleBillingService } from "../services/billing/PaddleBillingService";
import { PaddlePlanKey } from "../services/billing/paddleConfig";
import { PaymentHistoryCard } from "./subscription/PaymentHistoryCard";
import { AdminPaymentRequestsModal } from "./admin/AdminPaymentRequestsModal";
import { PageHeroHeader } from "./PageHeroHeader";
import { NavViewType } from "./BottomNavigation";

interface PricingPageViewProps {
  isDark?: boolean;
  onNavigate?: (view: NavViewType) => void;
  onOpenAuth?: () => void;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

type BillingFilter = "all" | "monthly" | "yearly" | "lifetime";

export const PricingPageView: React.FC<PricingPageViewProps> = ({
  isDark = true,
  onNavigate,
  onOpenAuth,
  addToast,
}) => {
  const { user, isPro, refreshEntitlement } = useAuth();
  const {
    claimed: spotsClaimed,
    totalSpots: totalFounderSpots,
    remaining: spotsRemaining,
    isLive,
    claimFounderSpot,
    refreshFounderStats,
  } = useFounder();

  const [billingTab, setBillingTab] = useState<BillingFilter>("all");
  const [openingCheckoutPlan, setOpeningCheckoutPlan] = useState<PaddlePlanKey | null>(null);
  const [isClaimingFounder, setIsClaimingFounder] = useState(false);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  const [authModalPlanName, setAuthModalPlanName] = useState<string>("Pro");
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Dynamic user plan calculation from authoritative state
  const isFounder = Boolean(
    user?.entitlement?.isFounder ||
      user?.plan === "Founder" ||
      user?.entitlement?.plan === "founder" ||
      user?.entitlement?.tier === "Founder" ||
      (user as any)?.tier === "Founder"
  );
  const founderNumber = user?.entitlement?.founderNumber;
  const activePlanType = user?.entitlement?.plan || user?.plan?.toLowerCase() || (isFounder ? "founder" : isPro ? "pro" : "free");

  const isPaidMonthlyPro = Boolean(isPro && !isFounder && activePlanType === "monthly");
  const isPaidYearlyPro = Boolean(isPro && !isFounder && activePlanType === "yearly");
  const isPaidLifetimePro = Boolean(isPro && !isFounder && (activePlanType === "lifetime" || activePlanType === "pro"));
  const isFreeUser = !isPro && !isFounder;

  const isAdmin =
    user?.email?.toLowerCase().trim() === "ash.mary.2006@gmail.com" ||
    user?.role === "admin" ||
    (user as any)?.user_metadata?.role === "admin" ||
    (user as any)?.app_metadata?.role === "admin";

  // Canonical pricing definitions
  const monthlyPrice = 249;
  const yearlyPrice = 1999;
  const lifetimePrice = 5999;
  const founderPrice = 0;
  const yearlySavings = monthlyPrice * 12 - yearlyPrice; // 989 PKR savings

  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [comingSoonPlanName, setComingSoonPlanName] = useState<string>("Pro Plan");

  // Founder seat copy based on real database state
  const founderSeatAvailabilityLabel =
    spotsRemaining > 0
      ? `${spotsRemaining} Founder Seat${spotsRemaining === 1 ? "" : "s"} Available`
      : "Founder Seats Sold Out";

  /**
   * Handle click on Paid Plans (Coming Soon)
   */
  const handlePaidPlanClick = (planName: string) => {
    setComingSoonPlanName(planName);
    setShowComingSoonModal(true);
  };

  /**
   * 1-Click Free Founder Claim (No payment required, strictly 50 seats)
   */
  const handleClaimFreeFounder = async () => {
    if (!user || !user.id || user.id === "guest" || user.id.startsWith("local-guest")) {
      setAuthModalPlanName("Founder 50 Plan (Lifetime Free)");
      setShowAuthRequiredModal(true);
      return;
    }

    if (isFounder) {
      addToast?.({
        title: "Founder Status Active",
        description: `You are already verified as Founder #${founderNumber || 1} with permanent Lifetime Free Pro access.`,
        type: "success",
      });
      return;
    }

    if (spotsRemaining <= 0) {
      addToast?.({
        title: "Founder Seats Sold Out",
        description: "All 50 Founder seats have been claimed. You can choose the Pro Lifetime or Pro Yearly plan.",
        type: "info",
      });
      return;
    }

    try {
      setIsClaimingFounder(true);
      const result = await claimFounderSpot(user.id);
      if (result.success) {
        await refreshEntitlement();
        await refreshFounderStats();
        addToast?.({
          title: "👑 Founder Seat Claimed!",
          description: result.message || `Congratulations! You are officially Founder #${result.founderNumber || 1} with free lifetime Pro access!`,
          type: "success",
        });
      } else {
        addToast?.({
          title: "Founder Claim Notice",
          description: result.error || "Could not claim Founder seat at this time.",
          type: "error",
        });
      }
    } catch (err: any) {
      console.error("[PricingPage] Founder claim error:", err);
      addToast?.({
        title: "Claim Error",
        description: err.message || "Failed to claim Founder seat. Please try again.",
        type: "error",
      });
    } finally {
      setIsClaimingFounder(false);
    }
  };

  /**
   * Real Paddle Checkout Flow for Paid Plans
   */
  const handlePaddleCheckout = async (plan: PaddlePlanKey, planName: string) => {
    if (plan === "founder") {
      handleClaimFreeFounder();
      return;
    }

    // 1. Check if user is authenticated
    if (!user || !user.id || user.id === "guest" || user.id.startsWith("local-guest")) {
      setAuthModalPlanName(planName);
      setShowAuthRequiredModal(true);
      return;
    }

    // 2. Prevent purchasing already active permanent plans
    if (isFounder) {
      addToast?.({
        title: "Founder Status Active",
        description: `You are verified as Founder #${founderNumber || 1} with permanent Lifetime Free Pro access.`,
        type: "success",
      });
      return;
    }

    if (isPaidLifetimePro && (plan === "monthly" || plan === "yearly")) {
      addToast?.({
        title: "Lifetime Pro Active",
        description: "You already have permanent Lifetime Pro access and do not need a recurring subscription.",
        type: "info",
      });
      return;
    }

    try {
      setOpeningCheckoutPlan(plan);

      const result = await PaddleBillingService.openCheckout({
        plan,
        user,
        onError: (errMessage) => {
          addToast?.({
            title: "Checkout Notice",
            description: errMessage || "Secure checkout is temporarily unavailable. Please try again later.",
            type: "error",
          });
        },
      });

      if (!result.success) {
        if (result.requiresAuth) {
          setAuthModalPlanName(planName);
          setShowAuthRequiredModal(true);
        } else {
          addToast?.({
            title: "Checkout Unavailable",
            description: result.error || "Secure checkout is temporarily unavailable. Please try again later.",
            type: "error",
          });
        }
      }
    } catch (err: any) {
      console.error("[PricingPage] Checkout open exception:", err);
      addToast?.({
        title: "Checkout Error",
        description: "Secure checkout is temporarily unavailable. Please try again later.",
        type: "error",
      });
    } finally {
      setOpeningCheckoutPlan(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-12 pb-20 text-[#F8FAFC]">
      {/* 1. Standard Page Hero Header */}
      <PageHeroHeader
        type="pricing"
        title="Plans & Pricing"
        description="Capture, index, and instantly find your visual memory with on-device OCR and AI search."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/20 text-xs font-bold text-[#CCFF00]">
            <Sparkles className="w-3 h-3" /> All Plans
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] bg-[#0D1117] px-3 py-1.5 rounded-xl border border-white/[0.08]">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF66]"></span>
              </span>
              <span>{isLive ? "Live Realtime Sync" : "Authoritative Sync"}</span>
            </div>
            {isAdmin && (
              <button
                id="admin-review-payments-btn"
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#121821] hover:bg-[#182230] text-[#F8FAFC] border border-white/[0.08] transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
                <span>Admin Review</span>
              </button>
            )}
          </div>
        }
        isDark={isDark}
      />

      {/* 2. Active User Current Plan Status Banner */}
      {user && user.id !== "guest" && (
        <div
          id="current-plan-status-bar"
          className="max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#0D1117] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xl"
        >
          <div className="flex items-center gap-3.5">
            {isFounder ? (
              <div className="w-11 h-11 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00] shrink-0">
                <Crown className="w-6 h-6" />
              </div>
            ) : isPaidLifetimePro ? (
              <div className="w-11 h-11 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66] shrink-0">
                <Gem className="w-6 h-6" />
              </div>
            ) : isPaidYearlyPro || isPaidMonthlyPro ? (
              <div className="w-11 h-11 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66] shrink-0">
                <Zap className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#121821] border border-white/[0.08] flex items-center justify-center text-[#94A3B8] shrink-0">
                <InfinityIcon className="w-6 h-6" />
              </div>
            )}

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">
                  {isFounder
                    ? `👑 Founder #${founderNumber || 1}`
                    : isPaidLifetimePro
                    ? "💎 Pro Lifetime"
                    : isPaidYearlyPro
                    ? "⚡ Pro Yearly"
                    : isPaidMonthlyPro
                    ? "⚡ Pro Monthly"
                    : "Free Plan"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isFounder
                      ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/30"
                      : isPro
                      ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30"
                      : "bg-[#121821] text-[#94A3B8] border border-white/[0.08]"
                  }`}
                >
                  {isFounder ? "Permanent Founder VIP" : isPro ? "Active Pro" : "Active Plan"}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {isFounder
                  ? "150,000 AI-indexed screenshots • Lifetime Free Founder VIP • AI Multimodal Search"
                  : isPaidLifetimePro
                  ? "100,000 AI-indexed screenshots • Permanent Pro • AI Multimodal Search"
                  : isPaidYearlyPro
                  ? "30,000 AI-indexed screenshots/year • Priority AI Vision • Cloud Sync"
                  : isPaidMonthlyPro
                  ? "2,500 AI-indexed screenshots/month • AI Multimodal Search • Cloud Sync"
                  : "250 lifetime AI-indexed screenshots • On-device OCR • Basic search"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {isFounder ? (
              <span className="text-[#CCFF00] flex items-center gap-1.5 bg-[#CCFF00]/10 px-3 py-1.5 rounded-xl border border-[#CCFF00]/20">
                <Crown className="w-3.5 h-3.5" />
                Permanent Founder VIP
              </span>
            ) : isPro ? (
              <span className="text-[#00FF66] flex items-center gap-1.5 bg-[#00FF66]/10 px-3 py-1.5 rounded-xl border border-[#00FF66]/20">
                <Check className="w-3.5 h-3.5" />
                Active Pro
              </span>
            ) : (
              <span className="text-[#94A3B8] bg-[#121821] px-3 py-1.5 rounded-xl border border-white/[0.08]">
                250 Lifetime AI-Indexed Screenshots Quota
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Billing Selector Filter Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-[#0D1117] border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setBillingTab("all")}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              billingTab === "all"
                ? "bg-[#CCFF00] text-[#07090D] font-bold shadow-md shadow-[#CCFF00]/10"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            All Plans
          </button>
          <button
            type="button"
            onClick={() => setBillingTab("monthly")}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              billingTab === "monthly"
                ? "bg-[#CCFF00] text-[#07090D] font-bold shadow-md shadow-[#CCFF00]/10"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingTab("yearly")}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              billingTab === "yearly"
                ? "bg-[#CCFF00] text-[#07090D] font-bold shadow-md shadow-[#CCFF00]/10"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            <span>Yearly</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                billingTab === "yearly" ? "bg-black/20 text-[#07090D] font-black" : "bg-[#00FF66]/20 text-[#00FF66]"
              }`}
            >
              Save PKR {yearlySavings.toLocaleString()}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBillingTab("lifetime")}
            className={`px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer ${
              billingTab === "lifetime"
                ? "bg-[#CCFF00] text-[#07090D] font-bold shadow-md shadow-[#CCFF00]/10"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Lifetime &amp; Founder
          </button>
        </div>
      </div>

      {/* 4. Complete Plans Grid: ALL 5 Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* ================= PLAN 1: FREE ================= */}
        {(billingTab === "all" || billingTab === "monthly") && (
          <div
            id="plan-card-free"
            className={`flex flex-col justify-between rounded-3xl p-6 sm:p-7 border bg-[#0D1117] transition-all relative ${
              isFreeUser
                ? "border-white/30 ring-1 ring-white/20 shadow-xl"
                : "border-white/[0.08] hover:border-white/20"
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">FREE</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Best for trying SnapFind</p>
                </div>
                {isFreeUser && (
                  <span className="px-2.5 py-1 rounded-md bg-[#121821] border border-white/[0.08] text-[10px] font-bold text-[#94A3B8]">
                    ✓ Current Plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-white">PKR 0</div>
                <p className="text-xs text-[#94A3B8]">Free forever • No credit card required</p>
              </div>

              {/* Benefits */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Included Benefits</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">250 lifetime AI-indexed screenshots</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>On-device OCR text extraction</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Natural language &amp; visual search</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Collections &amp; smart albums</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Trash &amp; restore management</span>
                  </li>
                </ul>
              </div>

              {/* Limitations */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Plan Limit</p>
                <ul className="space-y-1.5 text-xs text-[#64748B]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>250 lifetime AI-indexed screenshots limit</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6">
              {isFreeUser ? (
                <button
                  id="free-plan-current-btn"
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#121821] border border-white/[0.08] text-[#94A3B8] text-xs font-bold text-center cursor-default"
                >
                  ✓ Current Plan
                </button>
              ) : (
                <button
                  id="switch-to-free-btn"
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate("gallery");
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#121821] hover:bg-[#182230] border border-white/[0.08] text-[#F8FAFC] text-xs font-bold transition cursor-pointer"
                >
                  Included in Your Account
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= PLAN 2: PRO MONTHLY ================= */}
        {(billingTab === "all" || billingTab === "monthly") && (
          <div
            id="plan-card-pro-monthly"
            className={`flex flex-col justify-between rounded-3xl p-6 sm:p-7 border bg-[#0D1117] transition-all relative ${
              isPaidMonthlyPro
                ? "border-[#00FF66]/70 ring-1 ring-[#00FF66]/40 shadow-xl"
                : "border-white/[0.08] hover:border-[#00FF66]/40 shadow-md"
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">PRO MONTHLY</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-[#00FF66] mt-0.5">Best for flexible monthly usage</p>
                </div>
                {isPaidMonthlyPro && (
                  <span className="px-2.5 py-1 rounded-md bg-[#00FF66]/20 border border-[#00FF66]/30 text-[10px] font-bold text-[#00FF66]">
                    ✓ Current Plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">PKR {monthlyPrice.toLocaleString()}</span>
                  <span className="text-xs text-[#94A3B8]">/ month</span>
                </div>
                <p className="text-xs text-[#94A3B8]">Recurring monthly • Cancel anytime</p>
              </div>

              {/* Benefits */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Pro Monthly Features</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">2,500 AI-indexed screenshots / month</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Natural language multimodal AI search</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Advanced search filters &amp; date range</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>QR, Barcode &amp; URL auto-intelligence</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Cloud sync &amp; multi-device backup</span>
                  </li>
                </ul>
              </div>

              {/* Limitations */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Billing Terms</p>
                <ul className="space-y-1.5 text-xs text-[#64748B]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>2,500 AI-indexed screenshots per month quota</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>Recurring monthly billing</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6">
              {isPaidMonthlyPro ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#00FF66]/15 border border-[#00FF66]/30 text-[#00FF66] text-xs font-bold text-center cursor-default"
                >
                  ✓ Current Plan Active
                </button>
              ) : (
                <button
                  id="subscribe-monthly-btn"
                  type="button"
                  onClick={() => handlePaidPlanClick("Pro Monthly (PKR 249/mo)")}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#121821] hover:bg-[#182230] border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-black transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Coming Soon • PKR {monthlyPrice.toLocaleString()}/mo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= PLAN 3: PRO YEARLY (BEST VALUE) ================= */}
        {(billingTab === "all" || billingTab === "yearly") && (
          <div
            id="plan-card-pro-yearly"
            className={`flex flex-col justify-between rounded-3xl p-6 sm:p-7 border bg-[#0D1117] transition-all relative ${
              isPaidYearlyPro
                ? "border-[#00FF66] ring-2 ring-[#00FF66]/40 shadow-2xl"
                : "border-[#00FF66]/40 hover:border-[#00FF66]/80 shadow-lg shadow-[#00FF66]/5"
            }`}
          >
            {/* Top Badge: BEST VALUE */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[#00FF66] text-[#07090D] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-[#00FF66]/30">
              <Star className="w-3 h-3 fill-[#07090D]" />
              <span>BEST VALUE • SAVE PKR {yearlySavings.toLocaleString()}</span>
            </div>

            <div className="space-y-5 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">PRO YEARLY</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-[#00FF66] mt-0.5 font-medium">Best value for regular users</p>
                </div>
                {isPaidYearlyPro && (
                  <span className="px-2.5 py-1 rounded-md bg-[#00FF66]/20 border border-[#00FF66]/40 text-[10px] font-bold text-[#00FF66]">
                    ✓ Current Plan
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white">PKR {yearlyPrice.toLocaleString()}</span>
                  <span className="text-xs text-[#94A3B8]">/ year</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#00FF66] font-semibold">
                    ~PKR {Math.round(yearlyPrice / 12)}/mo
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    (Saves PKR {yearlySavings.toLocaleString()} vs monthly)
                  </span>
                </div>
              </div>

              {/* Benefits */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Yearly Benefits</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">30,000 AI-indexed screenshots / year</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Everything in Pro Monthly</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Priority AI vision processing</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Priority OCR &amp; search indexing</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Full cloud backup &amp; multi-device sync</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Priority customer support</span>
                  </li>
                </ul>
              </div>

              {/* Limitations */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Billing Terms</p>
                <ul className="space-y-1.5 text-xs text-[#64748B]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>30,000 annual AI-indexed screenshots allowance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>Recurring yearly payment</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6">
              {isPaidYearlyPro ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#00FF66]/15 border border-[#00FF66]/30 text-[#00FF66] text-xs font-bold text-center cursor-default"
                >
                  ✓ Current Plan Active
                </button>
              ) : (
                <button
                  id="subscribe-yearly-btn"
                  type="button"
                  onClick={() => handlePaidPlanClick("Pro Yearly (PKR 1,999/yr)")}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#121821] hover:bg-[#182230] border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-black transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Coming Soon • PKR {yearlyPrice.toLocaleString()}/yr</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= PLAN 4: PRO LIFETIME ================= */}
        {(billingTab === "all" || billingTab === "lifetime") && (
          <div
            id="plan-card-pro-lifetime"
            className={`flex flex-col justify-between rounded-3xl p-6 sm:p-7 border bg-[#0D1117] transition-all relative ${
              isPaidLifetimePro
                ? "border-[#00FF66]/70 ring-1 ring-[#00FF66]/40 shadow-xl"
                : "border-white/[0.08] hover:border-[#00FF66]/40 shadow-md"
            }`}
          >
            {/* Top Pill */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-[#CCFF00] to-[#00FF66] text-[#07090D] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Gem className="w-3 h-3 fill-[#07090D]" />
              <span>ONE-TIME PAYMENT • PAY ONCE</span>
            </div>

            <div className="space-y-5 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">PRO LIFETIME</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-[#00FF66] mt-0.5">Best for users who want to pay once</p>
                </div>
                {isPaidLifetimePro && (
                  <span className="px-2.5 py-1 rounded-md bg-[#00FF66]/20 border border-[#00FF66]/30 text-[10px] font-bold text-[#00FF66]">
                    💎 Active
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-white">
                  PKR {lifetimePrice.toLocaleString()}
                </div>
                <p className="text-xs text-[#94A3B8]">One-time payment • No recurring fees forever</p>
              </div>

              {/* Benefits */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Lifetime Inclusions</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">100,000 AI-indexed screenshots</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Everything in Pro</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">No recurring fees forever</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Permanent Lifetime Pro access</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Future Pro features included</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
                    <span>Permanently tied to user account</span>
                  </li>
                </ul>
              </div>

              {/* Limitations */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Terms</p>
                <ul className="space-y-1.5 text-xs text-[#64748B]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>100,000 lifetime AI-indexed screenshots quota</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#64748B] font-bold">•</span>
                    <span>One-time payment • No recurring subscriptions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-6">
              {isPaidLifetimePro ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#00FF66]/15 border border-[#00FF66]/30 text-[#00FF66] text-xs font-bold text-center cursor-default"
                >
                  💎 Lifetime Pro Active
                </button>
              ) : (
                <button
                  id="get-pro-lifetime-btn"
                  type="button"
                  onClick={() => handlePaidPlanClick("Pro Lifetime (PKR 5,999 once)")}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#121821] hover:bg-[#182230] border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-black transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Coming Soon • PKR {lifetimePrice.toLocaleString()}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= PLAN 5: FOUNDER PLAN (FREE 150K QUOTA - 50 SEATS) ================= */}
        <div
          id="plan-card-founder"
          className={`flex flex-col justify-between rounded-3xl p-6 sm:p-7 border bg-[#0D1117] transition-all relative ${
            billingTab === "all" ? "md:col-span-2 lg:col-span-2" : ""
          } ${
            isFounder
              ? "border-[#CCFF00] ring-2 ring-[#CCFF00]/40 shadow-2xl shadow-[#CCFF00]/10"
              : "border-[#CCFF00]/50 hover:border-[#CCFF00]/90 shadow-xl shadow-[#CCFF00]/5"
          }`}
        >
          {/* Top Pill */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[#CCFF00] text-[#07090D] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#CCFF00]/30">
            <Crown className="w-3.5 h-3.5 fill-[#07090D]" />
            <span>👑 FOUNDER • 100% FREE • MAXIMUM 50 SEATS</span>
          </div>

          <div className="space-y-5 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">FOUNDER PLAN</h3>
                  <Crown className="w-5 h-5 text-[#CCFF00]" />
                </div>
                <p className="text-xs text-[#CCFF00] mt-0.5 font-medium">
                  Strictly limited to the first 50 early founding supporters • 100% Free Lifetime VIP
                </p>
              </div>
              {isFounder && (
                <span className="px-3 py-1 rounded-md bg-[#CCFF00]/20 border border-[#CCFF00]/40 text-xs font-black text-[#CCFF00] flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 fill-[#CCFF00]" />
                  <span>👑 Founder #{founderNumber || 1} Active</span>
                </span>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#CCFF00]">
                  FREE (PKR 0)
                </span>
                <span className="text-xs font-bold text-[#00FF66] bg-[#00FF66]/10 px-2.5 py-0.5 rounded-full border border-[#00FF66]/20">
                  No Payment Required
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Lifetime Free for Founder • Maximum 50 seats • Instant 1-click allocation
              </p>
            </div>

            {/* REAL DATABASE-BACKED FOUNDER COUNTER */}
            <div
              id="founder-availability-tracker"
              className="p-4 rounded-2xl bg-[#121821] border border-white/[0.08] space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#CCFF00]" />
                  <span className="font-bold text-white">
                    {spotsClaimed} / {totalFounderSpots} Founder seats claimed
                  </span>
                </div>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    spotsRemaining > 0
                      ? "bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {founderSeatAvailabilityLabel}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-[#07090D] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#CCFF00] to-[#00FF66] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (spotsClaimed / totalFounderSpots) * 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-[#94A3B8]">
                {spotsRemaining > 0
                  ? `Real-time availability calculated from live database. ${spotsRemaining} spots remaining.`
                  : "All 50 Founder seats have been claimed. Thank you to our 50 founding members!"}
              </p>
            </div>

            {/* Grid of Founder Inclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Founder Inclusions</p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">150,000 AI-indexed screenshots lifetime</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Lifetime Free Pro access (No payment required)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Permanent Founder badge (👑 #1–50)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span className="font-semibold text-white">Permanent Founder VIP status</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Exclusive Privileges</p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Early access to major new features</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Founder recognition &amp; VIP crown badge</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Founder-exclusive priority queue</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" />
                    <span>Direct priority customer support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Potential Limitations */}
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Eligibility Limits</p>
              <p className="text-xs text-[#64748B]">
                • Hard maximum of 50 founder seats. Allocation is atomic, real-time, and verified securely on the database.
              </p>
            </div>
          </div>

          {/* Founder CTA Button */}
          <div className="pt-6">
            {isFounder ? (
              <div className="p-3.5 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-center space-y-0.5">
                <div className="text-xs font-black text-[#CCFF00] flex items-center justify-center gap-1.5">
                  <Crown className="w-4 h-4 fill-[#CCFF00]" />
                  <span>👑 Founder #{founderNumber || 1} • Lifetime Free Pro Active</span>
                </div>
                <p className="text-[11px] text-[#94A3B8]">150,000 AI-indexed screenshots • Permanent VIP Rank</p>
              </div>
            ) : spotsRemaining <= 0 ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 rounded-2xl bg-[#121821] text-[#64748B] text-xs font-bold text-center cursor-not-allowed border border-white/[0.08]"
              >
                Founder Seats Sold Out
              </button>
            ) : (
              <button
                id="claim-founder-spot-btn"
                type="button"
                onClick={handleClaimFreeFounder}
                disabled={isClaimingFounder}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#CCFF00] hover:bg-[#D9FF33] text-[#07090D] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#CCFF00]/20 disabled:opacity-50"
              >
                {isClaimingFounder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#07090D]" />
                    <span>Claiming your Free Founder Seat...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 fill-[#07090D]" />
                    <span>👑 Claim Free Founder Seat ({spotsRemaining} Left)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Complete Plan Comparison Matrix Table */}
      <div id="plan-comparison-section" className="space-y-6 pt-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Detailed Plan Comparison
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Compare all features across Free, Monthly, Yearly, Lifetime, and Founder tiers.
          </p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0D1117] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#121821]/80 text-[#F8FAFC]">
                  <th className="p-4 sm:p-5 font-bold text-xs uppercase tracking-wider text-[#94A3B8] sticky left-0 bg-[#121821] z-10">
                    Feature
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center">
                    <div>Free</div>
                    <div className="text-[10px] text-[#94A3B8] font-normal">PKR 0</div>
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center">
                    <div>Monthly</div>
                    <div className="text-[10px] text-amber-400 font-bold">PKR 249 / mo (Coming Soon)</div>
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center bg-[#00FF66]/5 border-x border-[#00FF66]/10">
                    <div className="text-[#00FF66]">Yearly</div>
                    <div className="text-[10px] text-amber-400 font-bold">PKR 1,999 / yr (Coming Soon)</div>
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center">
                    <div>Lifetime</div>
                    <div className="text-[10px] text-amber-400 font-bold">PKR 5,999 once (Coming Soon)</div>
                  </th>
                  <th className="p-4 sm:p-5 font-bold text-center bg-[#CCFF00]/5 border-l border-[#CCFF00]/10">
                    <div className="text-[#CCFF00]">👑 Founder</div>
                    <div className="text-[10px] text-[#CCFF00] font-bold">FREE (First 50 Users)</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                {/* Row 1: Screenshot limit */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="p-4 sm:p-5 font-semibold text-white sticky left-0 bg-[#0D1117] z-10">
                    AI-Indexed Screenshots Limit
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#94A3B8] font-medium">250 lifetime</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">2,500 / month</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold bg-[#00FF66]/5 border-x border-[#00FF66]/10">
                    30,000 / year
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">100,000 lifetime</td>
                  <td className="p-4 sm:p-5 text-center text-[#CCFF00] font-bold bg-[#CCFF00]/5 border-l border-[#CCFF00]/10">
                    150,000 lifetime
                  </td>
                </tr>

                {/* Row 2: OCR Extraction */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="p-4 sm:p-5 font-semibold text-white sticky left-0 bg-[#0D1117] z-10">
                    On-Device OCR Text Extraction
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Included</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Included</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold bg-[#00FF66]/5 border-x border-[#00FF66]/10">
                    ✓ Included
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Included</td>
                  <td className="p-4 sm:p-5 text-center text-[#CCFF00] font-bold bg-[#CCFF00]/5 border-l border-[#CCFF00]/10">
                    ✓ Included
                  </td>
                </tr>

                {/* Row 3: Multimodal AI Search */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="p-4 sm:p-5 font-semibold text-white sticky left-0 bg-[#0D1117] z-10">
                    Multimodal AI Search
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#64748B]">Basic only</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Full AI</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold bg-[#00FF66]/5 border-x border-[#00FF66]/10">
                    ✓ Full AI (Priority)
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Full AI</td>
                  <td className="p-4 sm:p-5 text-center text-[#CCFF00] font-bold bg-[#CCFF00]/5 border-l border-[#CCFF00]/10">
                    ✓ Full AI (Priority)
                  </td>
                </tr>

                {/* Row 4: Cloud Sync & Backup */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="p-4 sm:p-5 font-semibold text-white sticky left-0 bg-[#0D1117] z-10">
                    Cloud Sync &amp; Multi-Device
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#64748B]">Local only</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Included</td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold bg-[#00FF66]/5 border-x border-[#00FF66]/10">
                    ✓ Included
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#00FF66] font-bold">✓ Included</td>
                  <td className="p-4 sm:p-5 text-center text-[#CCFF00] font-bold bg-[#CCFF00]/5 border-l border-[#CCFF00]/10">
                    ✓ Included
                  </td>
                </tr>

                {/* Row 5: Founder Badge & Rank */}
                <tr className="hover:bg-white/[0.02] transition">
                  <td className="p-4 sm:p-5 font-semibold text-white sticky left-0 bg-[#0D1117] z-10">
                    Founder Badge &amp; VIP Rank
                  </td>
                  <td className="p-4 sm:p-5 text-center text-[#64748B]">—</td>
                  <td className="p-4 sm:p-5 text-center text-[#64748B]">—</td>
                  <td className="p-4 sm:p-5 text-center text-[#64748B] bg-[#00FF66]/5 border-x border-[#00FF66]/10">—</td>
                  <td className="p-4 sm:p-5 text-center text-[#64748B]">—</td>
                  <td className="p-4 sm:p-5 text-center text-[#CCFF00] font-bold bg-[#CCFF00]/5 border-l border-[#CCFF00]/10">
                    👑 Rank #1–50
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Transparency & Trust FAQ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-5 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Lock className="w-4 h-4 text-[#00FF66]" />
            <span>Secure &amp; Private</span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            All screenshot OCR indexing and processing happens locally on your device with high-grade privacy protection.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Payment Gateway in Progress</span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Paid checkouts are currently in preparation. Claim a free Founder seat or enjoy the generous 250 AI-indexed screenshot Free tier.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1117] border border-white/[0.08] space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Crown className="w-4 h-4 text-[#CCFF00]" />
            <span>Real Database Scarcity</span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Founder spots are strictly limited to 50 members backed by atomic database verification.
          </p>
        </div>
      </div>

      {/* 7. Payment History & Transaction Status */}
      <PaymentHistoryCard
        user={user}
        isDark={isDark}
        onOpenUpgradeModal={() => handlePaidPlanClick("Pro Lifetime (PKR 5,999 once)")}
      />

      {/* 8. Coming Soon Informational Modal for Paid Plans */}
      {showComingSoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1117] border border-white/[0.12] p-6 sm:p-7 text-center space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowComingSoonModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Payment Integration Coming Soon</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Direct online payment for <span className="font-semibold text-white">{comingSoonPlanName}</span> is currently under active integration. No credit card charges or fake transactions are accepted.
              </p>
              <p className="text-xs text-[#00FF66] bg-[#00FF66]/10 p-3 rounded-xl border border-[#00FF66]/20 leading-relaxed font-medium">
                💡 Good news: You can claim a <span className="font-bold text-white">Free Founder Seat</span> right now ({spotsRemaining} remaining) for permanent 150,000 AI-indexed screenshots with zero payment required!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {!isFounder && spotsRemaining > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowComingSoonModal(false);
                    handleClaimFreeFounder();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#CCFF00] hover:bg-[#D9FF33] text-[#07090D] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#CCFF00]/20"
                >
                  <Crown className="w-4 h-4 fill-[#07090D]" />
                  <span>👑 Claim Free Founder Seat ({spotsRemaining} Left)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowComingSoonModal(false)}
                className="w-full py-3 px-4 rounded-xl bg-[#121821] hover:bg-[#182230] text-[#F8FAFC] border border-white/[0.08] text-xs font-bold transition cursor-pointer"
              >
                Back to Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Auth Required Modal for Unauthenticated Users */}
      {showAuthRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1117] border border-white/[0.12] p-6 sm:p-7 text-center space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAuthRequiredModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Close auth required dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 mx-auto flex items-center justify-center text-[#CCFF00]">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Sign In Required</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Please sign in to continue with your purchase of the <span className="font-semibold text-white">{authModalPlanName}</span>. Your subscription will be securely linked to your account.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAuthRequiredModal(false);
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#CCFF00] hover:bg-[#D9FF33] text-[#07090D] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#CCFF00]/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAuthRequiredModal(false);
                  if (onOpenAuth) onOpenAuth();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#121821] hover:bg-[#182230] text-[#F8FAFC] border border-white/[0.08] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#00FF66]" />
                <span>Create Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Review Modal */}
      {isAdmin && (
        <AdminPaymentRequestsModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          user={user}
          isDark={isDark}
          addToast={addToast}
        />
      )}
    </div>
  );
};

export default PricingPageView;
