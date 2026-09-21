import { ScreenshotItem } from "../types";
import {
  loadStoredScreenshots,
  saveStoredScreenshots,
  saveStoredScreenshotsBatch,
  normalizeScreenshotItem,
  StorageManager,
} from "./storage.ts";
import { extractTextServerOCR } from "./ocr";
import { analyzeScreenshotImage } from "./api";
import { determinePrimaryTitle, printPipelineDebuggingReport } from "./pipelineAudit";
import { processingQueue } from "./processingQueue";
import { searchEngine } from "./searchEngine";
import { computeImageSha256 } from "../utils/hashUtils";
import { checkDuplicateScreenshot, handleDuplicateIndexing } from "./duplicateDetector";
import { SubscriptionManager } from "./billing/SubscriptionManager";
import { optimizeImageForPipeline } from "../utils/imageOptimizer";
import { decodeQrFromImage, extractWebsitesFromText } from "../utils/qrDetector";

export type IndexingStep =
  | "Preparing..."
  | "Scanning..."
  | "OCR..."
  | "AI Analysis..."
  | "Saving..."
  | "Completed";

export interface CandidateImage {
  id: string;
  image_uri?: string;
  imageUrl?: string;
  file_name?: string;
  fileName?: string;
  folder?: string;
  date_modified?: string | number;
  dateModified?: string | number;
  file_size?: number;
  fileSizeKB?: number;
  base64Data?: string;
  file?: File;
  blob?: Blob;
}

export interface IndexingProgressEvent {
  step: IndexingStep;
  currentStepIndex: number;
  totalSteps: number;
  processedCount: number;
  totalCandidates: number;
  newCount: number;
  modifiedCount: number;
  skippedCount: number;
  currentItemName?: string;
  statusText: string;
  percent: number;
}

export interface IndexingResult {
  success: boolean;
  totalScanned: number;
  newIndexed: number;
  modifiedUpdated: number;
  skippedCount: number;
  lastScanTimestamp: string;
  items: ScreenshotItem[];
  error?: string;
}

const STORAGE_KEYS = {
  LAST_SCAN_TIMESTAMP: "snapfind_last_scan_timestamp",
  INDEXED_IMAGE_IDS: "snapfind_indexed_image_ids",
};

/**
 * Non-blocking yield helper to ensure UI thread stays responsive (60fps)
 */
