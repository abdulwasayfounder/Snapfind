import { ScreenshotItem, SearchResultMatch } from "../types";
import { searchEngine } from "./searchEngine";
import { UsageService } from "./billing/UsageService";

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

export async function analyzeScreenshotImage(
  base64Data: string,
  fileName: string,
  mimeType: string = "image/png"
): Promise<AnalyzeResponse> {
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
    if (data.success) {
      UsageService.recordLocalAiScan();
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
  screenshots: ScreenshotItem[]
): SearchResultMatch[] {
  return searchEngine.search(query, screenshots);
}

export async function searchScreenshotsAI(
  query: string,
  screenshots: ScreenshotItem[]
): Promise<SearchResultMatch[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch("/api/search-screenshots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        screenshots,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return searchEngine.search(query, screenshots);
    }

    const data: SearchResponse = await response.json();
    if (data.success && Array.isArray(data.results) && data.results.length > 0) {
      return data.results;
    }

    return searchEngine.search(query, screenshots);
  } catch (error) {
    return searchEngine.search(query, screenshots);
  }
}
