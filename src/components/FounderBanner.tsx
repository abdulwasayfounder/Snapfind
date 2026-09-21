import React, { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { UserProfile, AppSettings } from "../types";

export interface FounderBannerProps {
  user: UserProfile | null;
  settings?: AppSettings;
  onNavigateToFounders?: () => void;
  isDark?: boolean;
  className?: string;
}

export const FounderBanner: React.FC<FounderBannerProps> = ({
  user,
  settings,
  onNavigateToFounders,
  isDark = true,
  className = "",
}) => {
  const shouldReduceMotion = useReducedMotion() || Boolean(settings?.reducedMotion);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt coordinates
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Extract trusted founder data strictly from entitlement
  const founderNumber = user?.entitlement?.founderNumber;
  const isFounder = Boolean(
    (user?.entitlement?.isFounder || user?.plan === "Founder") &&
    typeof founderNumber === "number" &&
    founderNumber > 0 &&
    !isNaN(founderNumber)
  );

  // Default to true if setting is not explicitly false
  const isBannerEnabled = settings?.founder_banner_enabled !== false;

  const [displayedNumber, setDisplayedNumber] = useState(
    shouldReduceMotion ? (founderNumber || 1) : 0
  );

  // Animate count-up once on mount
  useEffect(() => {
    if (!isFounder || !founderNumber) return;
    if (shouldReduceMotion) {
      setDisplayedNumber(founderNumber);
      return;
    }
    const durationMs = 700;
    const startTime = performance.now();
    let animationFrameId: number;

    const updateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.max(1, Math.round(eased * founderNumber));
      setDisplayedNumber(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [founderNumber, isFounder, shouldReduceMotion]);

  // Handle 3D perspective tilt on desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = -((y - centerY) / centerY) * 4; // subtle max 4deg
    const rY = ((x - centerX) / centerX) * 4;

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  // If user is not verified founder, rank is missing/invalid, or banner turned off in settings, render nothing
  if (!isFounder || !founderNumber || !isBannerEnabled) {
    return null;
  }

  const isRankOne = founderNumber === 1;

  return (
    <motion.aside
      role="button"
      tabIndex={0}
      aria-label={`You are a SnapFind Founder, rank ${founderNumber}. Lifetime Pro active.`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigateToFounders?.();
        }
      }}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full select-none cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/60 rounded-2xl md:rounded-3xl ${className}`}
      onClick={onNavigateToFounders}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: "1000px",
          transform: shouldReduceMotion
            ? "none"
            : `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: isHovered
            ? "transform 0.08s ease-out"
            : "transform 0.4s ease-out",
        }}
        className={`relative overflow-hidden rounded-2xl md:rounded-3xl p-3 sm:p-4 px-4 sm:px-6 border transition-all duration-300 shadow-2xl group ${
          isRankOne
            ? "bg-[#121821] border-[#3B82F6]/60 shadow-[0_0_25px_rgba(59,130,246,0.25)] ring-1 ring-[#3B82F6]/30"
            : isDark
            ? "bg-[#0D1117] border-white/[0.08] hover:border-[#3B82F6]/40 shadow-black/80"
            : "bg-slate-900 text-white border-blue-500/40 hover:border-blue-400/70 shadow-blue-500/10"
        } backdrop-blur-xl`}
      >
        {/* Subtle Ambient Light Reflections & Moving Shimmer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Blue ambient glow top left */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-[#3B82F6]/15 blur-3xl" />
          {/* Violet ambient glow bottom right */}
          <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-[#8B5CF6]/15 blur-3xl" />
          {/* Dynamic light shimmer sweep on entrance / hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-6 min-w-0">
          {/* Left / Center: Crown + YOU ARE A FOUNDER • #rank */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* Animated Crown Icon with 3D Depth & Floating effect */}
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      y: [0, -2.5, 0],
                      rotate: [0, -1.5, 1.5, 0],
                    }
              }
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative shrink-0 flex items-center justify-center"
            >
              <span className="text-xl sm:text-2xl filter drop-shadow-[0_2px_10px_rgba(59,130,246,0.6)]">
                👑
              </span>
            </motion.div>

            {/* Typography: "YOU ARE A FOUNDER • #17" */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-wrap">
              <h2 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase bg-gradient-to-r from-blue-200 via-indigo-100 to-violet-200 bg-clip-text text-transparent truncate flex items-center gap-1.5">
                <span>YOU ARE A FOUNDER</span>
              </h2>

              <span className="text-blue-400/60 font-bold text-xs sm:text-sm select-none">•</span>

              {/* Founder Rank Tag */}
              <span className="text-xs sm:text-sm md:text-base font-black font-mono tracking-tight bg-gradient-to-r from-blue-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_1px_6px_rgba(59,130,246,0.4)]">
                #{displayedNumber}
              </span>

              {isRankOne && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-[#3B82F6]/20 text-blue-300 border border-blue-400/40 tracking-wider">
                  <Sparkles className="w-2.5 h-2.5 fill-blue-300" />
                  FIRST FOUNDER
                </span>
              )}
            </div>
          </div>

          {/* Right: Lifetime Pro Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 rounded-xl bg-gradient-to-r from-[#3B82F6]/15 to-[#8B5CF6]/15 border border-blue-400/30 text-blue-300 text-[11px] sm:text-xs font-bold shadow-sm backdrop-blur-sm group-hover:border-blue-400/60 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden sm:inline">Lifetime Pro</span>
              <span className="sm:hidden text-[10px]">Pro</span>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

// Re-export alias for maximum compatibility
export const FounderStatusBanner = FounderBanner;