function yieldToMainThread(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parse date or timestamp into epoch milliseconds
 */
function parseTimestampMillis(input?: string | number): number {
  if (!input) return 0;
  if (typeof input === "number") return input;
  const parsed = new Date(input).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Incremental Gallery Indexing Engine
 */
class IncrementalIndexingEngine {
  private isScanning: boolean = false;
  private cancelRequested: boolean = false;

  private cachedLastScanTimestamp: string | null = null;
  private cachedIndexedIds: Set<string> | null = null;

  /**
   * Get the last scan timestamp ISO string or epoch ms
   */
  public getLastScanTimestamp(): string {
    if (this.cachedLastScanTimestamp) return this.cachedLastScanTimestamp;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_SCAN_TIMESTAMP);
      if (stored) {
        this.cachedLastScanTimestamp = stored;
        return stored;
      }
    } catch {}
    return "1970-01-01T00:00:00.000Z";
  }

  /**
   * Set and save the updated scan timestamp
   */
  public setLastScanTimestamp(timestampIso: string): void {
    this.cachedLastScanTimestamp = timestampIso;
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SCAN_TIMESTAMP, timestampIso);
    } catch {}
    const provider = StorageManager.getProvider();
    if (provider.setLastScanTimestamp) {
      provider.setLastScanTimestamp(timestampIso).catch(() => {});
    }
  }

  /**
   * Get set of all currently indexed image IDs
   */
  public getIndexedImageIds(): Set<string> {
    if (this.cachedIndexedIds) return this.cachedIndexedIds;
    const set = new Set<string>();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INDEXED_IMAGE_IDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => set.add(id));
        }
      }
    } catch {}
    const screenshots = loadStoredScreenshots();
    screenshots.forEach((s) => set.add(s.id));
    this.cachedIndexedIds = set;
    return set;
  }

  /**
   * Save indexed image IDs to persistent storage
   */
  private saveIndexedImageIds(idsSet: Set<string>): void {
    this.cachedIndexedIds = idsSet;
    try {
      localStorage.setItem(STORAGE_KEYS.INDEXED_IMAGE_IDS, JSON.stringify(Array.from(idsSet)));
    } catch (err) {
      console.warn("Error saving indexed image IDs:", err);
    }
    const provider = StorageManager.getProvider();
    if (provider.saveIndexedImageIds) {
      provider.saveIndexedImageIds(idsSet).catch(() => {});
    }
  }

  /**
   * Convert a File/Blob or image URL to base64
   */
  private async imageToBase64(candidate: CandidateImage): Promise<string> {
    if (candidate.base64Data) return candidate.base64Data;
    
    if (candidate.file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(candidate.file!);
      });
    }

    if (candidate.blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(candidate.blob!);
      });
    }

    const uri = candidate.imageUrl || candidate.image_uri;
    if (uri && uri.startsWith("data:image")) {
      return uri;
    }

    // Return empty if external URL or unsupported local path
    return uri || "";
  }

  /**
   * Request cancellation of ongoing scan
   */
  public cancelScan(): void {
    if (this.isScanning) {
      this.cancelRequested = true;
    }
  }

  /**
   * Run incremental scan over candidate gallery images
   */
  public async runIncrementalScan(
    candidates: CandidateImage[],
    onProgress?: (event: IndexingProgressEvent) => void
  ): Promise<IndexingResult> {
    if (this.isScanning) {
      return {
        success: false,
        totalScanned: 0,
        newIndexed: 0,
        modifiedUpdated: 0,
        skippedCount: 0,
        lastScanTimestamp: this.getLastScanTimestamp(),
        items: loadStoredScreenshots(),
        error: "Scan already in progress",
      };
    }

    this.isScanning = true;
    this.cancelRequested = false;

    const scanStartTimeIso = new Date().toISOString();
    const lastScanMs = parseTimestampMillis(this.getLastScanTimestamp());
    const indexedIds = this.getIndexedImageIds();

    const newCandidates: CandidateImage[] = [];
    const modifiedCandidates: CandidateImage[] = [];
    let skippedCount = 0;

    // STEP 1: Preparing...
    if (onProgress) {
      onProgress({
        step: "Preparing...",
        currentStepIndex: 1,
        totalSteps: 6,
        processedCount: 0,
        totalCandidates: candidates.length,
        newCount: 0,
        modifiedCount: 0,
        skippedCount: 0,
        statusText: "Analyzing gallery delta and checking timestamps...",
        percent: 5,
      });
    }
    await yieldToMainThread(10);

    // Incremental classification
    for (const item of candidates) {
      const isAlreadyIndexed = indexedIds.has(item.id);
      const itemModifiedMs = parseTimestampMillis(item.date_modified || item.dateModified);

      if (!isAlreadyIndexed) {
        newCandidates.push(item);
      } else if (itemModifiedMs > lastScanMs) {
        modifiedCandidates.push(item);
      } else {
        skippedCount++;
      }
    }

    const toProcess = [...newCandidates, ...modifiedCandidates];
    const totalToProcess = toProcess.length;

    if (totalToProcess === 0) {
      this.setLastScanTimestamp(scanStartTimeIso);
      this.isScanning = false;

      if (onProgress) {
        onProgress({
          step: "Completed",
          currentStepIndex: 6,
          totalSteps: 6,
          processedCount: candidates.length,
          totalCandidates: candidates.length,
          newCount: 0,
          modifiedCount: 0,
          skippedCount,
          statusText: "No new or modified images found in gallery.",
          percent: 100,
        });
      }

      return {
        success: true,
        totalScanned: candidates.length,
        newIndexed: 0,
        modifiedUpdated: 0,
        skippedCount,
        lastScanTimestamp: scanStartTimeIso,
        items: loadStoredScreenshots(),
      };
    }

    let processedCount = 0;
    let newlyIndexedCount = 0;
    let modifiedUpdatedCount = 0;
    const existingScreenshots = loadStoredScreenshots();
    const updatedScreenshotsMap = new Map<string, ScreenshotItem>();
    existingScreenshots.forEach((item) => updatedScreenshotsMap.set(item.id, item));

    for (let i = 0; i < totalToProcess; i++) {
      if (this.cancelRequested) {
        this.isScanning = false;
        return {
          success: false,
          totalScanned: processedCount,
          newIndexed: newlyIndexedCount,
          modifiedUpdated: modifiedUpdatedCount,
          skippedCount,
          lastScanTimestamp: this.getLastScanTimestamp(),
          items: Array.from(updatedScreenshotsMap.values()),
          error: "Scan cancelled by user",
        };
      }

      const candidate = toProcess[i];
      const fileName = candidate.file_name || candidate.fileName || candidate.file?.name || `image_${candidate.id}.png`;
      const isModified = modifiedCandidates.some((m) => m.id === candidate.id);

      // STEP 2: Scanning...
      const basePercent = Math.round(10 + (i / totalToProcess) * 80);
      if (onProgress) {
        onProgress({
          step: "Scanning...",
          currentStepIndex: 2,
          totalSteps: 6,
          processedCount: i,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount,
          modifiedCount: modifiedUpdatedCount,
          skippedCount,
          currentItemName: fileName,
          statusText: `Scanning file header and thumbnail: ${fileName}`,
          percent: basePercent,
        });
      }
      await yieldToMainThread(10);

      const base64Data = await this.imageToBase64(candidate);

      // Compute SHA-256 hash
      const imgHash = await computeImageSha256(base64Data || candidate.image_uri || candidate.imageUrl || fileName);

      // Multi-factor duplicate check across hash, dimensions, OCR, Gemini summary, file size, and creation time
      const duplicateResult = handleDuplicateIndexing(
        {
          id: candidate.id,
          hash: imgHash,
          sha256Hash: imgHash,
          fileSize: candidate.file_size || (candidate.fileSizeKB ? candidate.fileSizeKB * 1024 : undefined),
          fileSizeKB: candidate.fileSizeKB,
          creationTime: candidate.date_modified || candidate.dateModified,
          fileName,
          folder: candidate.folder,
          imageUrl: candidate.imageUrl || candidate.image_uri,
          base64Data,
        },
        Array.from(updatedScreenshotsMap.values())
      );

      if (duplicateResult.isDuplicate && duplicateResult.processedItem) {
        skippedCount++;
        if (duplicateResult.metadataUpdated) {
          modifiedUpdatedCount++;
          updatedScreenshotsMap.set(duplicateResult.processedItem.id, duplicateResult.processedItem);
        }

        if (onProgress) {
          onProgress({
            step: "Completed",
            currentStepIndex: 3,
            totalSteps: 6,
            processedCount: i + 1,
            totalCandidates: totalToProcess,
            newCount: newlyIndexedCount,
            modifiedCount: modifiedUpdatedCount,
            skippedCount,
            currentItemName: fileName,
            statusText: `Indexing ${i + 1}/${totalToProcess}: Already Indexed ${fileName}`,
            percent: basePercent + 5,
          });
        }
        await yieldToMainThread(10);
        continue; // Skip already indexed screenshots
      }

      // Check Plan Limits before OCR & AI vision analysis
      const quotaCheck = SubscriptionManager.canIndexScreenshot(updatedScreenshotsMap.size);
      if (!quotaCheck.allowed) {
        console.warn(`[IndexingEngine] Plan limit reached: ${quotaCheck.reason}`);
        window.dispatchEvent(
          new CustomEvent("snapfind_quota_exceeded", {
            detail: {
              title: quotaCheck.upgradePromptTitle,
              message: quotaCheck.upgradePromptMessage,
            },
          })
        );
        break;
      }

      // Optimize image for high-speed OCR and Gemini Analysis
      const optResult = await optimizeImageForPipeline(base64Data || candidate.imageUrl || candidate.image_uri || "", {
        maxDimension: 1600,
        quality: 0.88,
        thumbnailMax: 320,
        thumbnailQuality: 0.78,
      });
      const optimizedBase64 = optResult.optimizedBase64 || base64Data;
      const thumbnailUri = optResult.thumbnailBase64 || candidate.imageUrl || candidate.image_uri;

      // Progress update: Indexing X/Y
      if (onProgress) {
        onProgress({
          step: "OCR...",
          currentStepIndex: 3,
          totalSteps: 6,
          processedCount: i,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount,
          modifiedCount: modifiedUpdatedCount,
          skippedCount,
          currentItemName: fileName,
          statusText: `Indexing ${i + 1}/${totalToProcess}: Analyzing ${fileName}`,
          percent: basePercent + 3,
        });
      }
      await yieldToMainThread(5);

      // Execute Consolidated AI Analysis and QR Decoding
      let ocrText = "";
      let qrData: any = null;
      let rawAiTitle: string | undefined = undefined;
      let aiSummary = "";
      let aiDescription = "";
      let aiCategory: any = "Other";
      let aiCollectionName: string | undefined = undefined;
      let aiTags: string[] = ["Gallery", "Screenshot"];
      let aiEntities: string[] = [];
      let aiKeywords: string[] = [];
      let aiObjects: string[] = [];
      let visualFeatures: any = undefined;

      const aiTask = async () => {
        if (optimizedBase64) {
          try {
            return await analyzeScreenshotImage(optimizedBase64, fileName);
          } catch (aiErr) {
            console.warn("[IndexingEngine] AI analysis error:", aiErr);
            return null;
          }
        }
        return null;
      };

      const qrTask = async () => {
        if (optimizedBase64) {
          try {
            return await decodeQrFromImage(optimizedBase64);
          } catch (qrErr) {
            console.warn("[IndexingEngine] QR detection error:", qrErr);
            return null;
          }
        }
        return null;
      };

      const [aiSettled, qrSettled] = await Promise.allSettled([aiTask(), qrTask()]);
      qrData = qrSettled.status === "fulfilled" ? qrSettled.value : null;

      if (aiSettled.status === "fulfilled" && aiSettled.value && aiSettled.value.success && aiSettled.value.analysis) {
        const analysis = aiSettled.value.analysis;
        rawAiTitle = analysis.title;
        aiSummary = analysis.summary || "";
        aiDescription = analysis.description || analysis.summary || "";
        aiCategory = analysis.category || "Other";
        aiCollectionName = analysis.collectionName;
        ocrText = (analysis.fullText || "").trim();
        aiTags = Array.from(new Set([...aiTags, ...(analysis.tags || [])]));
        aiEntities = Array.isArray(analysis.keyEntities) ? analysis.keyEntities : [];
        aiKeywords = Array.isArray(analysis.keywords) ? analysis.keywords : [];
        aiObjects = Array.isArray(analysis.objects) ? analysis.objects : [];
        visualFeatures = (analysis as any).visual_features || (analysis as any).visualFeatures;
      }

      // Standalone OCR fallback if AI was unavailable or produced no text
      if (!ocrText && optimizedBase64) {
        try {
          const ocrRes = await extractTextServerOCR(optimizedBase64, fileName);
          ocrText = (ocrRes.text || ocrRes.ocrText || "").trim();
        } catch (e) {
          console.warn("[IndexingEngine] Standalone OCR fallback error:", e);
        }
      }

      if (!aiSummary) {
        aiSummary = ocrText ? `Contains text: ${ocrText.slice(0, 120)}...` : "Gallery Screenshot";
      }
      if (!aiDescription) {
        aiDescription = ocrText ? `Contains text: ${ocrText.slice(0, 180)}` : "Gallery Screenshot";
      }

      // If no OCR text was found (photos, diagrams, mockups, charts, illustrations), create rich descriptive fallback
      if (!ocrText && aiObjects.length > 0) {
        if (aiSummary === "Gallery Screenshot") {
          aiSummary = `Visual scene displaying ${aiObjects.slice(0, 3).join(", ")}`;
        }
        if (aiDescription === "Gallery Screenshot") {
          aiDescription = `Visual screenshot containing: ${aiObjects.join(", ")}. Category: ${aiCategory}`;
        }
      }

      // Website and URL extraction from OCR text and AI description
      const fullTextToInspect = [ocrText, aiSummary, aiDescription].filter(Boolean).join(" ");
      const websiteInfo = extractWebsitesFromText(fullTextToInspect);

      const primaryTitle = determinePrimaryTitle(rawAiTitle, ocrText, fileName, aiSummary);

      // STEP 5: Saving...
      if (onProgress) {
        onProgress({
          step: "Saving...",
          currentStepIndex: 5,
          totalSteps: 6,
          processedCount: i + 1,
          totalCandidates: totalToProcess,
          newCount: newlyIndexedCount + (isModified ? 0 : 1),
          modifiedCount: modifiedUpdatedCount + (isModified ? 1 : 0),
          skippedCount,
          currentItemName: fileName,
          statusText: `Indexing ${i + 1}/${totalToProcess}: Storing metadata for ${fileName}`,
          percent: basePercent + 6,
        });
      }

      const imageUrl = candidate.imageUrl || candidate.image_uri || base64Data || "";
      const createdAtStr = candidate.date_modified
        ? new Date(candidate.date_modified).toISOString()
        : new Date().toISOString();

      const newItem = normalizeScreenshotItem({
        id: candidate.id,
        imageUrl,
        image_uri: imageUrl,
        thumbnailUri: thumbnailUri || imageUrl,
        thumbnail_uri: thumbnailUri || imageUrl,
        title: primaryTitle,
        category: aiCategory,
        collectionName: aiCollectionName,
        summary: aiSummary,
        description: aiDescription,
        ai_description: aiDescription,
        fullText: ocrText,
        ocr_text: ocrText,
        keyEntities: aiEntities,
        keywords: aiKeywords,
        tags: aiTags,
        objects: aiObjects,
        objectsDetected: aiObjects,
        fileName,
        file_name: fileName,
        folder: candidate.folder || "Screenshots",
        createdAt: createdAtStr,
        date_created: createdAtStr,
        dateModified: createdAtStr,
        date_modified: createdAtStr,
        fileSizeKB: candidate.fileSizeKB || (candidate.file_size ? Math.round(candidate.file_size / 1024) : 150),
        file_size: candidate.file_size || 150 * 1024,
        indexedAt: scanStartTimeIso,
        indexed_at: scanStartTimeIso,
        isScreenshot: true,
        is_screenshot: true,
        sha256Hash: imgHash,
        sha256_hash: imgHash,
        hash: imgHash,
        fileHash: imgHash,
        website_name: websiteInfo.websiteName,
        websiteName: websiteInfo.websiteName,
        website_domain: websiteInfo.websiteDomain,
        websiteDomain: websiteInfo.websiteDomain,
        website_url: websiteInfo.websiteUrl,
        websiteUrl: websiteInfo.websiteUrl,
        detected_urls: websiteInfo.detectedUrls,
        detectedUrls: websiteInfo.detectedUrls,
        urls: websiteInfo.detectedUrls,
        website: websiteInfo.websiteDomain || websiteInfo.websiteName || websiteInfo.detectedUrls.length > 0 ? {
          name: websiteInfo.websiteName,
          domain: websiteInfo.websiteDomain,
          url: websiteInfo.websiteUrl,
          websiteUrl: websiteInfo.websiteUrl,
          detectedUrls: websiteInfo.detectedUrls,
        } : undefined,
        has_qr_code: Boolean(qrData?.hasQrCode),
        hasQrCode: Boolean(qrData?.hasQrCode),
        qr_code_data: qrData?.qrCodeData || null,
        qrCodeData: qrData?.qrCodeData || null,
        qr_code_type: qrData?.qrCodeType || "OTHER",
        qrCodeType: qrData?.qrCodeType || "OTHER",
        qr_url: qrData?.qrUrl || null,
        qrUrl: qrData?.qrUrl || null,
        qr_code: qrData?.hasQrCode
          ? {
              hasQrCode: true,
              data: qrData.qrCodeData || "",
              type: qrData.qrCodeType,
              url: qrData.qrUrl || undefined,
            }
          : undefined,
        visual_features: visualFeatures,
      });

      // Requirement 9: Print Debugging Report
      printPipelineDebuggingReport(newItem);

      updatedScreenshotsMap.set(newItem.id, newItem);
      indexedIds.add(newItem.id);

      if (isModified) {
        modifiedUpdatedCount++;
      } else {
        newlyIndexedCount++;
      }

      processedCount++;

      // Save batch every 5 items or at the end to maximize write throughput
      if (processedCount % 5 === 0 || processedCount === totalToProcess) {
        const currentList = Array.from(updatedScreenshotsMap.values());
        saveStoredScreenshotsBatch([newItem]);
        this.saveIndexedImageIds(indexedIds);
      }

      await yieldToMainThread(10);
    }

    // STEP 6: Completed
    this.setLastScanTimestamp(scanStartTimeIso);
    this.saveIndexedImageIds(indexedIds);
    this.isScanning = false;

    const finalList = Array.from(updatedScreenshotsMap.values());
    searchEngine.updateIndex(finalList);

    if (onProgress) {
      onProgress({
        step: "Completed",
        currentStepIndex: 6,
        totalSteps: 6,
        processedCount: totalToProcess,
        totalCandidates: candidates.length,
        newCount: newlyIndexedCount,
        modifiedCount: modifiedUpdatedCount,
        skippedCount,
        statusText: `Completed incremental index: ${newlyIndexedCount} new, ${modifiedUpdatedCount} modified, ${skippedCount} skipped.`,
        percent: 100,
      });
    }

    return {
      success: true,
      totalScanned: candidates.length,
      newIndexed: newlyIndexedCount,
      modifiedUpdated: modifiedUpdatedCount,
      skippedCount,
      lastScanTimestamp: scanStartTimeIso,
      items: finalList,
    };
  }

  /**
   * Ingest a single native screenshot candidate:
   * Performs duplicate detection, indexed_image_ids check & update,
   * last_scan_timestamp updates, and enqueues to ProcessingQueue.
   */
  public ingestScreenshotCandidate(candidate: CandidateImage): boolean {
    const indexedIds = this.getIndexedImageIds();
    const uri = candidate.image_uri || candidate.imageUrl || "";
    const candidateId = candidate.id;

    // Duplicate detection: check if already in indexed_image_ids or processingQueue
    if (indexedIds.has(candidateId) || (uri && processingQueue.isDuplicate(candidateId, uri))) {
      return false; // Skipped (duplicate)
    }

    // Add to indexed IDs set and persist
    indexedIds.add(candidateId);
    this.saveIndexedImageIds(indexedIds);

    // Update last scan timestamp if candidate date is newer
    const dateMs = parseTimestampMillis(candidate.date_modified || candidate.dateModified);
    if (dateMs > 0) {
      const currentLastMs = parseTimestampMillis(this.getLastScanTimestamp());
      if (dateMs > currentLastMs) {
        this.setLastScanTimestamp(new Date(dateMs).toISOString());
      }
    }

    // Enqueue to ProcessingQueue for OCR & AI analysis
    const fileName = candidate.file_name || candidate.fileName || `screenshot_${candidateId}.png`;
    processingQueue.enqueue({
      id: candidateId,
      imageUri: uri,
      fileName,
      folder: candidate.folder || "Screenshots",
      base64Data: candidate.base64Data,
    });

    return true; // Enqueued
  }

  /**
   * Ingest a batch of native screenshot candidates.
   */
  public ingestScreenshotCandidates(candidates: CandidateImage[]): { enqueued: number; skipped: number } {
    let enqueued = 0;
    let skipped = 0;
    for (const candidate of candidates) {
      if (this.ingestScreenshotCandidate(candidate)) {
        enqueued++;
      } else {
        skipped++;
      }
    }
    return { enqueued, skipped };
  }
}

export const indexingEngine = new IncrementalIndexingEngine();
