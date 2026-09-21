import React, { useState, useEffect } from "react";
import { Gamepad2, Trophy, Shield, Zap, Sparkles, User, Info, ArrowLeft } from "lucide-react";
import { UserProfile, NavViewType } from "../../types";
import { SnapDashGame } from "./SnapDashGame";
import { LeaderboardCard } from "./LeaderboardCard";
import { GameUsernameModal } from "./GameUsernameModal";
import { GameService } from "../../services/gameService";
import { GiveFeedbackButton } from "../feedback/GiveFeedbackButton";
import { PageHeroHeader } from "../PageHeroHeader";

interface SnapDashPageViewProps {
  user: UserProfile | null;
  onNavigate?: (view: NavViewType) => void;
  onOpenFeedback: (pageContext: string) => void;
  onOpenAuthModal?: () => void;
  isDark?: boolean;
}

export const SnapDashPageView: React.FC<SnapDashPageViewProps> = ({
  user,
  onNavigate,
  onOpenFeedback,
  onOpenAuthModal,
  isDark = true,
}) => {
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState<boolean>(false);
  const [pilotUsername, setPilotUsername] = useState<string>("");
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);

  useEffect(() => {
    GameService.getGameProfile(user).then((res) => {
      setPilotUsername(res.suggestedUsername);
      if (!res.hasCustomUsername && user?.isLoggedIn) {
        // Optional welcome prompt
        setIsFirstTime(false);
      }
    });
  }, [user?.id]);

  const handleUsernameUpdated = (newName: string) => {
    setPilotUsername(newName);
  };

  return (
    <div
      id="snapdash-page-view"
      className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6 animate-fadeIn"
    >
      {/* Top 3D Game Hero Header */}
      <PageHeroHeader
        type="snapdash"
        title="SnapDash Cyber Flight"
        subtitle="Endless cyber flight runner. Dodge neural obstacles, collect OCR core gems, and climb the real-time global leaderboard."
        isDark={isDark}
        actions={
          <div className="flex items-center gap-2.5">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("gallery")}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors md:hidden cursor-pointer"
                aria-label="Back to Gallery"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsUsernameModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[120px]">Pilot: {pilotUsername || "Pilot"}</span>
            </button>
          </div>
        }
      />

      {/* Main Content Layout: Game on Left/Center, Leaderboard on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Game Stage Area (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <SnapDashGame
            user={user}
            onOpenLeaderboard={() => {
              const el = document.getElementById("snapdash-leaderboard-card");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            onOpenAuthModal={onOpenAuthModal}
          />

          {/* Quick Pilot Instructions & Powerups */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>OCR Spark Gems</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Collect floating blue energy crystals to gain <strong className="text-slate-200">+50 points</strong> on your flight score.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>2X Overclock Boost</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Grab glowing amber cores for <strong className="text-slate-200">+250 pts</strong> and 6 seconds of double score multiplier.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Double Jump Thruster</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Tap jump twice in mid-air to fire your plasma booster and clear tall spike clusters with ease.
              </p>
            </div>
          </div>
        </div>

        {/* Global Leaderboard & Pilot Stats Area (4 cols on lg) */}
        <div className="lg:col-span-4">
          <LeaderboardCard
            user={user}
            onEditUsername={() => setIsUsernameModalOpen(true)}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Bottom Feedback Bar */}
      <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          <span>Have an idea for a new obstacle, skin, or power-up in SnapDash?</span>
        </div>
        <GiveFeedbackButton
          onClick={() => onOpenFeedback("SnapDash Mini-Game")}
          currentPage="SnapDash Mini-Game"
          isDark={isDark}
        />
      </div>

      {/* Username Modal */}
      <GameUsernameModal
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
        user={user}
        currentUsername={pilotUsername}
        onUsernameUpdated={handleUsernameUpdated}
        isFirstTime={isFirstTime}
      />
    </div>
  );
};
