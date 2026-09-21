import React from "react";
import { useAuth } from "../context/AuthContext";
import { PageHero3D, PageHero3DType } from "./PageHero3D";
import { Lock, LogIn, Shield } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onOpenAuth: () => void;
  isDark: boolean;
  title?: string;
  description?: string;
  heroType?: PageHero3DType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onOpenAuth,
  isDark,
  title = "Sign in to access your snaps",
  description = "Your screenshots, smart tags, and private AI index are encrypted and isolated to your authenticated account.",
  heroType = "gallery",
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4 text-center select-none">
        <div className="w-9 h-9 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(204,255,0,0.3)]" />
        <p className="text-xs text-slate-400 font-medium">Verifying your secure session...</p>
      </div>
    );
  }

  // If user is not logged in, display the strict privacy gate
  if (!user || !user.isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto select-none">
        <div className="relative mb-6">
          <PageHero3D type={heroType} size="xl" glow={true} />
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#0D1117] border border-white/10 shadow-lg text-[#CCFF00]">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          {title}
        </h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md mb-8">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button
            type="button"
            id="protected-gate-sign-in-btn"
            onClick={onOpenAuth}
            className="w-full py-3 px-6 rounded-xl bg-[#CCFF00] hover:bg-[#D9FF33] text-[#07090D] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(204,255,0,0.3)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Vault</span>
          </button>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-[#64748B]">
          <Shield className="w-3.5 h-3.5 text-[#00FF66]" />
          <span>Zero Knowledge Privacy &bull; Isolated Cloud Storage</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

