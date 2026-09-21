import React from "react";
import { Sparkles, Zap } from "lucide-react";

export interface ProBadgeProps {
  variant?: "solid" | "subtle" | "outline" | "pill" | "glow";
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
  label?: string;
  onClick?: () => void;
  className?: string;
  isDark?: boolean;
}

export const ProBadge: React.FC<ProBadgeProps> = ({
  variant = "pill",
  size = "sm",
  showIcon = true,
  label = "PRO",
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
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const variantClasses = {
    solid:
      "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20 border border-blue-400/30",
    subtle:
      "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    outline:
      "bg-transparent text-blue-400 border border-blue-500/40",
    pill:
      "bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-sm",
    glow:
      "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/30 border border-white/20",
  };

  const isClickable = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`inline-flex items-center justify-center rounded-full tracking-wide transition-all select-none ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        isClickable ? "cursor-pointer hover:opacity-90 active:scale-95" : ""
      } ${className}`}
    >
      {showIcon && <Sparkles className={`${iconSizes[size]} shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};
