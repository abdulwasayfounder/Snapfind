import React from "react";
import { Crown, Rocket, Sparkles } from "lucide-react";

export interface FounderBadgeProps {
  founderNumber?: number | null;
  size?: "xs" | "sm" | "md" | "lg";
  showNumber?: boolean;
  variant?: "solid" | "pill" | "outline" | "gold";
  onClick?: () => void;
  className?: string;
  isDark?: boolean;
}

export const FounderBadge: React.FC<FounderBadgeProps> = ({
  founderNumber,
  size = "sm",
  showNumber = true,
  variant = "pill",
  onClick,
  className = "",
}) => {
  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1 font-bold",
    sm: "text-xs px-2 py-0.5 gap-1 font-bold",
    md: "text-xs px-2.5 py-1 gap-1.5 font-bold",
    lg: "text-sm px-3 py-1.5 gap-2 font-extrabold",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-4.5 h-4.5",
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
  };

  const isClickable = Boolean(onClick);

  const formattedNumber =
    founderNumber && founderNumber > 0
      ? `#${String(founderNumber).padStart(2, "0")}`
      : null;

  return (
    <span
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title="SnapFind Founder 100 — Lifetime Pro Access"
      className={`inline-flex items-center justify-center rounded-full tracking-wide transition-all select-none ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
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
