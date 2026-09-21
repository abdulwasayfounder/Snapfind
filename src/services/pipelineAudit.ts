import { ScreenshotItem, SearchResultMatch } from "../types";
import { loadStoredScreenshots, saveStoredScreenshots, normalizeScreenshotItem } from "./storage";
import { searchEngine } from "./searchEngine";
import { extractTextServerOCR } from "./ocr";
import { analyzeScreenshotImage } from "./api";

/**
 * Determine primary title based on strict audit rules:
 * Rule 1: The filename must NEVER be used as the primary searchable title.
 * Rule 2: Priority: AI Title > OCR-derived Title > Context Summary > Generic fallback ("Screenshot").
 * Rule 3: If OCR and Gemini both fail: title is "Screenshot", processingStatus is "Failed".
 */
export function determinePrimaryTitle(
  aiTitle: string | undefined,
  ocrText: string | undefined,
  fileName: string,
  summary?: string
): string {
  const cleanFileNameBase = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
  const lowerFileNameBase = cleanFileNameBase.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // 1. Check if Gemini AI generated a descriptive human-readable title
  if (aiTitle && aiTitle.trim().length > 0) {
    const cleanAiTitle = aiTitle.trim();
    const lowerAiTitle = cleanAiTitle.toLowerCase();

    const isFilenameFallback =
      lowerAiTitle === lowerFileNameBase ||
      lowerAiTitle === lowerFileName ||
      lowerAiTitle === "screenshot" ||
      lowerAiTitle === "analyzed screenshot" ||
      lowerAiTitle === "image" ||
      lowerAiTitle === "mon";

    if (!isFilenameFallback) {
      return cleanAiTitle;
    }
  }

  // 2. Fallback to OCR extracted text if Gemini title is uninformative/filename-like
  if (ocrText && ocrText.trim().length > 0) {
    const ocrLines = ocrText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    if (ocrLines.length > 0) {
      for (const line of ocrLines) {
        const cleanLine = line.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
        if (cleanLine.length > 2 && cleanLine.toLowerCase() !== lowerFileNameBase) {
          const words = cleanLine.split(/\s+/).slice(0, 6).join(" ");
          if (words.length > 2) {
            return words.charAt(0).toUpperCase() + words.slice(1);
          }
        }
      }
    }
  }

  // 3. Check if summary contains specific context
  if (
    summary &&
    summary.trim().length > 0 &&
    !summary.includes("Imported screenshot") &&
    !summary.includes("Gallery Screenshot") &&
    !summary.includes("Pending AI")
  ) {
    const cleanSum = summary.replace(/^Contains text:\s*/i, "").replace(/^Extracted text:\s*/i, "").trim();
    const words = cleanSum.split(/\s+/).slice(0, 6).join(" ");
    if (words.length > 2 && words.toLowerCase() !== lowerFileNameBase) {
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }

  // 4. Default fallback: "Screenshot" (NEVER filename as the title)
  return "Screenshot";
}

/**
 * Requirement: Print a debugging report for an uploaded or indexed image showing:
 * - Original filename
 * - OCR text
 * - AI title
 * - AI description
 * - Keywords
 * - Tags
 * - Category
 * - Search index document
 * - SQLite record
 * - Supabase record
 * - FlexSearch indexed fields
 */
export function printPipelineDebuggingReport(item: ScreenshotItem): void {
  const originalFilename = item.fileName || item.file_name || "image.png";
  const ocrText = item.ocr_text || item.fullText || "";
  const aiTitle = item.title;
  const aiDescription = item.ai_description || item.description || item.summary || "";
  const keywords = item.keywords || item.keyEntities || [];
  const tags = item.tags || [];
  const category = item.category || "Other";
  const objects = item.objects || item.objectsDetected || [];

  const flexSearchIndexedFields = [
    "fileName",
    "ocr_text",
    "fullText",
    "title",
    "ai_description",
    "description",
    "summary",
    "keywords",
    "tags",
    "category",
    "objects",
  ];

  const sqliteRecord = {
    id: item.id,
    title: item.title,
    fullText: ocrText,
    summary: item.summary,
    category: item.category,
    dateAdded: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
    jsonData: JSON.stringify(item),
  };

  const supabaseRecord = {
    id: item.id,
    user_id: item.userId || item.user_id || "guest",
    title: item.title,
    category: item.category,
    image_url: item.imageUrl,
    ocr_snippet: item.summary || ocrText.slice(0, 200),
    ocr_text: ocrText,
    full_ocr_text: ocrText,
    ai_description: aiDescription,
    key_entities: keywords,
    tags: tags,
    keywords: keywords,
    objects: objects,
    file_name: originalFilename,
    file_size_kb: item.fileSizeKB || 0,
    created_at: item.createdAt || new Date().toISOString(),
    indexed_at: item.indexedAt || new Date().toISOString(),
  };

  console.log(`
================================================================================
[SNAPFIND PIPELINE AUDIT DEBUGGING REPORT]
================================================================================
Original filename:        ${originalFilename}
OCR text:                 ${ocrText ? ocrText.slice(0, 300) : "(No OCR text extracted)"}
AI title:                 ${aiTitle}
AI description:           ${aiDescription}
Keywords:                 ${JSON.stringify(keywords)}
Tags:                     ${JSON.stringify(tags)}
Category:                 ${category}
Objects detected:         ${JSON.stringify(objects)}
--------------------------------------------------------------------------------
Search Index Document:
${JSON.stringify(item, null, 2)}
--------------------------------------------------------------------------------
SQLite Record:
${JSON.stringify(sqliteRecord, null, 2)}
--------------------------------------------------------------------------------
Supabase Record:
${JSON.stringify(supabaseRecord, null, 2)}
--------------------------------------------------------------------------------
FlexSearch Indexed Fields:
${JSON.stringify(flexSearchIndexedFields, null, 2)}
================================================================================
  `);
}

/**
 * Requirement: debugSearch(query)
 * Performs a search and logs complete scoring breakdown for every candidate item
 */
export function debugSearch(query: string, items?: ScreenshotItem[]): SearchResultMatch[] {
  const currentItems = items || loadStoredScreenshots();
  console.log(`\n🔍 [DEBUG SEARCH] Query: "${query}" across ${currentItems.length} items`);

  const results = searchEngine.search(query, currentItems, { minScore: 0.05 });

  console.table(
    results.map((r) => {
      const item = currentItems.find((s) => s.id === r.id);
      return {
        id: r.id,
        title: item?.title || "N/A",
        category: item?.category || "N/A",
        score: `${Math.round(r.score * 100)}%`,
        matchReason: r.matchReason,
        fileName: item?.fileName || item?.file_name || "N/A",
      };
    })
  );

  return results;
}

/**
 * Requirement: rebuildSearchIndex()
 * Rebuilds both inverted index and FlexSearch index from stored screenshots
 */
export function rebuildSearchIndex(): ScreenshotItem[] {
  const items = loadStoredScreenshots();
  console.log(`[SearchIndex] Rebuilding search index for ${items.length} items...`);
  searchEngine.updateIndex(items);
  console.log(`[SearchIndex] Rebuild complete.`);
  return items;
}

/**
 * Requirement: reprocessScreenshotMetadata(id)
 * Re-runs OCR & Gemini Vision extraction on an existing stored screenshot
 */
export async function reprocessScreenshotMetadata(id: string): Promise<ScreenshotItem | null> {
  const items = loadStoredScreenshots();
  const index = items.findIndex((s) => s.id === id);
  if (index === -1) {
    console.error(`[Reprocess] Screenshot not found: ${id}`);
    return null;
  }

  const target = items[index];
  const base64 = target.imageUrl || target.image_uri;
  const fileName = target.fileName || target.file_name || "screenshot.png";

  console.log(`[Reprocess] Reprocessing metadata for ${target.id} (${fileName})...`);

  let ocrText = "";
  if (base64 && base64.startsWith("data:")) {
    const ocrRes = await extractTextServerOCR(base64, fileName);
    ocrText = ocrRes.text || "";
  }

  let aiTitle: string | undefined;
  let aiSummary = ocrText ? `Contains text: ${ocrText.slice(0, 120)}...` : target.summary;
  let aiDescription = ocrText ? `Contains text: ${ocrText.slice(0, 180)}` : target.description;
  let aiCategory = target.category || "Other";
  let aiTags = target.tags || [];
  let aiKeywords = target.keywords || target.keyEntities || [];
  let aiObjects = target.objects || [];

  if (base64 && base64.startsWith("data:")) {
    const aiRes = await analyzeScreenshotImage(base64, fileName);
    if (aiRes.success && aiRes.analysis) {
      aiTitle = aiRes.analysis.title;
      aiSummary = aiRes.analysis.summary || aiSummary;
      aiDescription = aiRes.analysis.description || aiSummary;
      aiCategory = aiRes.analysis.category || aiCategory;
      aiTags = Array.from(new Set([...aiTags, ...(aiRes.analysis.tags || [])]));
      aiKeywords = aiRes.analysis.keyEntities || aiRes.analysis.keywords || aiKeywords;
      aiObjects = aiRes.analysis.objects || aiObjects;
    }
  }

  const primaryTitle = determinePrimaryTitle(aiTitle, ocrText, fileName, aiSummary);

  const updated: ScreenshotItem = normalizeScreenshotItem({
    ...target,
    title: primaryTitle,
    category: aiCategory,
    summary: aiSummary,
    description: aiDescription,
    ai_description: aiDescription,
    fullText: ocrText,
    ocr_text: ocrText,
    keyEntities: aiKeywords,
    keywords: aiKeywords,
    tags: aiTags,
    objects: aiObjects,
    objectsDetected: aiObjects,
    processingStatus: "Completed",
    processing_status: "Completed",
    indexedAt: new Date().toISOString(),
    indexed_at: new Date().toISOString(),
  });

  items[index] = updated;
  saveStoredScreenshots(items);
  searchEngine.updateItem(updated);
  printPipelineDebuggingReport(updated);

  return updated;
}

/**
 * Reprocess all screenshots with missing or filename-like titles
 */
export async function reprocessAllMetadata(): Promise<ScreenshotItem[]> {
  const items = loadStoredScreenshots();
  console.log(`[ReprocessAll] Checking ${items.length} screenshots for reprocessing...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const cleanBase = (item.fileName || item.file_name || "").replace(/\.[^/.]+$/, "").toLowerCase();
    const isBadTitle =
      !item.title ||
      item.title.toLowerCase() === cleanBase ||
      item.title === "mon" ||
      item.title === "Screenshot" ||
      (!item.fullText && !item.ocr_text);

    if (isBadTitle && item.imageUrl?.startsWith("data:")) {
      console.log(`[ReprocessAll] Updating item ${i + 1}/${items.length}: ${item.id}`);
      await reprocessScreenshotMetadata(item.id);
    }
  }

  return loadStoredScreenshots();
}

// Expose on window object for interactive browser console debugging
if (typeof window !== "undefined") {
  (window as any).printPipelineDebuggingReport = printPipelineDebuggingReport;
  (window as any).debugSearch = debugSearch;
  (window as any).rebuildSearchIndex = rebuildSearchIndex;
  (window as any).reprocessScreenshotMetadata = reprocessScreenshotMetadata;
  (window as any).reprocessAllMetadata = reprocessAllMetadata;
  (window as any).searchEngine = searchEngine;
}
