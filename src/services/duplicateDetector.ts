import { ScreenshotItem, CategoryType } from "../types";
import { loadStoredScreenshots, saveStoredScreenshots, normalizeScreenshotItem } from "./storage";
import { computeImageSha256 } from "../utils/hashUtils";

export interface CandidateAttributes {
  id?: string;
  userId?: string;
  user_id?: string;
  contentHash?: string;
  content_hash?: string;
  hash?: string;
  sha256Hash?: string;
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  ocr?: string;
  ocrText?: string;
  fullText?: string;
  summary?: string;
  description?: string;
  fileSize?: number; // in bytes or KB
  fileSizeKB?: number;
  file_size?: number;
  creationTime?: string | number;
  createdAt?: string | number;
  dateCreated?: string | number;
  dateModified?: string | number;
  fileName?: string;
  folder?: string;
  title?: string;
  category?: CategoryType;
  tags?: string[];
  imageUrl?: string;
  base64Data?: string;
}

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  existingItem?: ScreenshotItem;
  matchedCriteria: Array<"hash" | "dimensions" | "ocr" | "summary" | "fileSize" | "creationTime">;
  reason?: string;
  hasMetadataChanged: boolean;
  updatedMetadataKeys: string[];
}

/**
 * Clean & normalize text for string similarity matching
 */
