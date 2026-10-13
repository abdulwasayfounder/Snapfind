import React from "react";
import { Home, Search, ArrowLeft, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { SnapFindLogo } from "./SnapFindLogo";

interface NotFoundViewProps {
  onNavigateHome: () => void;
  onNavigateSearch: () => void;
  onGoBack?: () => void;
  isDark?: boolean;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onNavigateHome,
  onNavigateSearch,
  onGoBack,
  isDark = true,
}) => {
  const handleBack = () => {
    if (onGoBack) {
      onGoBack();
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      onNavigateHome();
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full text-center space-y-8"
      >
        {/* Animated Brand Badge & 404 Glyphs */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-[#121821] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/80 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#CCFF00]/10 via-transparent to-[#00FF66]/10 opacity-60" />
            <SnapFindLogo size="lg" />
          </div>
          <div className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-[#FF6600]/20 border border-[#FF6600]/40 text-[#FF6600] text-xs font-black tracking-wider uppercase">
            404
          </div>
        </div>

        {/* Heading & Context */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
            Visual Memory Not Found
          </h1>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed max-w-sm mx-auto">
            The page or route you are looking for has moved, expired, or does not exist in your visual index.
          </p>
        </div>

        {/* Quick Recovery Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] active:scale-98 text-[#07090D] font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(204,255,0,0.2)] transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>

          <button
            onClick={onNavigateSearch}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#121821] hover:bg-[#1a2330] border border-white/10 hover:border-white/20 text-[#F8FAFC] font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#00FF66]" />
            <span>Search Visuals</span>
          </button>

          <button
            onClick={handleBack}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-semibold text-[#64748B] hover:text-[#94A3B8] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Helpful Tip */}
        <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-[#64748B]">
          <HelpCircle className="w-3.5 h-3.5 text-[#00FF66]" />
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-300">⌘K</kbd> anywhere to start searching immediately.</span>
        </div>
      </motion.div>
    </div>
  );
};
