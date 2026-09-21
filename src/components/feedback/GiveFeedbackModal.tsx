import React, { useState, useEffect } from "react";
import { X, MessageSquare, Star, Send, CheckCircle2, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { FeedbackType, UserProfile } from "../../types";
import { FeedbackService } from "../../services/feedbackService";

interface GiveFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  user: UserProfile | null;
  isDark?: boolean;
  onSubmitted?: () => void;
}

const FEEDBACK_CATEGORIES: Array<{ type: FeedbackType; label: string; icon: string }> = [
  { type: "Bug Report", label: "Bug Report", icon: "🐛" },
  { type: "Feature Request", label: "Feature Request", icon: "✨" },
  { type: "UI/UX Feedback", label: "UI / Design", icon: "🎨" },
  { type: "Search Quality", label: "Search & OCR", icon: "🔍" },
  { type: "AI Accuracy", label: "AI & Summary", icon: "🧠" },
  { type: "Game Feedback", label: "SnapDash Game", icon: "🎮" },
  { type: "Performance", label: "Speed / Lag", icon: "⚡" },
  { type: "Other", label: "Other Thoughts", icon: "💬" },
];

export const GiveFeedbackModal: React.FC<GiveFeedbackModalProps> = ({
  isOpen,
  onClose,
  currentPage,
  user,
  isDark = true,
  onSubmitted,
}) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>("UI/UX Feedback");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsSuccess(false);
      // Auto-switch to Game Feedback if opened from SnapDash page
      if (currentPage.toLowerCase().includes("game") || currentPage.toLowerCase().includes("snapdash")) {
        setSelectedType("Game Feedback");
      } else {
        setSelectedType("UI/UX Feedback");
      }
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Please enter a short message describing your feedback.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isFounder = Boolean(user?.entitlement?.isFounder);
      const res = await FeedbackService.submitFeedback(
        {
          type: selectedType,
          description: message.trim(),
          rating,
          page: currentPage,
          user_email: user?.email || guestEmail.trim() || undefined,
        },
        user,
        isFounder
      );

      if (res.success) {
        setIsSuccess(true);
        if (onSubmitted) {
          onSubmitted();
        }
        setTimeout(() => {
          setIsSuccess(false);
          setMessage("");
          onClose();
        }, 1800);
      } else {
        setErrorMsg("Could not submit feedback. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const starLabels = ["Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div
      id="feedback-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        id="feedback-modal-container"
        className={`relative w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-2xl border transition-all duration-300 ${
          isDark
            ? "bg-[#0A0E14] text-slate-100 border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            : "bg-white text-slate-900 border-slate-200 shadow-xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Help Us Improve SnapFind
              </h2>
              <p className="text-xs text-slate-400">
                Context: <span className="text-blue-400 font-medium">{currentPage}</span>
              </p>
            </div>
          </div>
          <button
            id="feedback-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Thank You!</h3>
              <p className="text-sm text-slate-300">
                Your feedback has been received. Our engineering team reviews every submission. 💙
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Feedback Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const isSelected = selectedType === cat.type;
                  return (
                    <button
                      type="button"
                      key={cat.type}
                      id={`feedback-type-${cat.type.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      onClick={() => setSelectedType(cat.type)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                        isSelected
                          ? "bg-blue-600/20 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                          : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Stars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Overall Experience
                </label>
                <span className="text-xs font-medium text-amber-400">
                  {starLabels[(hoverRating || rating) - 1]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    id={`feedback-star-${star}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} star rating`}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-all ${
                        (hoverRating || rating) >= star
                          ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] scale-110"
                          : "text-slate-700 hover:text-slate-500"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-2">
              <label htmlFor="feedback-message" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Your Thoughts or Suggestions</span>
                <span className="text-[11px] text-slate-500">{message.length}/1000</span>
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                rows={4}
                required
                placeholder="Tell us what you love, what felt confusing, or a feature you'd love to see in SnapFind..."
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            {/* Guest email if not logged in */}
            {(!user || !user.isLoggedIn) && (
              <div className="space-y-1.5">
                <label htmlFor="feedback-email" className="text-xs text-slate-400">
                  Your Email <span className="text-slate-500">(optional, for follow-up)</span>
                </label>
                <input
                  type="email"
                  id="feedback-email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-800 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="feedback-submit-btn"
                disabled={isSubmitting || !message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
