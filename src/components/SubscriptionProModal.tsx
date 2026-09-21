import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Shield,
  Zap,
  Layers,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Crown,
  Smartphone,
  Building2,
  ArrowRight,
  Infinity as InfinityIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { ManualPaymentModal } from "./subscription/ManualPaymentModal";
import { PaymentRequest } from "../types";

interface SubscriptionProModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFeature?: string;
  onOpenAuth?: () => void;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

export const SubscriptionProModal: React.FC<SubscriptionProModalProps> = ({
  isOpen,
  onClose,
  initialFeature,
  onOpenAuth,
  addToast,
}) => {
  const { user, isPro, refreshEntitlement } = useAuth();
  const [showManualModal, setShowManualModal] = useState(false);

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

  if (!isOpen) return null;

  const isFounder = Boolean(user?.entitlement?.isFounder);
  const founderNumber = user?.entitlement?.founderNumber;

  const handleOpenManualPayment = () => {
    setShowManualModal(true);
  };

  return (
    <>
      <div
        id="subscription-pro-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#121821] border border-white/[0.08] text-white shadow-2xl overflow-hidden my-6"
        >
          {/* Header Ambient Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Close Button */}
          <button
            id="close-pro-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8 space-y-6 relative z-10">
            {/* Crown / Icon & Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-[#3B82F6]/20 via-[#8B5CF6]/20 to-emerald-500/20 border border-[#3B82F6]/30 text-[#3B82F6] mb-1 shadow-lg shadow-blue-500/10">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight text-[#F8FAFC]">
                  Unlock SnapFind Lifetime Pro
                </h3>
                <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                  Unlimited screenshots, on-device OCR, AI search, and permanent lifetime access.
                </p>
              </div>

              {initialFeature && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium mt-1">
                  <span>Required for: <strong>{initialFeature}</strong></span>
                </div>
              )}
            </div>

            {/* Founder Status Banner if active */}
            {isFounder ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 space-y-1.5 text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Founder VIP #{founderNumber || "VIP"} Active</span>
                </div>
                <p className="text-xs text-amber-200/90">
                  You already have permanent complimentary Lifetime Pro access!
                </p>
              </div>
            ) : (
              /* Lifetime Pro Pricing & Payment Options */
              <div className="space-y-4">
                {/* Lifetime Deal Card */}
                <div className="p-5 rounded-2xl bg-[#0D1117] border-2 border-[#3B82F6]/40 space-y-3 relative overflow-hidden shadow-xl shadow-blue-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#3B82F6] text-white">
                        One-Time Payment
                      </span>
                      <span className="text-xs font-bold text-slate-300">Lifetime Pass</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-400">PKR 7,999</span>
                      <span className="text-[10px] text-[#64748B] block font-medium">No recurring fees</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-200 pt-2 border-t border-white/[0.08]">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span><strong>25,000 screenshots</strong> (Free limit: 70)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Permanent Lifetime Access • Never expires</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>On-device OCR & Gemini AI search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Encrypted cloud backup & multi-device sync</span>
                    </li>
                  </ul>
                </div>

                {/* Supported Payment Methods Note */}
                <div className="p-3.5 rounded-xl bg-[#0D1117] border border-white/[0.08] space-y-2">
                  <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                    Supported Manual Payment Methods:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-bold">Easypaisa</p>
                        <p className="text-[10px] opacity-80">Mobile Wallet</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-bold">Bank Transfer</p>
                        <p className="text-[10px] opacity-80">IBFT / Raast</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  id="pay-with-easypaisa-or-bank-btn"
                  onClick={handleOpenManualPayment}
                  className="w-full py-4 px-4 rounded-2xl font-black text-sm bg-[#3B82F6] hover:bg-blue-600 text-white flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(59,130,246,0.35)] transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Get Lifetime Pro for PKR 7,999</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-[11px] text-center text-[#64748B] pt-1">
              Admin manual verification ensures 100% security. No credit card or automated recurring charge.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Step-by-Step Manual Payment Modal */}
      <ManualPaymentModal
        isOpen={showManualModal}
        onClose={() => {
          setShowManualModal(false);
          onClose();
        }}
        user={user}
        isDark={true}
        onOpenAuth={onOpenAuth}
        onPaymentSubmitted={(req) => {
          refreshEntitlement();
          addToast?.({
            title: "Payment Confirmation Submitted",
            description: "Your payment is pending admin review. Lifetime Pro activates upon approval.",
            type: "success",
          });
        }}
        addToast={addToast}
      />
    </>
  );
};
