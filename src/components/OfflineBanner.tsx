import React from "react";
import { WifiOff, AlertTriangle } from "lucide-react";

interface OfflineBannerProps {
  isDark: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isDark }) => {
  return (
    <div
      className={`px-4 py-2.5 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-pulse transition-all ${
        isDark
          ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="font-semibold">Offline Mode Active:</span>
        <span className="opacity-90">
          Using local storage index &amp; Tesseract client OCR engine. Cloud AI calls will resume when connection restores.
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] opacity-75 bg-amber-500/10 px-2 py-0.5 rounded-md">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span>Local Mode</span>
      </div>
    </div>
  );
};
