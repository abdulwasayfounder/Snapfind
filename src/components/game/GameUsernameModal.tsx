import React, { useState } from "react";
import { X, Trophy, Check, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { GameService } from "../../services/gameService";
import { UserProfile } from "../../types";

interface GameUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  currentUsername: string;
  onUsernameUpdated: (newUsername: string) => void;
  isFirstTime?: boolean;
}

export const GameUsernameModal: React.FC<GameUsernameModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUsername,
  onUsernameUpdated,
  isFirstTime = false,
}) => {
  const [username, setUsername] = useState<string>(currentUsername || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean.length < 3) {
      setErrorMsg("Username must be at least 3 characters long.");
      return;
    }
    if (clean.length > 20) {
      setErrorMsg("Username cannot exceed 20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(clean)) {
      setErrorMsg("Only letters, numbers, spaces, and underscores allowed.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await GameService.setGameUsername(clean, user);
      if (res.success) {
        onUsernameUpdated(clean);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to update game username.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="game-username-modal-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="game-username-modal-container"
        className="relative w-full max-w-md rounded-2xl p-6 md:p-8 bg-[#090D14] text-slate-100 border border-slate-800 shadow-[0_0_50px_rgba(59,130,246,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {isFirstTime ? "Welcome to SnapDash!" : "Customize Pilot Name"}
              </h2>
              <p className="text-xs text-slate-400">
                {isFirstTime ? "Choose your leaderboard name" : "Your in-game identity on leaderboards"}
              </p>
            </div>
          </div>
          {!isFirstTime && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="game-username-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Game Pilot Name
            </label>
            <input
              id="game-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              placeholder="e.g. CyberRunner"
              autoFocus
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-medium transition-all"
            />
            <p className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>3–20 characters (letters, numbers, spaces)</span>
              <span>{username.length}/20</span>
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            {!isFirstTime && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              id="save-game-username-btn"
              disabled={isLoading || username.trim().length < 3}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isFirstTime ? "Start Flying" : "Save Username"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
