/**
 * SnapFind AI - Duplicate Management & Cleanup Service
 * 
 * Enforces absolute duplicate prevention and safe duplicate cleanup:
 * - Content-based SHA-256 identification per user
 * - Deterministic canonical record selection (Completed AI > Completed OCR > Valid Storage > Oldest date)
 * - Safe cleanup to Trash or permanent removal
 * - Automated backfill of missing content hashes
 */

import { ScreenshotItem } from "../types";
import { computeImageSha256 } from "../utils/hashUtils";
import { saveStoredScreenshots, loadStoredScreenshots } from "./storage";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface DuplicateGroup {
  contentHash: string;
  userId: string;
  canonicalItem: ScreenshotItem;
  duplicateItems: ScreenshotItem[];
  totalCount: number;
}

/**
 * Compare two screenshots to determine which should be the canonical master copy
 * Priority:
 * 1. Completed AI analysis
 * 2. Completed OCR (longer full text)
 * 3. Has valid non-placeholder image
 * 4. Oldest creation date
 */
export function compareCanonicalPriority(a: ScreenshotItem, b: ScreenshotItem): number {
  // 1. Completed AI analysis check
  const aCompleted = a.processingStatus === "Completed" && a.title !== "Screenshot";
  const bCompleted = b.processingStatus === "Completed" && b.title !== "Screenshot";
  if (aCompleted && !bCompleted) return -1;
  if (!aCompleted && bCompleted) return 1;

  // 2. OCR text length
  const aOcrLen = (a.fullText || a.ocr_text || "").trim().length;
  const bOcrLen = (b.fullText || b.ocr_text || "").trim().length;
  if (aOcrLen !== bOcrLen) {
    return bOcrLen - aOcrLen; // Higher OCR length first
  }

  // 3. Valid cloud or storage image
  const aHasCloud = a.imageUrl && (a.imageUrl.startsWith("http://") || a.imageUrl.startsWith("https://"));
  const bHasCloud = b.imageUrl && (b.imageUrl.startsWith("http://") || b.imageUrl.startsWith("https://"));
  if (aHasCloud && !bHasCloud) return -1;
  if (!aHasCloud && bHasCloud) return 1;

  // 4. Oldest creation date
  const aDate = new Date(a.createdAt || a.date_created || 0).getTime();
  const bDate = new Date(b.createdAt || b.date_created || 0).getTime();
  return aDate - bDate;
}

/**
 * Scan screenshots and identify all duplicate groups for a user
 */
export function findDuplicateGroups(
  screenshots: ScreenshotItem[] = loadStoredScreenshots(),
  targetUserId?: string
): DuplicateGroup[] {
  // Filter out already deleted/trashed items
  const activeItems = screenshots.filter((s) => !s.isDeleted && !s.is_deleted);

  // Group by user_id + content_hash
  const groupMap = new Map<string, ScreenshotItem[]>();

  for (const item of activeItems) {
    const itemUserId = item.user_id || item.userId || "guest";
    if (targetUserId && targetUserId !== "guest" && itemUserId !== targetUserId) {
      continue;
    }

    const hash = (
      item.content_hash ||
      item.contentHash ||
      item.sha256Hash ||
      item.hash ||
      item.sha256_hash ||
      item.fileHash ||
      ""
    ).trim().toLowerCase();

    // Skip items without a valid hash
    if (!hash || hash.length < 16) continue;

    const groupKey = `${itemUserId}:::${hash}`;
    const existing = groupMap.get(groupKey) || [];
    existing.push(item);
    groupMap.set(groupKey, existing);
  }

  const result: DuplicateGroup[] = [];

  for (const [groupKey, items] of groupMap.entries()) {
    if (items.length > 1) {
      const [userId, contentHash] = groupKey.split(":::");
      // Sort to find canonical item
      const sorted = [...items].sort(compareCanonicalPriority);
      const canonicalItem = sorted[0];
      const duplicateItems = sorted.slice(1);

      result.push({
        contentHash,
        userId,
        canonicalItem,
        duplicateItems,
        totalCount: items.length,
      });
    }
  }

  return result;
}

/**
 * Clean up a single duplicate group:
 * - Keeps canonicalItem active
 * - Moves duplicateItems to Trash (or permanently removes them)
 */
