import React, { useState, useEffect } from "react";
import { Sparkles, MessageSquarePlus, X, Rocket, Crown, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FeedbackService } from "../services/feedbackService";

interface FounderFeedbackPromptProps {
  isDark: boolean;
  isFounder: boolean;
  onOpenFeedback: () => void;
  className?: string;
}

export const FounderFeedbackPrompt: React.FC<FounderFeedbackPromptProps> = ({
  isDark,
  isFounder,
  onOpenFeedback,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user is a founder and has not dismissed the prompt yet
    if (isFounder && !FeedbackService.hasDismissedFounderPrompt()) {
      // Slight delay so it doesn't jarringly pop immediately upon first render
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isFounder]);

  const handleDismiss = () => {
    FeedbackService.dismissFounderPrompt();
    setIsVisible(false);
  };

  const handleGiveFeedback = () => {
    FeedbackService.dismissFounderPrompt();
    setIsVisible(false);
    onOpenFeedback();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all shadow-xl ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-amber-500/30 text-white shadow-amber-500/5"
            : "bg-gradient-to-r from-amber-50/90 via-indigo-50/50 to-white border-amber-300 text-slate-900 shadow-amber-500/10"
        } ${className}`}
      >
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isDark
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                  : "bg-amber-100 border-amber-300 text-amber-600"
              }`}
            >
              <Rocket className="w-5 h-5" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  Founder Exclusive
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold tracking-tight">
                You're one of SnapFind's first 100 users 🚀
              </h4>
              <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Help us make SnapFind better.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
            <button
              onClick={handleDismiss}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isDark
                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              Maybe Later
            </button>
            <button
              onClick={handleGiveFeedback}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Give Feedback</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
