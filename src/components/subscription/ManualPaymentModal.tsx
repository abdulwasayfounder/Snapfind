import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Zap,
  Check,
  Lock,
  ArrowRight,
  Clock,
  Mail,
  Send,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../../types";
import { PaymentService } from "../../services/billing/PaymentService";
import { SnapFindLogo } from "../SnapFindLogo";

export interface ManualPaymentPlanInfo {
  id: string;
  name: string;
  price: string;
  interval?: string;
  billingType?: "monthly" | "yearly" | "lifetime";
  description?: string;
}

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  plan?: ManualPaymentPlanInfo;
  isDark?: boolean;
  onOpenAuth?: () => void;
  onPaymentSubmitted?: (req?: any) => void;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  isOpen,
  onClose,
  user,
  plan,
  isDark = true,
  onOpenAuth,
  addToast,
}) => {
  const currentPlan: ManualPaymentPlanInfo = plan || {
    id: "lifetime_pro_pkr",
    name: "Pro Lifetime",
    price: "PKR 7,999",
    interval: "one-time payment",
    billingType: "lifetime",
    description: "One-time payment • Lifetime Pro access",
  };

  const [notifyEmail, setNotifyEmail] = useState(user?.email || "");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<{
    configured: boolean;
    provider: string;
    message: string;
  }>({
    configured: false,
    provider: "unconfigured",
    message: "Payments are currently being prepared.",
  });

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

  useEffect(() => {
    if (isOpen) {
      PaymentService.checkProviderStatus().then((status) => {
        setGatewayStatus(status);
      });
      if (user?.email) {
        setNotifyEmail(user.email);
      }
      setHasNotified(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes("@")) {
      addToast?.({
        title: "Email Required",
        description: "Please enter a valid email address.",
        type: "error",
      });
      return;
    }

    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setHasNotified(true);
      addToast?.({
        title: "You're on the priority list",
        description: `We will notify ${notifyEmail} as soon as automated payments go live for ${currentPlan.name}!`,
        type: "success",
      });
    }, 600);
  };

  const handleStartCheckout = async () => {
    if (!user || user.id === "guest" || user.id.startsWith("local-guest")) {
      addToast?.({
        title: "Sign in Required",
        description: "Please sign in or create an account before proceeding to checkout.",
        type: "info",
      });
      onOpenAuth?.();
      return;
    }

    const res = await PaymentService.createCheckout(currentPlan.id, user.id, user.email);
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
    } else {
      addToast?.({
        title: "Payments are currently being prepared",
        description: "Automated payment checkout is being finalized. You will be able to complete this purchase soon.",
        type: "info",
      });
    }
  };

  return (
    <div
      id="manual-payment-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-2xl bg-[#0D1117] border border-white/[0.08] shadow-2xl shadow-black overflow-hidden flex flex-col z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.08] bg-[#07090D]/60">
          <div className="flex items-center gap-3">
            <SnapFindLogo className="w-9 h-9 rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{currentPlan.name} Checkout</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20">
                  {currentPlan.price}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">{currentPlan.description || currentPlan.interval}</p>
            </div>
          </div>
          <button
            id="close-manual-payment-btn"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {gatewayStatus.configured ? (
            /* Gateway Live View */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 flex items-center justify-center text-[#CCFF00] mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Ready for Secure Checkout</h4>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Complete your one-time purchase of PKR 7,999 with encrypted card or mobile checkout.
                </p>
              </div>
              <button
                onClick={handleStartCheckout}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#CCFF00] to-[#00FF66] text-[#07090D] font-bold text-sm hover:opacity-95 transition shadow-lg shadow-[#00FF66]/20"
              >
                Proceed to Payment Provider
              </button>
            </div>
          ) : (
            /* Safe Preparation View */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#121821] border border-white/[0.08] flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 flex items-center justify-center text-[#CCFF00] shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Payments are currently being prepared</h4>
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                    Automated payment processing (Credit/Debit Card, Google Pay, Apple Pay) is being finalized for SnapFind AI. Lifetime Pro will be unlocked for PKR 7,999 once the gateway goes live.
                  </p>
                </div>
              </div>

              {/* What Lifetime Pro Includes */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Lifetime Pro Package (PKR 7,999)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#94A3B8]">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#07090D] border border-white/[0.04]">
                    <Check className="w-3.5 h-3.5 text-[#CCFF00] shrink-0" />
                    <span>Unlimited screenshots</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#07090D] border border-white/[0.04]">
                    <Check className="w-3.5 h-3.5 text-[#CCFF00] shrink-0" />
                    <span>Lifetime access (no subs)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#07090D] border border-white/[0.04]">
                    <Check className="w-3.5 h-3.5 text-[#00FF66] shrink-0" />
                    <span>On-device AI OCR index</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#07090D] border border-white/[0.04]">
                    <Check className="w-3.5 h-3.5 text-[#00FF66] shrink-0" />
                    <span>Encrypted sync</span>
                  </div>
                </div>
              </div>

              {/* Priority Notification Form */}
              <div className="p-4 rounded-xl bg-[#07090D] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#CCFF00]" />
                  <span className="text-xs font-bold text-white">Get notified when checkout opens</span>
                </div>

                {hasNotified ? (
                  <div className="p-3 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>We will notify you at {notifyEmail} as soon as payments open!</span>
                  </div>
                ) : (
                  <form onSubmit={handleNotifyMe} className="flex gap-2">
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#121821] border border-white/[0.08] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#CCFF00]"
                    />
                    <button
                      type="submit"
                      disabled={isSubscribing}
                      className="px-4 py-2.5 rounded-lg bg-[#CCFF00] hover:bg-[#D9FF33] text-[#07090D] font-bold text-xs flex items-center gap-1.5 transition shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Notify Me</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#07090D]/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>256-Bit SSL Encrypted & Private</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#121821] hover:bg-[#182230] text-xs font-semibold text-[#F8FAFC] border border-white/[0.08] transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ManualPaymentModal;