export async function cleanupDuplicateGroup(
  group: DuplicateGroup,
  allScreenshots: ScreenshotItem[],
  mode: "trash" | "permanent" = "trash"
): Promise<{
  keptId: string;
  removedIds: string[];
  updatedScreenshots: ScreenshotItem[];
}> {
  const keptId = group.canonicalItem.id;
  const removedIds = group.duplicateItems.map((d) => d.id);
  const removedSet = new Set(removedIds);
  const nowIso = new Date().toISOString();

  let updatedScreenshots: ScreenshotItem[];

  if (mode === "trash") {
    // Mark duplicates as deleted with deletedAt timestamp
    updatedScreenshots = allScreenshots.map((item) => {
      if (removedSet.has(item.id)) {
        return {
          ...item,
          isDeleted: true,
          is_deleted: true,
          deletedAt: nowIso,
          deleted_at: nowIso,
          duplicateBadge: undefined,
          isDuplicate: false,
        };
      }
      return item;
    });
  } else {
    // Permanently remove from list
    updatedScreenshots = allScreenshots.filter((item) => !removedSet.has(item.id));
  }

  // Persist locally
  saveStoredScreenshots(updatedScreenshots);

  // Sync deletion with Supabase if configured
  if (isSupabaseConfigured && removedIds.length > 0) {
    try {
      if (mode === "trash") {
        await supabase
          .from("screenshots")
          .update({ is_deleted: true, deleted_at: nowIso })
          .in("id", removedIds);
      } else {
        await supabase
          .from("screenshots")
          .delete()
          .in("id", removedIds);
      }
    } catch (e) {
      console.warn("[DuplicateCleanup] Supabase sync warning:", e);
    }
  }

  return {
    keptId,
    removedIds,
    updatedScreenshots,
  };
}

/**
 * Clean up all duplicate groups across the library safely
 */
export async function cleanupAllDuplicates(
  allScreenshots: ScreenshotItem[],
  mode: "trash" | "permanent" = "trash",
  targetUserId?: string
): Promise<{
  keptCount: number;
  removedCount: number;
  updatedScreenshots: ScreenshotItem[];
}> {
  const groups = findDuplicateGroups(allScreenshots, targetUserId);
  if (groups.length === 0) {
    return { keptCount: 0, removedCount: 0, updatedScreenshots: allScreenshots };
  }

  const allRemovedIds: string[] = [];
  groups.forEach((g) => {
    g.duplicateItems.forEach((d) => allRemovedIds.push(d.id));
  });

  const removedSet = new Set(allRemovedIds);
  const nowIso = new Date().toISOString();

  let updatedScreenshots: ScreenshotItem[];

  if (mode === "trash") {
    updatedScreenshots = allScreenshots.map((item) => {
      if (removedSet.has(item.id)) {
        return {
          ...item,
          isDeleted: true,
          is_deleted: true,
          deletedAt: nowIso,
          deleted_at: nowIso,
          duplicateBadge: undefined,
          isDuplicate: false,
        };
      }
      return item;
    });
  } else {
    updatedScreenshots = allScreenshots.filter((item) => !removedSet.has(item.id));
  }

  saveStoredScreenshots(updatedScreenshots);

  if (isSupabaseConfigured && allRemovedIds.length > 0) {
    try {
      if (mode === "trash") {
        await supabase
          .from("screenshots")
          .update({ is_deleted: true, deleted_at: nowIso })
          .in("id", allRemovedIds);
      } else {
        await supabase
          .from("screenshots")
          .delete()
          .in("id", allRemovedIds);
      }
    } catch (e) {
      console.warn("[DuplicateCleanup] Supabase batch delete warning:", e);
    }
  }

  return {
    keptCount: groups.length,
    removedCount: allRemovedIds.length,
    updatedScreenshots,
  };
}

/**
 * Backfill missing SHA-256 content hashes for existing screenshots
 */
export async function backfillContentHashes(
  screenshots: ScreenshotItem[]
): Promise<{
  backfilledCount: number;
  updatedScreenshots: ScreenshotItem[];
}> {
  let backfilledCount = 0;
  const updatedList: ScreenshotItem[] = [];

  for (const item of screenshots) {
    const existingHash = item.content_hash || item.contentHash || item.sha256Hash || item.hash;
    if (existingHash && existingHash.length >= 16) {
      updatedList.push(item);
      continue;
    }

    const imgSource = item.imageUrl || item.image_uri;
    if (imgSource) {
      try {
        const hash = await computeImageSha256(imgSource);
        if (hash) {
          backfilledCount++;
          updatedList.push({
            ...item,
            content_hash: hash,
            contentHash: hash,
            sha256Hash: hash,
            sha256_hash: hash,
            hash: hash,
            fileHash: hash,
          });
          continue;
        }
      } catch (e) {
        console.warn(`[DuplicateCleanup] Failed to compute hash for ${item.id}:`, e);
      }
    }

    updatedList.push(item);
  }

  if (backfilledCount > 0) {
    saveStoredScreenshots(updatedList);
  }

  return {
    backfilledCount,
    updatedScreenshots: updatedList,
  };
}
