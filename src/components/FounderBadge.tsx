import React from "react";
import { Crown, Sparkles, Award } from "lucide-react";

export interface FounderBadgeProps {
  founderNumber?: number | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  mode?: "compact" | "badge" | "full" | "mobile";
  showNumber?: boolean;
  variant?: "solid" | "pill" | "outline" | "gold" | "silver" | "bronze";
  onClick?: () => void;
  className?: string;
  isDark?: boolean;
}

export const FounderBadge: React.FC<FounderBadgeProps> = ({
  founderNumber,
  size = "sm",
  mode = "badge",
  showNumber = true,
  variant,
  onClick,
  className = "",
}) => {
  const num = typeof founderNumber === "number" && founderNumber > 0 ? founderNumber : null;

  // Auto-detect medal variant if not explicitly given
  let resolvedVariant = variant;
  if (!resolvedVariant) {
    if (num === 1) resolvedVariant = "gold";
    else if (num === 2) resolvedVariant = "silver";
    else if (num === 3) resolvedVariant = "bronze";
    else resolvedVariant = "pill";
  }

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1 font-bold",
    sm: "text-xs px-2 py-0.5 gap-1 font-bold",
    md: "text-xs px-2.5 py-1 gap-1.5 font-bold",
    lg: "text-sm px-3 py-1.5 gap-2 font-extrabold",
    xl: "text-base px-4 py-2 gap-2.5 font-black",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-4.5 h-4.5",
    xl: "w-5 h-5",
  };

  const variantClasses = {
    solid:
      "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white shadow-sm shadow-blue-500/25 border border-white/20",
    pill:
      "bg-gradient-to-r from-[#3B82F6]/20 via-[#8B5CF6]/20 to-[#3B82F6]/20 text-blue-300 border border-blue-400/35 backdrop-blur-sm shadow-sm shadow-blue-500/10",
    outline:
      "bg-transparent text-blue-400 border border-blue-400/50",
    gold:
      "bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#8B5CF6] text-white shadow-md shadow-blue-500/30 border border-white/30",
    silver:
      "bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-slate-950 shadow-md shadow-slate-300/30 border border-white/40",
    bronze:
      "bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 text-amber-100 shadow-md shadow-amber-800/30 border border-amber-500/40",
  };

  const isClickable = Boolean(onClick);

  const formattedNumber = num !== null ? `#${num}` : null;

  if (mode === "compact") {
    return (
      <span
        onClick={onClick}
        title={formattedNumber ? `Founder ${formattedNumber}` : "SnapFind Founder"}
        className={`inline-flex items-center justify-center rounded-full font-mono text-[10px] font-black px-1.5 py-0.5 bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 text-blue-300 border border-blue-400/30 ${
          isClickable ? "cursor-pointer hover:opacity-90" : ""
        } ${className}`}
      >
        👑 {formattedNumber || "VIP"}
      </span>
    );
  }

  if (mode === "mobile") {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#3B82F6]/15 to-[#8B5CF6]/15 border border-blue-400/30 text-blue-200 text-xs font-bold ${
          isClickable ? "cursor-pointer active:scale-95" : ""
        } ${className}`}
      >
        <span className="text-sm">👑</span>
        <span>Founder</span>
        {formattedNumber && <span className="font-mono text-blue-300">{formattedNumber}</span>}
      </div>
    );
  }

  return (
    <span
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title="SnapFind Founder 100 — Lifetime Pro Access"
      className={`inline-flex items-center justify-center rounded-full tracking-wide transition-all select-none ${
        sizeClasses[size]
      } ${variantClasses[resolvedVariant]} ${
        isClickable ? "cursor-pointer hover:opacity-90 active:scale-95" : ""
      } ${className}`}
    >
      <Crown className={`${iconSizes[size]} shrink-0 text-blue-300`} />
      <span>Founder</span>
      {showNumber && formattedNumber && (
        <span className="font-mono opacity-90">{formattedNumber}</span>
      )}
    </span>
  );
};
