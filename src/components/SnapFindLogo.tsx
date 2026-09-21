import React from "react";

export interface SnapFindLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  isDark?: boolean;
  showText?: boolean;
  showTagline?: boolean;
  variant?: "icon" | "horizontal" | "stacked";
  textClassName?: string;
}

/**
 * SnapFind AI - Vector Brand Logo Icon
 *
 * Faithfully matches the official SnapFind logo:
 * - Magnifying Glass with Fluorescent Yellow-Green (#CCFF00) to Neon Green (#00FF66) gradient
 * - Horizontal speed/motion scan trails on left (Snap -> Scan -> Find) with Blaze Orange (#FF6600)
 * - Viewfinder capture brackets in crisp white (#FFFFFF)
 * - Internal screenshot card with mountain landscape and AI scan highlight
 * - Obsidian Black (#07090D) deep background canvas
 */
export const SnapFindLogoSVG: React.FC<{
  className?: string;
  size?: number | string;
  isDark?: boolean;
  includeBackground?: boolean;
}> = ({ className = "w-full h-full", size, isDark = true, includeBackground = true }) => {
  const uniqueId = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      role="img"
      aria-label="SnapFind AI Logo"
    >
      <defs>
        {/* Obsidian Base & Glass Ambient Aura */}
        <radialGradient
          id={`bg-glow-${uniqueId}`}
          cx="52%"
          cy="46%"
          r="48%"
          fx="50%"
          fy="42%"
        >
          <stop offset="0%" stopColor="#00FF66" stopOpacity={isDark ? "0.18" : "0.08"} />
          <stop offset="45%" stopColor="#CCFF00" stopOpacity={isDark ? "0.08" : "0.04"} />
          <stop offset="100%" stopColor="#07090D" stopOpacity="0" />
        </radialGradient>

        {/* Primary Magnifying Glass Lens Gradient (#CCFF00 -> #00FF66) */}
        <linearGradient
          id={`lens-grad-${uniqueId}`}
          x1="26"
          y1="20"
          x2="70"
          y2="66"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#CCFF00" />
          <stop offset="45%" stopColor="#84FF1A" />
          <stop offset="100%" stopColor="#00FF66" />
        </linearGradient>

        {/* Handle Gradient (Obsidian Core with Lime to Neon Edge) */}
        <linearGradient
          id={`handle-grad-${uniqueId}`}
          x1="60"
          y1="58"
          x2="85"
          y2="83"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#CCFF00" />
          <stop offset="30%" stopColor="#0D1117" />
          <stop offset="70%" stopColor="#121821" />
          <stop offset="100%" stopColor="#00FF66" />
        </linearGradient>

        {/* Speed Trail 1 - Top Orange Dot/Bar */}
        <linearGradient
          id={`trail-top-${uniqueId}`}
          x1="18"
          y1="28"
          x2="32"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF6600" />
          <stop offset="100%" stopColor="#FF8800" />
        </linearGradient>

        {/* Speed Trail 2 - Upper Lime-Green Bar */}
        <linearGradient
          id={`trail-mid1-${uniqueId}`}
          x1="12"
          y1="38"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF6600" />
          <stop offset="40%" stopColor="#CCFF00" />
          <stop offset="100%" stopColor="#CCFF00" />
        </linearGradient>

        {/* Speed Trail 3 - Main Speed Trail */}
        <linearGradient
          id={`trail-mid2-${uniqueId}`}
          x1="8"
          y1="48"
          x2="32"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#CCFF00" />
          <stop offset="70%" stopColor="#CCFF00" />
          <stop offset="100%" stopColor="#00FF66" />
        </linearGradient>

        {/* Speed Trail 4 - Bottom Neon Green Bar */}
        <linearGradient
          id={`trail-bot-${uniqueId}`}
          x1="14"
          y1="58"
          x2="30"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#CCFF00" />
          <stop offset="100%" stopColor="#00FF66" />
        </linearGradient>

        {/* Speed Trail 5 - Lowest Green Trail */}
        <linearGradient
          id={`trail-lowest-${uniqueId}`}
          x1="22"
          y1="68"
          x2="34"
          y2="68"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00FF66" />
          <stop offset="100%" stopColor="#00FF66" />
        </linearGradient>

        {/* Text Find Gradient */}
        <linearGradient
          id={`text-find-grad-${uniqueId}`}
          x1="0"
          y1="0"
          x2="100"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#CCFF00" />
          <stop offset="100%" stopColor="#00FF66" />
        </linearGradient>

        {/* Subtle Ambient Lens Glow Filter */}
        <filter id={`subtle-glow-${uniqueId}`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Base Canvas (Obsidian Black) */}
      {includeBackground && (
        <rect width="100" height="100" rx="22" fill={isDark ? "#07090D" : "#0D1117"} />
      )}
      <circle cx="50" cy="45" r="42" fill={`url(#bg-glow-${uniqueId})`} />

      {/* 2. Horizontal Speed / Motion Scan Trails on Left (Snap -> Scan -> Find) */}
      <g strokeLinecap="round" opacity="0.95">
        {/* Trail 1: Top speed dots & bar */}
        <circle cx="14" cy="28" r="1.8" fill="#FF6600" />
        <line x1="20" y1="28" x2="30" y2="28" stroke={`url(#trail-top-${uniqueId})`} strokeWidth="3" />

        {/* Trail 2: Upper orange-lime bar */}
        <circle cx="9" cy="38" r="1.8" fill="#FF6600" />
        <line x1="14" y1="38" x2="33" y2="38" stroke={`url(#trail-mid1-${uniqueId})`} strokeWidth="3.2" />

        {/* Trail 3: Middle prominent fluorescent yellow-green bar */}
        <circle cx="6" cy="48" r="1.8" fill="#CCFF00" />
        <line x1="11" y1="48" x2="28" y2="48" stroke={`url(#trail-mid2-${uniqueId})`} strokeWidth="3.4" />

        {/* Trail 4: Lower lime to neon green bar */}
        <circle cx="10" cy="58" r="1.8" fill="#CCFF00" />
        <line x1="15" y1="58" x2="28" y2="58" stroke={`url(#trail-bot-${uniqueId})`} strokeWidth="3.2" />

        {/* Trail 5: Lowest green speed bar */}
        <line x1="20" y1="68" x2="29" y2="68" stroke={`url(#trail-lowest-${uniqueId})`} strokeWidth="2.8" />
      </g>

      {/* 3. Magnifying Glass Handle (Angled 45 deg to Bottom-Right) */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <line
          x1="59"
          y1="57"
          x2="81"
          y2="79"
          stroke="#07090D"
          strokeWidth="8"
          opacity="0.8"
        />
        <line
          x1="59"
          y1="57"
          x2="81"
          y2="79"
          stroke={`url(#handle-grad-${uniqueId})`}
          strokeWidth="6.2"
        />
        <circle cx="81" cy="79" r="3.1" fill="#00FF66" />
      </g>

      {/* 4. Magnifying Glass Lens Rim */}
      <circle
        cx="49"
        cy="43"
        r="20"
        stroke={`url(#lens-grad-${uniqueId})`}
        strokeWidth="5.5"
        fill="#07090D"
        fillOpacity="0.4"
        filter={`url(#subtle-glow-${uniqueId})`}
      />

      {/* Glass Inner Reflection Highlight Arc */}
      <path
        d="M 37 35 A 16 16 0 0 1 61 35"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 5. Viewfinder Capture Brackets in Crisp White (#FFFFFF) */}
      <g stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Top-Left */}
        <path d="M 38 31 L 38 29 A 2.5 2.5 0 0 1 40.5 26.5 L 43.5 26.5" />
        {/* Top-Right */}
        <path d="M 54.5 26.5 L 57.5 26.5 A 2.5 2.5 0 0 1 60 29 L 60 31" />
        {/* Bottom-Left */}
        <path d="M 38 55 L 38 57 A 2.5 2.5 0 0 0 40.5 59.5 L 43.5 59.5" />
        {/* Bottom-Right */}
        <path d="M 54.5 59.5 L 57.5 59.5 A 2.5 2.5 0 0 0 60 57 L 60 55" />
      </g>

      {/* 6. Screenshot / Photo Symbol Inside Lens */}
      <g transform="translate(0, 0)">
        {/* Screenshot Card Boundary */}
        <rect
          x="40"
          y="28.5"
          width="18"
          height="17"
          rx="3.5"
          fill="#0D1117"
          stroke="#CCFF00"
          strokeWidth="1.6"
        />

        {/* Top-Right Fold Corner Accent */}
        <path
          d="M 54.5 28.5 L 58 32 L 54.5 32 Z"
          fill="#CCFF00"
          opacity="0.9"
        />

        {/* Photo Sun / Spark Highlight */}
        <circle cx="44.5" cy="33" r="1.5" fill="#FFFFFF" />

        {/* Mountain Silhouette Inside Photo */}
        <path
          d="M 41.5 43.5 L 46.5 37.5 L 50 41 L 53.5 36.5 L 57 43.5 Z"
          fill="#FFFFFF"
          opacity="0.95"
        />
        <path
          d="M 46.5 37.5 L 50 41 L 53.5 36.5 L 57 43.5 L 49.5 43.5 Z"
          fill="#00FF66"
          opacity="0.35"
        />
      </g>
    </svg>
  );
};

