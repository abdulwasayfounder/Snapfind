import React from "react";

export type PageHero3DType =
  | "dashboard"
  | "gallery"
  | "search"
  | "collections"
  | "favorites"
  | "trash"
  | "import"
  | "snapdash"
  | "pricing"
  | "notifications"
  | "settings"
  | "account"
  | "feedback"
  | "founder"
  | "timeline";

export interface PageHero3DProps {
  type: PageHero3DType;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}

/**
 * PageHero3D
 * Reusable, lightweight, futuristic 3D hero object for SnapFind AI.
 * Built with procedural high-DPI SVGs, orbital rings, layered glass/metal shaders,
 * neon lighting (blue, purple, cyan, and gold for Founder), and motion-safe floating/rotation animations.
 */
export const PageHero3D: React.FC<PageHero3DProps> = ({
  type,
  size = "md",
  className = "",
  glow = true,
}) => {
  const sizeMap = {
    sm: "w-9 h-9 sm:w-10 sm:h-10",
    md: "w-12 h-12 sm:w-14 sm:h-14",
    lg: "w-16 h-16 sm:w-18 sm:h-18",
    xl: "w-20 h-20 sm:w-24 sm:h-24",
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none ${currentSizeClass} ${className}`}
      style={{ perspective: "800px" }}
      aria-hidden="true"
    >
      {/* 1. DASHBOARD: 3D Neural AI Sphere (Deep Navy / Blue Neon / Purple / Cyan Glow) */}
      {type === "dashboard" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_5s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-cyan-400/30 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(59,130,246,0.65)]">
            <defs>
              <radialGradient id="dashCoreGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#A5F3FC" />
                <stop offset="35%" stopColor="#38BDF8" />
                <stop offset="70%" stopColor="#3B82F6" />
                <stop offset="90%" stopColor="#1E1B4B" />
                <stop offset="100%" stopColor="#0B0F19" />
              </radialGradient>
              <linearGradient id="dashRingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#818CF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#C084FC" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="dashRingGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00FF66" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#CCFF00" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Background ambient orbit shadow */}
            <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="url(#dashRingGrad1)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" transform="rotate(-25 50 50)" className="motion-safe:animate-[spin_16s_linear_infinite]" />
            <ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="url(#dashRingGrad2)" strokeWidth="1.2" transform="rotate(35 50 50)" className="motion-safe:animate-[spin_12s_linear_infinite_reverse]" />

            {/* Layered Neural Sphere */}
            <circle cx="50" cy="50" r="28" fill="url(#dashCoreGrad)" stroke="#67E8F9" strokeWidth="0.75" strokeOpacity="0.8" />

            {/* Internal Latitude/Longitude Energy Lines */}
            <ellipse cx="50" cy="50" rx="28" ry="10" fill="none" stroke="#60A5FA" strokeWidth="0.8" opacity="0.5" transform="rotate(15 50 50)" />
            <ellipse cx="50" cy="50" rx="10" ry="28" fill="none" stroke="#C084FC" strokeWidth="0.8" opacity="0.4" transform="rotate(15 50 50)" />

            {/* Specular Core Highlight */}
            <circle cx="40" cy="40" r="5" fill="#FFFFFF" opacity="0.85" filter="drop-shadow(0 0 4px #FFFFFF)" />
            
            {/* Micro Data Nodes (Orbital Particles) */}
            <circle cx="22" cy="38" r="1.5" fill="#38BDF8" className="motion-safe:animate-pulse" />
            <circle cx="78" cy="62" r="1.5" fill="#C084FC" className="motion-safe:animate-pulse" />
            <circle cx="68" cy="28" r="1.2" fill="#00FF66" />
            <circle cx="34" cy="72" r="1.2" fill="#A5F3FC" />
          </svg>
        </div>
      )}

      {/* 2. GALLERY: 3D Floating Stack of Photographs / Images */}
      {type === "gallery" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_5.2s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500/25 to-indigo-600/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(59,130,246,0.6)]">
            <defs>
              <linearGradient id="galCardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="galCardGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <linearGradient id="galNeonBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>

            {/* Back Card (Rotated -14 deg) */}
            <rect x="24" y="24" width="46" height="52" rx="7" fill="url(#galCardGrad1)" stroke="#38BDF8" strokeWidth="0.8" strokeOpacity="0.4" transform="rotate(-14 47 50)" />
            
            {/* Mid Card (Rotated +8 deg) */}
            <rect x="27" y="22" width="46" height="52" rx="7" fill="url(#galCardGrad2)" stroke="#818CF8" strokeWidth="0.9" strokeOpacity="0.6" transform="rotate(8 50 48)" />
            
            {/* Front Main Glass Photo Frame */}
            <rect x="25" y="20" width="50" height="56" rx="8" fill="#0B132B" stroke="url(#galNeonBorder)" strokeWidth="1.4" />
            
            {/* Inner Holographic Image Viewport */}
            <rect x="29" y="24" width="42" height="32" rx="5" fill="url(#dashRingGrad1)" opacity="0.3" />
            <circle cx="40" cy="36" r="4" fill="#38BDF8" opacity="0.9" />
            <polygon points="32,52 44,40 52,48 60,38 68,52" fill="#818CF8" opacity="0.8" />
            
            {/* Photo Metadata Indicators */}
            <rect x="29" y="61" width="24" height="3" rx="1.5" fill="#38BDF8" opacity="0.7" />
            <rect x="29" y="67" width="16" height="2.5" rx="1.2" fill="#94A3B8" opacity="0.5" />
            <circle cx="67" cy="64" r="2.5" fill="#00FF66" opacity="0.9" />
          </svg>
        </div>
      )}

      {/* 3. SEARCH: 3D Futuristic Magnifying Glass with Data Particles */}
      {type === "search" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.5s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(6,182,212,0.65)]">
            <defs>
              <radialGradient id="lensReflect" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.2" />
                <stop offset="90%" stopColor="#0284C7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0369A1" stopOpacity="0.8" />
              </radialGradient>
            </defs>

            {/* Target Reticle Orbit */}
            <circle cx="45" cy="45" r="32" fill="none" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.6" className="motion-safe:animate-[spin_20s_linear_infinite]" />
            <circle cx="45" cy="45" r="36" fill="none" stroke="#C084FC" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.4" className="motion-safe:animate-[spin_15s_linear_infinite_reverse]" />

            {/* 3D Magnifier Handle (Metallic Carbon) */}
            <line x1="64" y1="64" x2="86" y2="86" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
            <line x1="64" y1="64" x2="86" y2="86" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

            {/* Magnifier Outer Rim */}
            <circle cx="45" cy="45" r="24" fill="none" stroke="#38BDF8" strokeWidth="3.5" />
            <circle cx="45" cy="45" r="24" fill="url(#lensReflect)" stroke="#E0F2FE" strokeWidth="0.8" />

            {/* Reticle Crosshairs */}
            <line x1="45" y1="28" x2="45" y2="34" stroke="#E0F2FE" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="45" y1="56" x2="45" y2="62" stroke="#E0F2FE" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="28" y1="45" x2="34" y2="45" stroke="#E0F2FE" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="56" y1="45" x2="62" y2="45" stroke="#E0F2FE" strokeWidth="1.2" strokeLinecap="round" />

            {/* Central Target Dot */}
            <circle cx="45" cy="45" r="2.5" fill="#00FF66" className="motion-safe:animate-pulse" />

            {/* Floating Data Sparks */}
            <circle cx="20" cy="28" r="1.5" fill="#38BDF8" />
            <circle cx="75" cy="30" r="1.2" fill="#CCFF00" />
            <circle cx="24" cy="68" r="1.5" fill="#C084FC" />
          </svg>
        </div>
      )}

      {/* 4. COLLECTIONS: 3D Futuristic Folder / Album with floating image cards */}
      {type === "collections" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.8s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(99,102,241,0.6)]">
            <defs>
              <linearGradient id="colFolderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </linearGradient>
              <linearGradient id="colFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#312E81" />
              </linearGradient>
            </defs>

            {/* Back Folder Tab & Plate */}
            <path d="M22 34 Q22 30 26 30 L42 30 Q46 30 49 34 L54 38 Q56 40 60 40 L74 40 Q78 40 78 44 L78 72 Q78 76 74 76 L26 76 Q22 76 22 72 Z" fill="url(#colFolderGrad)" stroke="#818CF8" strokeWidth="1" />

            {/* Floating Mini Photo 1 (Behind Front Flap) */}
            <rect x="34" y="24" width="30" height="34" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" transform="rotate(-8 49 41)" />
            <circle cx="44" cy="34" r="2.5" fill="#38BDF8" transform="rotate(-8 49 41)" />

            {/* Floating Mini Photo 2 */}
            <rect x="42" y="26" width="30" height="34" rx="4" fill="#1E293B" stroke="#C084FC" strokeWidth="1" transform="rotate(10 57 43)" />
            <circle cx="52" cy="36" r="2.5" fill="#C084FC" transform="rotate(10 57 43)" />

            {/* Front Folder Flap (Perspective Isometric) */}
            <path d="M20 46 Q20 42 25 42 L75 42 Q80 42 80 46 L76 74 Q76 78 71 78 L25 78 Q20 78 20 74 Z" fill="url(#colFrontGrad)" stroke="#A5B4FC" strokeWidth="1.2" />

            {/* Front Holographic Badge */}
            <rect x="42" y="56" width="16" height="10" rx="3" fill="#38BDF8" opacity="0.3" stroke="#38BDF8" strokeWidth="0.8" />
            <circle cx="50" cy="61" r="2" fill="#E0F2FE" />
          </svg>
        </div>
      )}

      {/* 5. FAVORITES: 3D Glowing Heart with Light Particles */}
      {type === "favorites" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[pulse_3s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(244,63,94,0.7)]">
            <defs>
              <radialGradient id="favHeartGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FDA4AF" />
                <stop offset="35%" stopColor="#F43F5E" />
                <stop offset="75%" stopColor="#BE123C" />
                <stop offset="100%" stopColor="#4C0519" />
              </radialGradient>
            </defs>

            {/* Outer Light Halo */}
            <path
              d="M50 82 C50 82 18 58 18 36 C18 22 28 16 38 16 C45 16 50 22 50 22 C50 22 55 16 62 16 C72 16 82 22 82 36 C82 58 50 82 50 82 Z"
              fill="none"
              stroke="#FDA4AF"
              strokeWidth="0.8"
              strokeDasharray="4 4"
              opacity="0.6"
              className="motion-safe:animate-[spin_18s_linear_infinite]"
            />

            {/* 3D Heart Body */}
            <path
              d="M50 78 C50 78 22 56 22 36 C22 24 30 18 40 18 C46 18 50 23 50 23 C50 23 54 18 60 18 C70 18 78 24 78 36 C78 56 50 78 50 78 Z"
              fill="url(#favHeartGrad)"
              stroke="#FFE4E6"
              strokeWidth="1.2"
            />

            {/* Specular Highlight Reflections */}
            <ellipse cx="36" cy="28" rx="6" ry="4" fill="#FFFFFF" opacity="0.65" transform="rotate(-30 36 28)" />
            <ellipse cx="64" cy="28" rx="3" ry="2" fill="#FFFFFF" opacity="0.4" transform="rotate(30 64 28)" />

            {/* Floating Sparkles */}
            <circle cx="20" cy="40" r="1.5" fill="#FDA4AF" className="motion-safe:animate-pulse" />
            <circle cx="80" cy="42" r="1.5" fill="#FDA4AF" className="motion-safe:animate-pulse" />
            <circle cx="50" cy="12" r="1.5" fill="#FFE4E6" />
          </svg>
        </div>
      )}

      {/* 6. TRASH: 3D Futuristic Cyber Laser Canister with Disappearing Particles */}
      {type === "trash" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_5s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-red-600/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(239,68,68,0.6)]">
            <defs>
              <linearGradient id="trashBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#18181B" />
                <stop offset="50%" stopColor="#27272A" />
                <stop offset="100%" stopColor="#09090B" />
              </linearGradient>
            </defs>

            {/* Top Laser Lid */}
            <rect x="28" y="24" width="44" height="6" rx="3" fill="#DC2626" stroke="#FCA5A5" strokeWidth="1" />
            <rect x="42" y="19" width="16" height="5" rx="2" fill="#991B1B" stroke="#F87171" strokeWidth="0.8" />

            {/* Canister Body */}
            <path d="M32 30 L37 76 Q38 80 43 80 L57 80 Q62 80 63 76 L68 30 Z" fill="url(#trashBodyGrad)" stroke="#EF4444" strokeWidth="1.2" />

            {/* Cyber Disintegration Laser Grid Slots */}
            <line x1="39" y1="40" x2="61" y2="40" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="41" y1="52" x2="59" y2="52" stroke="#F87171" strokeWidth="1.2" />
            <line x1="43" y1="64" x2="57" y2="64" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="2 2" />

            {/* Disappearing Particles entering top */}
            <circle cx="48" cy="15" r="1.5" fill="#FCA5A5" className="motion-safe:animate-pulse" />
            <circle cx="56" cy="12" r="1.2" fill="#EF4444" />
            <circle cx="40" cy="14" r="1.0" fill="#FECACA" />
          </svg>
        </div>
      )}

      {/* 7. IMPORT: 3D Upload Tray / Cloud Capsule with Floating Data Particles */}
      {type === "import" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.5s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(16,185,129,0.65)]">
            <defs>
              <linearGradient id="impCapsuleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#064E3B" />
                <stop offset="100%" stopColor="#022C22" />
              </linearGradient>
            </defs>

            {/* Orbiting Ring */}
            <ellipse cx="50" cy="50" rx="38" ry="16" fill="none" stroke="#34D399" strokeWidth="0.9" strokeDasharray="4 4" transform="rotate(-15 50 50)" className="motion-safe:animate-[spin_14s_linear_infinite]" />

            {/* Upload Capsule Base */}
            <rect x="22" y="36" width="56" height="42" rx="12" fill="url(#impCapsuleGrad)" stroke="#10B981" strokeWidth="1.4" />
            <rect x="28" y="42" width="44" height="30" rx="8" fill="#065F46" opacity="0.4" stroke="#6EE7B7" strokeWidth="0.8" />

            {/* 3D Arrow Up with Neon Glow */}
            <path d="M50 20 L36 34 L45 34 L45 52 L55 52 L55 34 L64 34 Z" fill="#34D399" stroke="#A7F3D0" strokeWidth="1" className="motion-safe:animate-bounce" />

            {/* Incoming Data Nodes */}
            <circle cx="28" cy="24" r="1.5" fill="#6EE7B7" />
            <circle cx="72" cy="22" r="1.8" fill="#A7F3D0" />
            <circle cx="68" cy="68" r="1.2" fill="#00FF66" />
          </svg>
        </div>
      )}

      {/* 8. SNAPDASH: 3D Futuristic Game Controller / Energy Cube */}
      {type === "snapdash" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.2s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-purple-600/30 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(168,85,247,0.7)]">
            <defs>
              <linearGradient id="gameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7E22CE" />
                <stop offset="50%" stopColor="#581C87" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </linearGradient>
            </defs>

            {/* Cyber Gamepad Outer Frame */}
            <path d="M22 42 Q16 48 18 64 Q20 74 32 72 L42 66 L58 66 L68 72 Q80 74 82 64 Q84 48 78 42 Q72 36 50 38 Q28 36 22 42 Z" fill="url(#gameGrad)" stroke="#C084FC" strokeWidth="1.4" />

            {/* D-Pad on Left */}
            <rect x="28" y="48" width="12" height="4" rx="1.5" fill="#E9D5FF" />
            <rect x="32" y="44" width="4" height="12" rx="1.5" fill="#E9D5FF" />

            {/* Action Diamond Buttons on Right */}
            <circle cx="68" cy="46" r="2" fill="#CCFF00" />
            <circle cx="74" cy="50" r="2" fill="#00FF66" />
            <circle cx="62" cy="50" r="2" fill="#38BDF8" />
            <circle cx="68" cy="54" r="2" fill="#F43F5E" />

            {/* Center Status Display */}
            <rect x="44" y="48" width="12" height="6" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.8" />
            <circle cx="50" cy="51" r="1.5" fill="#38BDF8" className="motion-safe:animate-ping" />
          </svg>
        </div>
      )}

      {/* 9. PLANS & PRICING: 3D Premium Crystal / Pro Orb with Refractive Facets */}
      {type === "pricing" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_5s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(59,130,246,0.7)]">
            <defs>
              <linearGradient id="crystGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAE6FD" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="crystGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
              <linearGradient id="crystGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E40AF" />
                <stop offset="100%" stopColor="#0B132B" />
              </linearGradient>
            </defs>

            {/* Orbital Golden/Cyan Ring */}
            <ellipse cx="50" cy="50" rx="42" ry="15" fill="none" stroke="#60A5FA" strokeWidth="1" strokeDasharray="3 3" transform="rotate(20 50 50)" className="motion-safe:animate-[spin_15s_linear_infinite]" />

            {/* 3D Faceted Octahedron / Crystal */}
            <polygon points="50,14 74,42 50,56 26,42" fill="url(#crystGrad1)" stroke="#E0F2FE" strokeWidth="0.8" />
            <polygon points="50,56 74,42 50,86" fill="url(#crystGrad2)" stroke="#93C5FD" strokeWidth="0.8" />
            <polygon points="50,56 26,42 50,86" fill="url(#crystGrad3)" stroke="#60A5FA" strokeWidth="0.8" />

            {/* Inner Refractive Specular Core */}
            <circle cx="50" cy="46" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #FFFFFF)" />
          </svg>
        </div>
      )}

      {/* 10. NOTIFICATIONS: 3D Futuristic Bell with Signal Waves */}
      {type === "notifications" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.6s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-amber-500/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(245,158,11,0.65)]">
            <defs>
              <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#78350F" />
              </linearGradient>
            </defs>

            {/* Radar Sound Waves */}
            <path d="M22 34 Q14 50 22 66" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" className="motion-safe:animate-pulse" />
            <path d="M78 34 Q86 50 78 66" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" className="motion-safe:animate-pulse" />

            {/* Top Loop */}
            <circle cx="50" cy="22" r="4" fill="none" stroke="#FDE68A" strokeWidth="2" />

            {/* Bell Dome */}
            <path d="M50 26 Q36 28 36 48 L32 64 L68 64 L64 48 Q64 28 50 26 Z" fill="url(#bellGrad)" stroke="#FEF3C7" strokeWidth="1.2" />

            {/* Clapper Base */}
            <ellipse cx="50" cy="64" rx="18" ry="4" fill="#B45309" stroke="#FDE68A" strokeWidth="1" />
            <circle cx="50" cy="72" r="5" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.2" />
          </svg>
        </div>
      )}

      {/* 11. SETTINGS: 3D Titanium Precision Gear / Circuit Object */}
      {type === "settings" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_5s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-slate-400/20 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(148,163,184,0.5)]">
            <defs>
              <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
            </defs>

            {/* Outer Circuit Orbit */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.6" className="motion-safe:animate-[spin_18s_linear_infinite]" />

            {/* 3D Gear Teeth (12 points) */}
            <g className="motion-safe:animate-[spin_14s_linear_infinite]">
              <path
                d="M46 16 L54 16 L56 22 L62 25 L68 21 L74 27 L70 33 L73 39 L79 41 L79 49 L73 51 L70 57 L74 63 L68 69 L62 65 L56 68 L54 74 L46 74 L44 68 L38 65 L32 69 L26 63 L30 57 L27 51 L21 49 L21 41 L27 39 L30 33 L26 27 L32 21 L38 25 L44 22 Z"
                fill="url(#gearGrad)"
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <circle cx="50" cy="45" r="14" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.2" />
              <circle cx="50" cy="45" r="6" fill="#38BDF8" opacity="0.8" />
            </g>
          </svg>
        </div>
      )}

      {/* 12. ACCOUNT: 3D Biometric User / Profile Orb */}
      {type === "account" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.8s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-blue-600/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(59,130,246,0.65)]">
            <defs>
              <radialGradient id="userOrbGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="45%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#0F172A" />
              </radialGradient>
            </defs>

            {/* Outer Biometric Scan Ring */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#60A5FA" strokeWidth="1" strokeDasharray="6 4" className="motion-safe:animate-[spin_12s_linear_infinite]" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#C084FC" strokeWidth="0.6" strokeDasharray="3 6" className="motion-safe:animate-[spin_16s_linear_infinite_reverse]" />

            {/* Center Identity Sphere */}
            <circle cx="50" cy="50" r="28" fill="url(#userOrbGrad)" stroke="#DBEAFE" strokeWidth="1" />

            {/* Stylized Avatar Head & Shoulders */}
            <circle cx="50" cy="42" r="7" fill="#FFFFFF" opacity="0.9" />
            <path d="M38 64 C38 54 44 52 50 52 C56 52 62 54 62 64 Z" fill="#FFFFFF" opacity="0.85" />
          </svg>
        </div>
      )}

      {/* 13. GIVE FEEDBACK: 3D Holographic Chat Bubble with Signal Particles */}
      {type === "feedback" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.4s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-teal-500/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(20,184,166,0.65)]">
            <defs>
              <linearGradient id="feedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2DD4BF" />
                <stop offset="50%" stopColor="#0F766E" />
                <stop offset="100%" stopColor="#042F2E" />
              </linearGradient>
            </defs>

            {/* Chat Bubble Body */}
            <path d="M22 30 Q22 22 30 22 L70 22 Q78 22 78 30 L78 58 Q78 66 70 66 L42 66 L30 78 L32 66 L30 66 Q22 66 22 58 Z" fill="url(#feedGrad)" stroke="#99F6E4" strokeWidth="1.4" />

            {/* Pulsing Audio/Signal Dots */}
            <circle cx="38" cy="44" r="3.5" fill="#FFFFFF" className="motion-safe:animate-pulse" />
            <circle cx="50" cy="44" r="3.5" fill="#5EEAD4" className="motion-safe:animate-pulse" />
            <circle cx="62" cy="44" r="3.5" fill="#FFFFFF" className="motion-safe:animate-pulse" />
          </svg>
        </div>
      )}

      {/* 14. FOUNDER SECTION: 3D GOLDEN CROWN with Golden Lighting & Particles */}
      {type === "founder" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.2s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-amber-400/35 blur-xl" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(234,179,8,0.85)]">
            <defs>
              <radialGradient id="crownCoreGold" cx="40%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="35%" stopColor="#FACC15" />
                <stop offset="70%" stopColor="#CA8A04" />
                <stop offset="100%" stopColor="#713F12" />
              </radialGradient>
              <linearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#EAB308" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#CA8A04" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Orbiting Golden Halo */}
            <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="url(#goldRingGrad)" strokeWidth="1.2" strokeDasharray="4 3" transform="rotate(-15 50 50)" className="motion-safe:animate-[spin_12s_linear_infinite]" />

            {/* 3D Imperial Crown Peaks & Body */}
            <path
              d="M20 68 L16 32 L34 46 L50 22 L66 46 L84 32 L80 68 Z"
              fill="url(#crownCoreGold)"
              stroke="#FEF9C3"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Crown Base Rim */}
            <rect x="18" y="68" width="64" height="9" rx="3" fill="#A16207" stroke="#FEF08A" strokeWidth="1.2" />

            {/* Crown Jewels (Ruby/Emerald/Diamond) */}
            <circle cx="16" cy="30" r="3.5" fill="#FEF08A" filter="drop-shadow(0 0 4px #FEF08A)" />
            <circle cx="50" cy="20" r="4.5" fill="#FFFFFF" filter="drop-shadow(0 0 6px #FFFFFF)" />
            <circle cx="84" cy="30" r="3.5" fill="#FEF08A" filter="drop-shadow(0 0 4px #FEF08A)" />

            {/* Base Gems */}
            <circle cx="30" cy="72.5" r="2" fill="#22C55E" />
            <circle cx="50" cy="72.5" r="2.5" fill="#EF4444" />
            <circle cx="70" cy="72.5" r="2" fill="#3B82F6" />

            {/* Golden Floating Sparks */}
            <circle cx="15" cy="48" r="1.5" fill="#FEF08A" className="motion-safe:animate-pulse" />
            <circle cx="85" cy="48" r="1.5" fill="#FEF08A" className="motion-safe:animate-pulse" />
            <circle cx="50" cy="8" r="1.8" fill="#FACC15" />
          </svg>
        </div>
      )}

      {/* 15. TIMELINE: 3D Chrono Dial / Temporal Orbit Ring */}
      {type === "timeline" && (
        <div className="relative w-full h-full flex items-center justify-center motion-safe:animate-[float_4.6s_ease-in-out_infinite]">
          {glow && (
            <div className="absolute inset-0 rounded-full bg-cyan-500/25 blur-lg" />
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(6,182,212,0.6)]">
            <defs>
              <linearGradient id="timeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>

            {/* Outer Chrono Ring with Ticks */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="#0E7490" strokeWidth="1" strokeDasharray="2 6" className="motion-safe:animate-[spin_24s_linear_infinite]" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="url(#timeRingGrad)" strokeWidth="1.5" />

            {/* Inner Chrono Core Plate */}
            <circle cx="50" cy="50" r="24" fill="#0B132B" stroke="#38BDF8" strokeWidth="1" />
            
            {/* Clock Hands / Time Vectors */}
            <line x1="50" y1="50" x2="50" y2="34" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="50" x2="64" y2="50" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="50" r="3" fill="#FFFFFF" />

            {/* Orbital Timeline Markers */}
            <circle cx="50" cy="16" r="2" fill="#22D3EE" className="motion-safe:animate-pulse" />
            <circle cx="84" cy="50" r="2" fill="#818CF8" className="motion-safe:animate-pulse" />
            <circle cx="50" cy="84" r="2" fill="#CCFF00" />
            <circle cx="16" cy="50" r="2" fill="#00FF66" />
          </svg>
        </div>
      )}
    </div>
  );
};
