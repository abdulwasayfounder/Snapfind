import React from "react";
import { MessageSquarePlus } from "lucide-react";

interface GiveFeedbackButtonProps {
  onClick: () => void;
  currentPage?: string;
  isDark?: boolean;
  className?: string;
}

export const GiveFeedbackButton: React.FC<GiveFeedbackButtonProps> = ({
  onClick,
  currentPage = "Current Page",
  isDark = true,
  className = "",
}) => {
  return (
    <button
      id={`give-feedback-btn-${currentPage.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
      type="button"
      onClick={onClick}
      title={`Share your feedback on ${currentPage}`}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border shadow-sm ${
        isDark
          ? "bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 hover:text-white border-slate-800 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          : "bg-white/90 hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-blue-400"
      } ${className}`}
    >
      <MessageSquarePlus className="w-3.5 h-3.5 text-blue-400" />
      <span>Give Feedback</span>
    </button>
  );
};
