/**
 * SnapFind AI — Search Cache & Request Deduplication Engine
 *
 * Provides:
 * 1. Account-Isolated Query Caching: Results are strictly partitioned by userId.
 * 2. In-Flight Request Deduplication: Merges concurrent duplicate search executions.
 * 3. Safe Cache Invalidation: Automatically cleared upon user logout, screenshot indexing, or deletion.
 * 4. Image Analysis Cache: Prevents redundant AI/OCR API calls on duplicate screenshots.
 */

import { SearchResultMatch } from "../types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SearchCacheService {
  private queryCache = new Map<string, CacheEntry<SearchResultMatch[]>>();
  private inFlightQueries = new Map<string, Promise<SearchResultMatch[]>>();
  private imageAnalysisCache = new Map<string, any>();
  private activeAbortController: AbortController | null = null;
  private readonly TTL_MS = 3 * 60 * 1000; // 3-minute TTL for search queries

  /**
   * Builds an account-isolated cache key to guarantee zero cross-user data leakage
   */
  private buildKey(userId: string, query: string, category: string = "All"): string {
    const safeUser = userId || "guest";
    const cleanQuery = query.trim().toLowerCase();
    return `${safeUser}::${category}::${cleanQuery}`;
  }

  /**
   * Retrieves cached search results if valid and within TTL
   */
  public get(userId: string, query: string, category: string = "All"): SearchResultMatch[] | null {
    const key = this.buildKey(userId, query, category);
    const entry = this.queryCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.queryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores search results in the isolated query cache
   */
  public set(userId: string, query: string, results: SearchResultMatch[], category: string = "All"): void {
    const key = this.buildKey(userId, query, category);
    this.queryCache.set(key, {
      data: results,
      timestamp: Date.now(),
    });

    // Keep cache size bounded (max 100 recent entries)
    if (this.queryCache.size > 100) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) this.queryCache.delete(oldestKey);
    }
  }

  /**
   * Deduplicates in-flight search requests for the exact same query
   */
  public async executeDeduplicated(
    userId: string,
    query: string,
    category: string,
    fetcher: (signal: AbortSignal) => Promise<SearchResultMatch[]>
  ): Promise<SearchResultMatch[]> {
    const key = this.buildKey(userId, query, category);

    // 1. Check valid cache
    const cached = this.get(userId, query, category);
    if (cached) {
      return cached;
    }

    // 2. Check if identical query is already currently in flight
    const inFlight = this.inFlightQueries.get(key);
    if (inFlight) {
      return inFlight;
    }

    // 3. Cancel previous pending search query to save CPU and network
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
    }
    this.activeAbortController = new AbortController();
    const currentSignal = this.activeAbortController.signal;

    // 4. Create in-flight promise and cache result on success
    const queryPromise = (async () => {
      try {
        const results = await fetcher(currentSignal);
        this.set(userId, query, results, category);
        return results;
      } finally {
        this.inFlightQueries.delete(key);
      }
    })();

    this.inFlightQueries.set(key, queryPromise);
    return queryPromise;
  }

  /**
   * Invalidate query cache for a specific user (or all if user logged out)
   */
  public invalidateUser(userId?: string): void {
    if (!userId) {
      this.queryCache.clear();
      this.inFlightQueries.clear();
      this.imageAnalysisCache.clear();
      return;
    }

    const prefix = `${userId}::`;
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Cached AI analysis by image hash
   */
  public getCachedAnalysis(imageHash: string): any | null {
    if (!imageHash) return null;
    return this.imageAnalysisCache.get(imageHash) || null;
  }

  public setCachedAnalysis(imageHash: string, analysis: any): void {
    if (!imageHash || !analysis) return;
    this.imageAnalysisCache.set(imageHash, analysis);
    if (this.imageAnalysisCache.size > 80) {
      const oldestKey = this.imageAnalysisCache.keys().next().value;
      if (oldestKey) this.imageAnalysisCache.delete(oldestKey);
    }
  }
}

export const searchCache = new SearchCacheService();
