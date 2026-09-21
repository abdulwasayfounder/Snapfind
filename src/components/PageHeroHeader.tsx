import React from "react";
import { Hero3dObject, Hero3dObjectType } from "./Hero3dObject";

export interface PageHeroHeaderProps {
  type: Hero3dObjectType;
  title: string;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  isDark?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const PageHeroHeader: React.FC<PageHeroHeaderProps> = ({
  type,
  title,
  subtitle,
  description,
  badge,
  actions,
  isDark = true,
  className = "",
  size = "md",
}) => {
  const displayDescription = subtitle || description;
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b ${
        isDark ? "border-white/[0.08]" : "border-slate-200"
      } ${className}`}
    >
      {/* Left: 3D Object + Title & Description */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        <Hero3dObject type={type} size={size} />

        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight truncate ${
                isDark ? "text-[#F8FAFC]" : "text-slate-900"
              }`}
            >
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>

          {displayDescription && (
            <div
              className={`text-xs sm:text-sm font-normal line-clamp-1 sm:line-clamp-2 ${
                isDark ? "text-[#94A3B8]" : "text-slate-600"
              }`}
            >
              {displayDescription}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions / Search / Filter Slots */}
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
