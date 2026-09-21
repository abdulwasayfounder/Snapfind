import React, { useState } from "react";
import { Trophy, RotateCcw, Share2, Sparkles, LogIn, Check, Award } from "lucide-react";
import { UserProfile } from "../../types";

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  isNewBest: boolean;
  userRank: number | null;
  user: UserProfile | null;
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
  onOpenAuthModal?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore,
  isNewBest,
  userRank,
  user,
  onPlayAgain,
  onOpenLeaderboard,
  onOpenAuthModal,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  if (!isOpen) return null;

  const isGuest = !user || !user.isLoggedIn;

  const handleShare = () => {
    const text = `🎮 I just scored ${score.toLocaleString()} points on SnapDash in SnapFind AI! Can you beat my high score?`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      id="game-over-modal-overlay"
      className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="game-over-card"
        className="w-full max-w-sm rounded-2xl p-6 text-center bg-[#07090D] text-slate-100 border border-slate-800 shadow-[0_0_60px_rgba(59,130,246,0.2)] space-y-5"
      >
        {/* Header Badge */}
        <div className="space-y-1">
          {isNewBest ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Personal Best!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Game Over</span>
            </div>
          )}
          <h2 className="text-2xl font-extrabold text-white tracking-tight pt-1">
            {isNewBest ? "Outstanding Run!" : "Flight Terminated"}
          </h2>
        </div>

        {/* Score Display */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Final Score
            </span>
            <div className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-500 font-medium">Best Score</span>
              <div className="text-slate-200 font-bold flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{Math.max(score, highScore).toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-500 font-medium">Global Rank</span>
              <div className="text-cyan-400 font-bold flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-cyan-400" />
                <span>{userRank ? `#${userRank}` : isGuest ? "Unranked" : "Top 100"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Warning / CTA */}
        {isGuest && (
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-left flex items-start gap-2.5">
            <LogIn className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Save your high score:</span> Sign in to claim your rank on the global leaderboard.
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="block mt-1 text-blue-400 hover:text-blue-300 font-bold underline"
                >
                  Sign In / Register →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            id="play-again-btn"
            onClick={onPlayAgain}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (Space)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="view-leaderboard-btn"
              onClick={onOpenLeaderboard}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard</span>
            </button>
            <button
              type="button"
              id="share-score-btn"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Share Score</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