/**
 * SnapFind AI - Full Brand Presentation (Icon + Typography + Tagline)
 * Exactly mirrors the uploaded sfl.png master asset.
 */
export const SnapFindLogoFull: React.FC<{
  className?: string;
  size?: number | string;
  isDark?: boolean;
  showTagline?: boolean;
}> = ({ className = "w-full max-w-xs", isDark = true, showTagline = true }) => {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Icon Mark */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 relative flex items-center justify-center">
        <SnapFindLogoSVG isDark={isDark} includeBackground={false} />
      </div>

      {/* Brand Title: SnapFind */}
      <div className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center">
        <span className="text-white">Snap</span>
        <span className="bg-gradient-to-r from-[#CCFF00] to-[#00FF66] bg-clip-text text-transparent">
          Find
        </span>
      </div>

      {/* Tagline: SNAP IT. FIND IT. INSTANTLY. */}
      {showTagline && (
        <div className="mt-1.5 text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase flex items-center gap-1.5">
          <span className="text-white/90">SNAP IT.</span>
          <span className="text-[#CCFF00]">FIND IT.</span>
          <span className="text-white/90">INSTANTLY.</span>
        </div>
      )}
    </div>
  );
};

/**
 * Universal SnapFind Logo Component
 */
export const SnapFindLogo: React.FC<SnapFindLogoProps> = ({
  className = "w-10 h-10 rounded-xl",
  size,
  alt = "SnapFind Logo",
  isDark = true,
  showText = false,
  showTagline = false,
  variant = "icon",
  textClassName = "font-bold text-base tracking-tight",
}) => {
  if (variant === "stacked" || (showText && showTagline)) {
    return <SnapFindLogoFull className={className} isDark={isDark} showTagline={showTagline} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${showText ? "" : "shrink-0"}`}>
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-black/60 bg-[#07090D] border border-white/[0.08] ${className}`}
        title={alt}
      >
        <SnapFindLogoSVG className="w-full h-full object-contain" size={size} isDark={isDark} />
      </div>

      {showText && (
        <span className={textClassName}>
          <span className="text-white">Snap</span>
          <span className="bg-gradient-to-r from-[#CCFF00] to-[#00FF66] bg-clip-text text-transparent font-extrabold">
            Find
          </span>
        </span>
      )}
    </div>
  );
};

export default SnapFindLogo;