function normalizeTextForComparison(text?: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate Jaccard word-level similarity score (0.0 - 1.0)
 */
function calculateWordSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeTextForComparison(text1);
  const norm2 = normalizeTextForComparison(text2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const words1 = new Set(norm1.split(" ").filter((w) => w.length > 2));
  const words2 = new Set(norm2.split(" ").filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Parse date or timestamp string/number into epoch millis
 */
function parseEpochMillis(val?: string | number): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Check if a screenshot with the exact SHA-256 content hash already exists for this user.
 * Scoped to user_id to ensure User A duplicate check does NOT block User B.
 */
export function checkExactDuplicateByHash(
  contentHash?: string,
  userId?: string,
  storedScreenshots: ScreenshotItem[] = loadStoredScreenshots()
): { isDuplicate: boolean; existingItem?: ScreenshotItem } {
  if (!contentHash || contentHash.trim().length < 16) {
    return { isDuplicate: false };
  }
  const cleanHash = contentHash.trim().toLowerCase();
  const targetUser = userId || "guest";

  const found = storedScreenshots.find((s) => {
    if (s.isDeleted || s.is_deleted) return false;
    const itemUserId = s.user_id || s.userId || "guest";
    if (targetUser !== "guest" && itemUserId !== "guest" && itemUserId !== targetUser) {
      return false;
    }
    const itemHash = (
      s.content_hash ||
      s.contentHash ||
      s.sha256Hash ||
      s.hash ||
      s.sha256_hash ||
      s.fileHash ||
      ""
    ).trim().toLowerCase();
    return itemHash === cleanHash;
  });

  if (found) {
    return { isDuplicate: true, existingItem: found };
  }
  return { isDuplicate: false };
}

/**
 * Compare candidate attributes against existing stored screenshots
 * using content hash, dimensions, OCR, Gemini summary, file size, and creation time.
 */
export function checkDuplicateScreenshot(
  candidate: CandidateAttributes,
  storedScreenshots: ScreenshotItem[] = loadStoredScreenshots()
): DuplicateMatchResult {
  const candidateId = candidate.id;
  const candidateUserId = candidate.userId || candidate.user_id || "guest";
  const candidateHash = (candidate.contentHash || candidate.content_hash || candidate.hash || candidate.sha256Hash || "").trim().toLowerCase();
  
  const candWidth = candidate.width || candidate.dimensions?.width || 0;
  const candHeight = candidate.height || candidate.dimensions?.height || 0;
  
  const candOcr = candidate.ocr || candidate.ocrText || candidate.fullText || "";
  const candSummary = candidate.summary || candidate.description || "";
  
  const candFileSize = candidate.fileSize || candidate.file_size || (candidate.fileSizeKB ? candidate.fileSizeKB * 1024 : 0);
  const candFileSizeKB = candidate.fileSizeKB || (candFileSize ? Math.round(candFileSize / 1024) : 0);
  
  const candTimeMs = parseEpochMillis(
    candidate.creationTime || candidate.createdAt || candidate.dateCreated || candidate.dateModified
  );

  for (const existing of storedScreenshots) {
    // Skip self if comparing against existing item in store
    if (candidateId && existing.id === candidateId) continue;

    // Enforce user privacy & scoping: User A should not match or block User B
    const existingUserId = existing.user_id || existing.userId || "guest";
    if (candidateUserId !== "guest" && existingUserId !== "guest" && existingUserId !== candidateUserId) {
      continue;
    }

    // Do not match against pending, failed, or generic placeholder items that need indexing
    const isExistingCompleted =
      (existing.processingStatus === "Completed" || existing.processing_status === "Completed") &&
      existing.title &&
      existing.title !== "Screenshot" &&
      existing.title !== "Screenshot pending AI...";

    const matchedCriteria: Array<"hash" | "dimensions" | "ocr" | "summary" | "fileSize" | "creationTime"> = [];

    // 1. Hash comparison (only if non-empty real hash)
    const existingHash = (
      existing.content_hash ||
      existing.contentHash ||
      existing.sha256Hash ||
      existing.hash ||
      existing.sha256_hash ||
      existing.fileHash ||
      ""
    ).trim().toLowerCase();

    const isHashMatched = Boolean(candidateHash && existingHash && candidateHash.length >= 16 && candidateHash === existingHash);
    if (isHashMatched) {
      matchedCriteria.push("hash");
    }

    // 2. Dimensions comparison
    const existingWidth = existing.width || existing.dimensions?.width || 0;
    const existingHeight = existing.height || existing.dimensions?.height || 0;
    const isDimensionsMatched =
      candWidth > 50 &&
      candHeight > 50 &&
      existingWidth > 50 &&
      existingHeight > 50 &&
      candWidth === existingWidth &&
      candHeight === existingHeight;
    if (isDimensionsMatched) {
      matchedCriteria.push("dimensions");
    }

    // 3. File size comparison
    const existingSizeKB = existing.fileSizeKB || (existing.file_size ? Math.round(existing.file_size / 1024) : 0);
    const isFileSizeMatched =
      candFileSizeKB > 5 && existingSizeKB > 5 && Math.abs(candFileSizeKB - existingSizeKB) === 0;
    if (isFileSizeMatched) {
      matchedCriteria.push("fileSize");
    }

    // 4. Creation time comparison
    const existingTimeMs = parseEpochMillis(existing.createdAt || existing.date_created || existing.dateModified);
    const isCreationTimeMatched =
      candTimeMs > 0 && existingTimeMs > 0 && Math.abs(candTimeMs - existingTimeMs) < 1000;
    if (isCreationTimeMatched) {
      matchedCriteria.push("creationTime");
    }

    // 5. OCR text comparison (requires substantial text length)
    const hasSubstantialOcr = candOcr.trim().length > 20 && (existing.fullText || existing.ocr_text || "").trim().length > 20;
    const ocrSimilarity = hasSubstantialOcr
      ? calculateWordSimilarity(candOcr, existing.fullText || existing.ocr_text || "")
      : 0;
    const isOcrMatched = ocrSimilarity >= 0.88;
    if (isOcrMatched) {
      matchedCriteria.push("ocr");
    }

    // 6. Gemini summary comparison
    const hasSubstantialSummary = candSummary.trim().length > 20 && (existing.summary || existing.description || "").trim().length > 20;
    const summarySimilarity = hasSubstantialSummary
      ? calculateWordSimilarity(
          candSummary,
          existing.summary || existing.description || existing.ai_description || ""
        )
      : 0;
    const isSummaryMatched = summarySimilarity >= 0.88;
    if (isSummaryMatched) {
      matchedCriteria.push("summary");
    }

    // Evaluate overall duplicate rule decision: requires strong evidence and completed status
    const isDuplicate =
      isExistingCompleted &&
      (isHashMatched ||
        (isDimensionsMatched && isFileSizeMatched && isCreationTimeMatched) ||
        (isOcrMatched && isSummaryMatched));

    if (isDuplicate) {
      // Check if metadata changed
      const updatedKeys: string[] = [];
      if (candidate.folder && candidate.folder !== existing.folder) updatedKeys.push("folder");
      if (candidate.category && candidate.category !== existing.category) updatedKeys.push("category");
      if (candidate.title && candidate.title !== existing.title && !candidate.title.startsWith("image_")) {
        updatedKeys.push("title");
      }
      if (candidate.tags && candidate.tags.length > 0) {
        const hasNewTags = candidate.tags.some((t) => !existing.tags.includes(t));
        if (hasNewTags) updatedKeys.push("tags");
      }

      const hasMetadataChanged = updatedKeys.length > 0;
      const reason = `Matched duplicate via [${matchedCriteria.join(", ")}]`;

      return {
        isDuplicate: true,
        existingItem: existing,
        matchedCriteria,
        reason,
        hasMetadataChanged,
        updatedMetadataKeys: updatedKeys,
      };
    }
  }

  return {
    isDuplicate: false,
    matchedCriteria: [],
    hasMetadataChanged: false,
    updatedMetadataKeys: [],
  };
}

/**
 * Handle duplicate screenshot detection logic during indexing:
 * - If duplicate: skips processing again
 * - Marks existing screenshot with "Already Indexed" badge
 * - Updates index record only if metadata changed
 * - Prevents duplicate storage
 */
export function handleDuplicateIndexing(
  candidate: CandidateAttributes,
  storedScreenshots: ScreenshotItem[] = loadStoredScreenshots()
): {
  isDuplicate: boolean;
  processedItem: ScreenshotItem | null;
  metadataUpdated: boolean;
  statusMessage: string;
} {
  const result = checkDuplicateScreenshot(candidate, storedScreenshots);

  if (!result.isDuplicate || !result.existingItem) {
    return {
      isDuplicate: false,
      processedItem: null,
      metadataUpdated: false,
      statusMessage: "New item (Not a duplicate)",
    };
  }

  const existing = result.existingItem;
  let metadataUpdated = false;

  // Mark as duplicate / already indexed
  const updatedItem: ScreenshotItem = normalizeScreenshotItem({
    ...existing,
    isAlreadyIndexed: true,
    isDuplicate: true,
    duplicateBadge: "Already Indexed",
    duplicateReason: result.reason,
    // Apply metadata updates if changed
    folder: result.updatedMetadataKeys.includes("folder") && candidate.folder ? candidate.folder : existing.folder,
    category: result.updatedMetadataKeys.includes("category") && candidate.category ? candidate.category : existing.category,
    title: result.updatedMetadataKeys.includes("title") && candidate.title ? candidate.title : existing.title,
    tags: result.updatedMetadataKeys.includes("tags") && candidate.tags
      ? Array.from(new Set([...existing.tags, ...candidate.tags]))
      : existing.tags,
  });

  if (result.hasMetadataChanged) {
    metadataUpdated = true;
    const idx = storedScreenshots.findIndex((s) => s.id === existing.id);
    if (idx >= 0) {
      storedScreenshots[idx] = updatedItem;
      saveStoredScreenshots(storedScreenshots);
    }
  } else {
    // Make sure badge state is updated in store
    const idx = storedScreenshots.findIndex((s) => s.id === existing.id);
    if (idx >= 0) {
      storedScreenshots[idx] = updatedItem;
      saveStoredScreenshots(storedScreenshots);
    }
  }

  return {
    isDuplicate: true,
    processedItem: updatedItem,
    metadataUpdated,
    statusMessage: `Already Indexed: ${result.reason || "Matched existing screenshot"}${
      metadataUpdated ? " (Updated metadata)" : ""
    }`,
  };
}
