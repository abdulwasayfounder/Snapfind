import { ScreenshotItem, SearchResultMatch } from "../types";
import { searchEngine } from "./searchEngine";
import { UsageService } from "./billing/UsageService";

import { searchCache } from "./searchCache";

export interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    title: string;
    description?: string;
    category: any;
    collectionName?: string;
    summary: string;
    fullText: string;
    keyEntities: string[];
    keywords?: string[];
    tags: string[];
    objects?: string[];
    textDensity?: "low" | "medium" | "high";
    keyMetrics?: string[];
    indexedAt: string;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

export interface SearchResponse {
  success: boolean;
  results?: SearchResultMatch[];
  error?: string;
}

// Fast string hashing for image payload deduplication
function computeQuickHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}_${str.length}`;
}

export async function analyzeScreenshotImage(
  base64Data: string,
  fileName: string,
  mimeType: string = "image/png"
): Promise<AnalyzeResponse> {
  // Deduplication check: Avoid re-analyzing the exact same image
  const imageHash = computeQuickHash(base64Data);
  const cachedAnalysis = searchCache.getCachedAnalysis(imageHash);
  if (cachedAnalysis) {
    console.log(`[API] Returning cached AI analysis for duplicate image hash: ${imageHash}`);
    return {
      success: true,
      analysis: cachedAnalysis,
    };
  }

  try {
    const deviceId = UsageService.getDeviceId();
    const response = await fetch("/api/analyze-screenshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
      },
      body: JSON.stringify({
        base64Data,
        fileName,
        mimeType,
        deviceId,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      if (errData?.quotaExceeded) {
        return {
          success: false,
          error: "Monthly AI Vision limit reached. Upgrade to Pro for 2,000 monthly scans.",
          details: "quota_exceeded",
        };
      }
      const errText = errData?.error || (await response.text().catch(() => "Unknown error"));
      throw new Error(`Server returned ${response.status}: ${errText}`);
    }

    const data: AnalyzeResponse = await response.json();
    if (data.success && data.analysis) {
      UsageService.recordLocalAiScan();
      searchCache.setCachedAnalysis(imageHash, data.analysis);
    }
    return data;
  } catch (error: any) {
    console.error("Failed to analyze screenshot via server:", error);
    return {
      success: false,
      error: error.message || "Network error when analyzing screenshot.",
    };
  }
}

// Reliable instant natural language keyword search engine (<100ms latency)
export function instantKeywordSearch(
  query: string,
  screenshots: ScreenshotItem[],
  userId: string = "guest"
): SearchResultMatch[] {
  const cached = searchCache.get(userId, query);
  if (cached) return cached;

  const results = searchEngine.search(query, screenshots);
  searchCache.set(userId, query, results);
  return results;
}

export async function searchScreenshotsAI(
  query: string,
  screenshots: ScreenshotItem[],
  userId: string = "guest"
): Promise<SearchResultMatch[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  return searchCache.executeDeduplicated(
    userId,
    cleanQuery,
    "All",
    async (signal) => {
      try {
        // Strip out heavy base64 data to keep payload ultra-lightweight (<20KB)
        const lightweightScreenshots = screenshots.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          tags: s.tags,
          keyEntities: s.keyEntities,
          summary: s.summary,
          fullText: s.fullText?.slice(0, 500),
          createdAt: s.createdAt,
          isFavorite: s.isFavorite,
        }));

        const response = await fetch("/api/search-screenshots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: cleanQuery,
            screenshots: lightweightScreenshots,
          }),
          signal,
        });

        if (!response.ok) {
          return searchEngine.search(cleanQuery, screenshots);
        }

        const data: SearchResponse = await response.json();
        if (data.success && Array.isArray(data.results) && data.results.length > 0) {
          return data.results;
        }

        return searchEngine.search(cleanQuery, screenshots);
      } catch (error) {
        return searchEngine.search(cleanQuery, screenshots);
      }
    }
  );
}

