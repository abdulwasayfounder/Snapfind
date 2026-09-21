import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import { SubscriptionManager } from "../services/billing/SubscriptionManager";

export interface FounderStats {
  claimed: number;
  totalSpots: number;
  remaining: number;
  isAvailable: boolean;
  isLive: boolean;
  isLoading: boolean;
  error?: string | null;
}

interface FounderContextType extends FounderStats {
  refreshFounderStats: () => Promise<void>;
  claimFounderSpot: (userId?: string) => Promise<{
    success: boolean;
    founderNumber?: number;
    message?: string;
    error?: string;
  }>;
}

const TOTAL_FOUNDER_LIMIT = 50;

const defaultFounderState: FounderStats = {
  claimed: 0,
  totalSpots: TOTAL_FOUNDER_LIMIT,
  remaining: TOTAL_FOUNDER_LIMIT,
  isAvailable: true,
  isLive: false,
  isLoading: true,
  error: null,
};

const FounderContext = createContext<FounderContextType>({
  ...defaultFounderState,
  refreshFounderStats: async () => {},
  claimFounderSpot: async () => ({ success: false, error: "Not initialized" }),
});

export const FounderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<FounderStats>(defaultFounderState);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Authoritative fetch directly from Supabase database with backend API verification
  const fetchAuthoritativeStats = useCallback(async () => {
    try {
      // 1. Direct Supabase database count query (Authoritative Source of Truth)
      if (supabase) {
        try {
          const { count, error } = await supabase
            .from("user_entitlements")
            .select("*", { count: "exact", head: true })
            .eq("is_founder", true);

          if (!error && typeof count === "number" && isMountedRef.current) {
            const claimed = count;
            const remaining = Math.max(0, TOTAL_FOUNDER_LIMIT - claimed);
            setStats({
              claimed,
              totalSpots: TOTAL_FOUNDER_LIMIT,
              remaining,
              isAvailable: remaining > 0,
              isLive: true,
              isLoading: false,
              error: null,
            });
            return;
          }
        } catch (dbErr) {
          console.warn("[FounderContext] Supabase direct count query warning:", dbErr);
        }
      }

      // 2. Query dedicated backend billing endpoint (which also queries Supabase server client)
      const res = await fetch("/api/billing/founder-stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success && isMountedRef.current) {
          const claimed = typeof data.claimedSpots === "number" ? data.claimedSpots : typeof data.claimed === "number" ? data.claimed : 0;
          const total = data.totalSpots || TOTAL_FOUNDER_LIMIT;
          const remaining = Math.max(0, total - claimed);
          setStats({
            claimed,
            totalSpots: total,
            remaining,
            isAvailable: remaining > 0,
            isLive: true,
            isLoading: false,
            error: null,
          });
          return;
        }
      }

      // 3. Fallback to SubscriptionManager availability
      const liveStats = await SubscriptionManager.getFounderAvailability();
      if (isMountedRef.current) {
        setStats({
          claimed: liveStats.claimed,
          totalSpots: liveStats.totalSpots || TOTAL_FOUNDER_LIMIT,
          remaining: liveStats.remaining,
          isAvailable: liveStats.remaining > 0,
          isLive: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (err: any) {
      console.warn("[FounderContext] Error fetching authoritative founder stats:", err);
      if (isMountedRef.current) {
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: "Founder seat data temporarily unavailable",
        }));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAuthoritativeStats();

    // Setup Supabase Realtime channel for instant real-time broadcasts
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel("founder_realtime_sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_entitlements",
          },
          () => {
            fetchAuthoritativeStats();
          }
        )
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            if (isMountedRef.current) {
              setStats((prev) => ({ ...prev, isLive: true, error: null }));
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (isMountedRef.current) {
              setStats((prev) => ({ ...prev, isLive: false }));
            }
            // Auto reconnect & refetch on disconnect
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
              fetchAuthoritativeStats();
            }, 3000);
          }
        });
    }

    // Polling fallback every 12 seconds
    const interval = setInterval(() => {
      fetchAuthoritativeStats();
    }, 12000);

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [fetchAuthoritativeStats]);

  const claimFounderSpot = async (userId?: string) => {
    try {
      const res = await SubscriptionManager.claimFounder(userId);
      await fetchAuthoritativeStats();
      return res;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to claim Founder spot.",
      };
    }
  };

  return (
    <FounderContext.Provider
      value={{
        ...stats,
        refreshFounderStats: fetchAuthoritativeStats,
        claimFounderSpot,
      }}
    >
      {children}
    </FounderContext.Provider>
  );
};

export const useFounder = (): FounderContextType => {
  return useContext(FounderContext);
};
