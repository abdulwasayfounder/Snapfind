import React from "react";
import { CheckCircle2, ArrowRight, Home, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { FeedbackItem } from "../../types";

interface FeedbackSuccessViewProps {
  item?: FeedbackItem | null;
  onReturnToApp: () => void;
  onSubmitAnother: () => void;
  isDark?: boolean;
}

export const FeedbackSuccessView: React.FC<FeedbackSuccessViewProps> = ({
  item,
  onReturnToApp,
  onSubmitAnother,
  isDark = true,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`max-w-lg w-full p-8 sm:p-12 rounded-3xl border text-center space-y-6 shadow-2xl ${
          isDark
            ? "bg-[#0D1117] border-[#00FF66]/20 shadow-black/80"
            : "bg-white border-emerald-200 shadow-slate-200"
        }`}
      >
        {/* Animated Success Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#00FF66]/10 border-2 border-[#00FF66]/30 text-[#00FF66] flex items-center justify-center shadow-lg shadow-[#00FF66]/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
            Thank You for Your Feedback
          </h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed max-w-sm mx-auto">
            Your insights directly guide SnapFind AI&apos;s product roadmap, search accuracy improvements, and feature updates.
          </p>
        </div>

        {/* Submission Details Card */}
        {item && (
          <div className="p-4 rounded-2xl bg-[#121821] border border-white/10 text-left text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg font-bold bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/30 text-[11px]">
                {item.type}
              </span>
              <span className="text-[11px] font-mono text-[#64748B]">
                ID: {item.id}
              </span>
            </div>
            <p className="font-semibold text-sm text-[#F8FAFC] line-clamp-1">
              {item.title}
            </p>
            <p className="text-[#94A3B8] line-clamp-2">
              {item.description}
            </p>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#64748B]">
              <span>Status: <strong className="text-[#00FF66]">Received &amp; Queued</strong></span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00FF66]" />
                Zero-PII Encrypted
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onReturnToApp}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] active:scale-98 text-[#07090D] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={onSubmitAnother}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#121821] hover:bg-[#1a2330] border border-white/10 hover:border-white/20 text-[#F8FAFC] font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#CCFF00]" />
            <span>Send Another Note</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
