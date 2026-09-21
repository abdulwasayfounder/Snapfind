import React, { useState, useEffect } from "react";
import { Trophy, Award, RefreshCw, User, Crown, Sparkles, Flame, Shield, Edit3 } from "lucide-react";
import { LeaderboardEntry, UserGameStats, UserProfile } from "../../types";
import { GameService } from "../../services/gameService";

interface LeaderboardCardProps {
  user: UserProfile | null;
  onEditUsername?: () => void;
  isDark?: boolean;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  user,
  onEditUsername,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<"global" | "personal">("global");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<UserGameStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchBoardData = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const [boardRes, statsRes] = await Promise.all([
        GameService.getLeaderboard(user, 50),
        GameService.getUserStats(user),
      ]);
      setLeaderboard(boardRes.leaderboard);
      setUserRank(boardRes.userRank);
      setUserStats(statsRes);
    } catch (err) {
      console.warn("[LeaderboardCard] Fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchBoardData();

    // Subscribe to real-time updates
    const unsubscribe = GameService.subscribeLeaderboard(user, (entries, rank) => {
      setLeaderboard(entries);
      setUserRank(rank);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const renderMedal = (rank: number) => {
    if (rank === 1) return <span className="text-base" title="1st Place Champion">🥇</span>;
    if (rank === 2) return <span className="text-base" title="2nd Place">🥈</span>;
    if (rank === 3) return <span className="text-base" title="3rd Place">🥉</span>;
    return <span className="text-xs font-bold text-slate-500 font-mono">#{rank}</span>;
  };

  return (
    <div
      id="snapdash-leaderboard-card"
      className={`rounded-2xl border flex flex-col h-full overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-[#0A0E14] text-slate-100 border-slate-800/80 shadow-xl shadow-black/40"
          : "bg-white text-slate-900 border-slate-200 shadow-md"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>SnapDash Arena</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Real-time global high scores</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchBoardData(true)}
          disabled={isRefreshing}
          aria-label="Refresh leaderboard"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border-b border-slate-800/60 gap-1 text-xs font-semibold">
        <button
          type="button"
          id="tab-global-leaderboard"
          onClick={() => setActiveTab("global")}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "global"
              ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Global Top 50</span>
        </button>
        <button
          type="button"
          id="tab-my-stats"
          onClick={() => setActiveTab("personal")}
          className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "personal"
              ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>My Pilot Stats</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto max-h-[460px] p-3 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <p className="text-xs text-slate-400">Loading flight telemetry...</p>
          </div>
        ) : activeTab === "global" ? (
          leaderboard.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No flight records logged yet.</p>
              <p className="text-[11px] text-slate-500">Be the first to set a high score!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((entry) => {
                const isYou = entry.isCurrentUser;
                return (
                  <div
                    key={`${entry.userId}-${entry.rank}`}
                    id={`leaderboard-row-${entry.rank}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isYou
                        ? "bg-blue-600/15 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Rank & Pilot Name */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-7 flex items-center justify-center flex-shrink-0">
                        {renderMedal(entry.rank)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold truncate ${
                              isYou ? "text-blue-300" : "text-white"
                            }`}
                          >
                            {entry.gameUsername}
                          </span>
                          {isYou && (
                            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-300 border border-blue-400/40">
                              YOU
                            </span>
                          )}
                          {entry.isFounder && (
                            <span title="Founder Pioneer">
                              <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-xs font-black font-mono text-cyan-400">
                        {entry.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 block">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Personal Stats Tab */
          <div className="space-y-4 py-2">
            {/* Identity Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/30 to-indigo-950/40 border border-blue-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-white">
                        {userStats?.gameUsername || "Guest Pilot"}
                      </span>
                      {user?.entitlement?.isFounder && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          <Crown className="w-3 h-3" /> Founder
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">SnapDash Pilot</span>
                  </div>
                </div>

                {onEditUsername && (
                  <button
                    type="button"
                    onClick={onEditUsername}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Change Pilot Name"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Personal Best</span>
                </span>
                <div className="text-xl font-black text-white font-mono">
                  {(userStats?.personalBest || 0).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Award className="w-3 h-3 text-cyan-400" />
                  <span>Global Rank</span>
                </span>
                <div className="text-xl font-black text-cyan-400 font-mono">
                  {userRank ? `#${userRank}` : user?.isLoggedIn ? "Top 100" : "Unranked"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Total Sorties Flown</span>
                </span>
                <div className="text-lg font-extrabold text-slate-200">
                  {userStats?.totalGamesPlayed || 0} flights logged
                </div>
              </div>
            </div>

            {(!user || !user.isLoggedIn) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
                💡 <span className="font-semibold text-amber-200">Guest flight mode active:</span> Your scores are kept in browser memory. Sign in to permanently save your rankings on the global leaderboard.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
