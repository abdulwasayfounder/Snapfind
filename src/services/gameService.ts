import { GameProfile, GameScoreRecord, LeaderboardEntry, UserGameStats, UserProfile } from "../types";
import { supabase, isSupabaseConfigured } from "./supabase";

const LOCAL_GUEST_BEST_KEY = "snapdash_guest_high_score_v1";
const LOCAL_SOUND_MUTED_KEY = "snapdash_sound_muted_v1";
const LOCAL_CUSTOM_USERNAME_KEY = "snapdash_guest_username_v1";

type LeaderboardListener = (entries: LeaderboardEntry[], userRank: number | null) => void;

class GameServiceClass {
  private audioCtx: AudioContext | null = null;
  private soundMuted: boolean = false;
  private leaderboardListeners: Set<LeaderboardListener> = new Set();
  private realtimeChannel: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.soundMuted = localStorage.getItem(LOCAL_SOUND_MUTED_KEY) === "true";
      } catch {
        this.soundMuted = false;
      }
    }
  }

  // ==========================================
  // AUDIO & SOUND SYNTHESIZER (Web Audio API)
  // ==========================================

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isMuted(): boolean {
    return this.soundMuted;
  }

  public toggleMute(): boolean {
    this.soundMuted = !this.soundMuted;
    try {
      localStorage.setItem(LOCAL_SOUND_MUTED_KEY, this.soundMuted ? "true" : "false");
    } catch {}
    return this.soundMuted;
  }

  /**
   * Play dynamic synth sound for Jump
   */
  public playJumpSound(): void {
    if (this.soundMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  }

  /**
   * Play dynamic synth sound for Collectible Gem / Orb
   */
  public playCollectSound(): void {
    if (this.soundMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(880, now + 0.05); // A5
      osc1.frequency.setValueAtTime(1318.51, now + 0.1); // E6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);
    } catch {}
  }

  /**
   * Play dynamic synth sound for Crash / Game Over
   */
  public playCrashSound(): void {
    if (this.soundMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  /**
   * Play celebration sound for New High Score
   */
  public playHighScoreFanfare(): void {
    if (this.soundMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0.2, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.2);
      });
    } catch {}
  }

  /**
   * Trigger light mobile haptic feedback if supported
   */
  public triggerHaptic(durationMs = 25): void {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {}
    }
  }

  // ==========================================
  // USERNAME & PROFILE MANAGEMENT
  // ==========================================

  public getGuestBestScore(): number {
    try {
      const raw = localStorage.getItem(LOCAL_GUEST_BEST_KEY);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  public saveGuestBestScore(score: number): void {
    try {
      const current = this.getGuestBestScore();
      if (score > current) {
        localStorage.setItem(LOCAL_GUEST_BEST_KEY, score.toString());
      }
    } catch {}
  }

  public getGuestCustomUsername(): string {
    try {
      return localStorage.getItem(LOCAL_CUSTOM_USERNAME_KEY) || "Guest Pilot";
    } catch {
      return "Guest Pilot";
    }
  }

  public saveGuestCustomUsername(name: string): void {
    try {
      localStorage.setItem(LOCAL_CUSTOM_USERNAME_KEY, name.trim());
    } catch {}
  }

  /**
   * Fetch current authenticated user's game profile
   */
  public async getGameProfile(user?: UserProfile | null): Promise<{
    profile: GameProfile | null;
    suggestedUsername: string;
    hasCustomUsername: boolean;
  }> {
    const isGuest = !user || !user.isLoggedIn || !user.id || user.id === "guest";
    if (isGuest) {
      return {
        profile: null,
        suggestedUsername: this.getGuestCustomUsername(),
        hasCustomUsername: Boolean(localStorage.getItem(LOCAL_CUSTOM_USERNAME_KEY)),
      };
    }

    try {
      // 1. Try server API
      const res = await fetch("/api/game/profile", {
        headers: { "x-user-id": user.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          return {
            profile: data.profile,
            suggestedUsername: data.profile.gameUsername || data.profile.game_username,
            hasCustomUsername: true,
          };
        } else if (data.suggestedUsername) {
          return {
            profile: null,
            suggestedUsername: data.suggestedUsername,
            hasCustomUsername: false,
          };
        }
      }
    } catch (err) {
      console.warn("[GameService] Server profile fetch error:", err);
    }

    // 2. Fallback to Supabase direct query
    if (isSupabaseConfigured && user.id) {
      try {
        const { data, error } = await supabase
          .from("game_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          return {
            profile: data as GameProfile,
            suggestedUsername: data.game_username,
            hasCustomUsername: true,
          };
        }
      } catch (err) {
        console.warn("[GameService] Supabase profile query error:", err);
      }
    }

    const defaultName = `Pilot_${user.id.slice(0, 5)}`;
    return {
      profile: null,
      suggestedUsername: defaultName,
      hasCustomUsername: false,
    };
  }

  /**
   * Set or update game username
   */
  public async setGameUsername(
    gameUsername: string,
    user?: UserProfile | null
  ): Promise<{ success: boolean; profile?: GameProfile; error?: string }> {
    const clean = gameUsername.trim();
    if (clean.length < 3 || clean.length > 20) {
      return { success: false, error: "Username must be between 3 and 20 characters." };
    }

    const isGuest = !user || !user.isLoggedIn || !user.id || user.id === "guest";
    if (isGuest) {
      this.saveGuestCustomUsername(clean);
      return { success: true };
    }

    try {
      const res = await fetch("/api/game/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ userId: user.id, gameUsername: clean }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update game username." };
      }

      return { success: true, profile: data.profile };
    } catch (err: any) {
      console.error("[GameService] Username update error:", err);
      return { success: false, error: err?.message || "Network error updating username." };
    }
  }

  // ==========================================
  // SCORE SUBMISSION (Anti-Cheat Server + DB)
  // ==========================================

  public async submitScore(
    score: number,
    durationSeconds: number,
    user?: UserProfile | null
  ): Promise<{
    success: boolean;
    highScore: number;
    isNewBest: boolean;
    currentRank: number | null;
    error?: string;
  }> {
    const isGuest = !user || !user.isLoggedIn || !user.id || user.id === "guest";

    if (isGuest) {
      const prevBest = this.getGuestBestScore();
      const isNewBest = score > prevBest;
      if (isNewBest) {
        this.saveGuestBestScore(score);
      }
      return {
        success: true,
        highScore: Math.max(prevBest, score),
        isNewBest,
        currentRank: null,
      };
    }

    try {
      const res = await fetch("/api/game/submit-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          userId: user.id,
          score,
          durationSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          highScore: score,
          isNewBest: false,
          currentRank: null,
          error: data.error || "Score could not be recorded.",
        };
      }

      return {
        success: true,
        highScore: data.highScore,
        isNewBest: Boolean(data.isNewBest),
        currentRank: data.currentRank || null,
      };
    } catch (err: any) {
      console.error("[GameService] Score submission error:", err);
      return {
        success: false,
        highScore: score,
        isNewBest: false,
        currentRank: null,
        error: err?.message || "Score submission network error.",
      };
    }
  }

  // ==========================================
  // LEADERBOARD & REAL-TIME ENGINE
  // ==========================================

  public async getLeaderboard(
    user?: UserProfile | null,
    limit = 50
  ): Promise<{ leaderboard: LeaderboardEntry[]; userRank: number | null }> {
    const userId = user?.isLoggedIn && user.id ? user.id : "guest";

    try {
      const res = await fetch(`/api/game/leaderboard?limit=${limit}`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leaderboard)) {
          return {
            leaderboard: data.leaderboard,
            userRank: data.userRank || null,
          };
        }
      }
    } catch (err) {
      console.warn("[GameService] Leaderboard fetch error, falling back:", err);
    }

    // Fallback: Supabase direct query
    if (isSupabaseConfigured) {
      try {
        const { data: profiles, error } = await supabase
          .from("game_profiles")
          .select("user_id, game_username, high_score, updated_at")
          .gt("high_score", 0)
          .order("high_score", { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(profiles)) {
          const entries: LeaderboardEntry[] = profiles.map((p, idx) => ({
            rank: idx + 1,
            userId: p.user_id,
            gameUsername: p.game_username,
            score: p.high_score,
            createdAt: p.updated_at,
            isCurrentUser: p.user_id === userId,
          }));

          const userRank = entries.findIndex((e) => e.userId === userId) + 1 || null;
          return { leaderboard: entries, userRank };
        }
      } catch (err) {
        console.warn("[GameService] Supabase direct query error:", err);
      }
    }

    return { leaderboard: [], userRank: null };
  }

  /**
   * Subscribe to real-time leaderboard updates
   */
  public subscribeLeaderboard(
    user: UserProfile | null | undefined,
    callback: LeaderboardListener
  ): () => void {
    this.leaderboardListeners.add(callback);

    // Initial load
    this.getLeaderboard(user).then((res) => {
      callback(res.leaderboard, res.userRank);
    });

    // Realtime Supabase Channel if configured
    if (isSupabaseConfigured && !this.realtimeChannel) {
      try {
        this.realtimeChannel = supabase
          .channel("snapdash_realtime_scores")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "game_profiles" },
            () => {
              this.getLeaderboard(user).then((res) => {
                this.notifyListeners(res.leaderboard, res.userRank);
              });
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("[GameService] Realtime subscription error:", err);
      }
    }

    // Polling interval fallback for development / local testing (every 8 seconds)
    const interval = setInterval(() => {
      this.getLeaderboard(user).then((res) => {
        callback(res.leaderboard, res.userRank);
      });
    }, 8000);

    return () => {
      this.leaderboardListeners.delete(callback);
      clearInterval(interval);
      if (this.leaderboardListeners.size === 0 && this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  private notifyListeners(entries: LeaderboardEntry[], userRank: number | null): void {
    this.leaderboardListeners.forEach((fn) => {
      try {
        fn(entries, userRank);
      } catch {}
    });
  }

  /**
   * Fetch current player stats
   */
  public async getUserStats(user?: UserProfile | null): Promise<UserGameStats> {
    const isGuest = !user || !user.isLoggedIn || !user.id || user.id === "guest";
    if (isGuest) {
      return {
        gameUsername: this.getGuestCustomUsername(),
        personalBest: this.getGuestBestScore(),
        currentRank: null,
        totalGamesPlayed: 0,
      };
    }

    try {
      const res = await fetch("/api/game/user-stats", {
        headers: { "x-user-id": user.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          return data.stats;
        }
      }
    } catch (err) {
      console.warn("[GameService] User stats fetch error:", err);
    }

    return {
      gameUsername: `Player_${user.id.slice(0, 5)}`,
      personalBest: 0,
      currentRank: null,
      totalGamesPlayed: 0,
    };
  }
}

export const GameService = new GameServiceClass();
