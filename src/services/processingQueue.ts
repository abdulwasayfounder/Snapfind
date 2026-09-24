import {
  ProcessingJob,
  ProcessingJobStatus,
  ScreenshotItem,
  CategoryType,
} from "../types";
import {
  loadStoredScreenshots,
  saveStoredScreenshots,
  saveStoredScreenshotsBatch,
  normalizeScreenshotItem,
  StorageManager,
} from "./storage.ts";
import { extractTextServerOCR, extractTextClientOCR, ocrWorkerManager } from "./ocr";
import { analyzeScreenshotImage } from "./api";
import { determinePrimaryTitle, printPipelineDebuggingReport } from "./pipelineAudit";
import { searchEngine } from "./searchEngine";
import { computeImageSha256 } from "../utils/hashUtils";
import { checkDuplicateScreenshot, handleDuplicateIndexing, checkExactDuplicateByHash } from "./duplicateDetector";
import { SubscriptionManager } from "./billing/SubscriptionManager";
import { optimizeImageForPipeline } from "../utils/imageOptimizer";
import { detectScreenshotPrivacy } from "./privacyDetector";
import { classifySmartSnaps } from "./smartSnapsClassifier";
import { decodeQrFromImage, extractWebsitesFromText } from "../utils/qrDetector";

const QUEUE_STORAGE_KEY = "snapfind_processing_queue_v1";
const MAX_RETRIES = 3;

export type QueueEventListener = (jobs: ProcessingJob[], activeJob: ProcessingJob | null) => void;

/**
 * Non-blocking yield helper to keep main thread and animations smooth
 */
function yieldToMainThread(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Background Processing Queue for OCR & AI Vision Analysis
 */
class ProcessingQueueService {
  private jobs: ProcessingJob[] = [];
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private listeners: Set<QueueEventListener> = new Set();
  private activeJob: ProcessingJob | null = null;
  private batchTotalCount: number = 0;
  private batchProcessedCount: number = 0;
  private readonly MAX_CONCURRENT_ANALYSES = 3;
  private activeWorkersCount: number = 0;

  constructor() {
    this.initAndRecover();
    // Warm up OCR worker in background
    ocrWorkerManager.preloadWorker();

    // Listen for online connectivity events to automatically resume offline queued jobs
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[ProcessingQueue] Connectivity restored. Automatically resuming waiting jobs...");
        this.resumeWaitingForNetworkJobs();
      });
    }
  }

  /**
   * Load queue state from storage and recover unfinished jobs
   */
  private initAndRecover(): void {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed: ProcessingJob[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Recover any job that was interrupted mid-execution
          this.jobs = parsed.map((job) => {
            if (
              job.status === "waiting_for_network" ||
              job.status === "waiting_for_verification"
            ) {
              return job;
            }
            if (
              job.status !== "Completed" &&
              job.status !== "Failed" &&
              job.status !== "Queued" &&
              job.status !== "completed" &&
              job.status !== "failed"
            ) {
              // Interrupted mid-process: reset to Queued for automatic retry/completion
              return {
                ...job,
                status: "Queued" as ProcessingJobStatus,
                progressPercent: 0,
                errorMessage: undefined,
              };
            }
            return job;
          });
        }
      }
    } catch (err) {
      console.warn("Failed to load queue from storage:", err);
      this.jobs = [];
    }

    // Auto start queue if pending items exist
    setTimeout(() => {
      this.processNextInQueue();
      if (typeof navigator !== "undefined" && navigator.onLine) {
        this.resumeWaitingForNetworkJobs();
      }
    }, 500);
  }

  /**
   * Save queue metadata to persistent storage (without holding massive binary blobs)
   */
  private persistQueue(): void {
    try {
      // Save lightweight job objects
      const lightweightJobs = this.jobs.map((job) => ({
        ...job,
        base64Data: undefined, // Strip large base64 data before saving queue state
      }));
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(lightweightJobs));
    } catch (err) {
      console.warn("Queue storage save warning:", err);
    }
  }

  /**
   * Notify subscribers of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.jobs], this.activeJob ? { ...this.activeJob } : null);
      } catch (err) {
        console.error("Queue listener error:", err);
      }
    });
  }

  /**
   * Subscribe to queue events
   */
  public subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    // Initial emit
    listener([...this.jobs], this.activeJob ? { ...this.activeJob } : null);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if image is duplicate (already queued or already completed in stored screenshots)
   */
  public isDuplicate(imageId: string, imageUri?: string, sha256Hash?: string, userId: string = "guest"): boolean {
    const cleanHash = (sha256Hash || "").trim().toLowerCase();

    // Check if in current queue
    const existsInQueue = this.jobs.some(
      (job) =>
        job.imageId === imageId ||
        (imageUri && job.imageUri === imageUri && job.status !== "Failed") ||
        (cleanHash && cleanHash.length >= 16 && (job.sha256Hash === cleanHash || job.hash === cleanHash) && job.status !== "Failed")
    );
    if (existsInQueue) return true;

    // Check if completed in storage
    const stored = loadStoredScreenshots();
    const existsInStorage = stored.some((s) => {
      if (s.isDeleted || s.is_deleted) return false;
      const itemUserId = s.user_id || s.userId || "guest";
      if (userId !== "guest" && itemUserId !== "guest" && itemUserId !== userId) {
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

      const isExactHash = Boolean(cleanHash && itemHash && cleanHash.length >= 16 && itemHash === cleanHash);
      const isSameId = s.id === imageId;
      const isSameUri = Boolean(imageUri && (s.imageUrl === imageUri || s.image_uri === imageUri));

      return (isExactHash || isSameId || isSameUri) && (s.processingStatus === "Completed" || s.title !== "Screenshot");
    });

    return existsInStorage;
  }

  /**
   * Enqueue a single image processing job
   */
  public enqueue(candidate: {
    id: string;
    imageUri: string;
    fileName: string;
    folder?: string;
    base64Data?: string;
    sha256Hash?: string;
    contentHash?: string;
    userId?: string;
  }): ProcessingJob | null {
    const hash = candidate.contentHash || candidate.sha256Hash;
    const userId = candidate.userId || "guest";

    if (this.isDuplicate(candidate.id, candidate.imageUri, hash, userId)) {
      console.log(`Already indexed screenshot skipped: ${candidate.id}`);
      return null;
    }

    const currentStored = loadStoredScreenshots();
    const quotaCheck = SubscriptionManager.canIndexScreenshot(currentStored.length);
    if (!quotaCheck.allowed) {
      console.warn(`[ProcessingQueue] ${quotaCheck.reason}`);
      window.dispatchEvent(
        new CustomEvent("snapfind_quota_exceeded", {
          detail: {
            title: quotaCheck.upgradePromptTitle,
            message: quotaCheck.upgradePromptMessage,
          },
        })
      );
      return null;
    }

    const newJob: ProcessingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      imageId: candidate.id,
      imageUri: candidate.imageUri,
      fileName: candidate.fileName || `image_${candidate.id}.png`,
      folder: candidate.folder || "Screenshots",
      sha256Hash: candidate.sha256Hash,
      hash: candidate.sha256Hash,
      status: "Queued",
      progressPercent: 0,
      attempts: 0,
      maxAttempts: MAX_RETRIES,
      queuedAt: new Date().toISOString(),
      base64Data: candidate.base64Data,
    };

    this.jobs.push(newJob);
    this.batchTotalCount = Math.max(this.batchTotalCount, this.jobs.filter((j) => j.status !== "Failed").length);
    this.persistQueue();
    this.notifyListeners();

    // Trigger processing asynchronously
    this.processNextInQueue();
    return newJob;
  }

  /**
   * Enqueue batch of image candidates (skips duplicates)
   */
  public enqueueBatch(
    candidates: Array<{
      id: string;
      imageUri: string;
      fileName: string;
      folder?: string;
      base64Data?: string;
      sha256Hash?: string;
    }>
  ): ProcessingJob[] {
    const enqueued: ProcessingJob[] = [];
    const pendingCount = this.jobs.filter((j) => j.status === "Queued" || j.status === "OCR Processing" || j.status === "AI Analysis").length;
    this.batchTotalCount = pendingCount + candidates.length;
    this.batchProcessedCount = 0;

    for (const c of candidates) {
      const job = this.enqueue(c);
      if (job) enqueued.push(job);
    }
    return enqueued;
  }

  /**
   * Pause processing
   */
  public pauseQueue(): void {
    this.isPaused = true;
    this.notifyListeners();
  }

  /**
   * Resume processing
   */
  public resumeQueue(): void {
    this.isPaused = false;
    this.processNextInQueue();
  }

  /**
   * Cancel processing and clear queue
   */
  public clearQueue(): void {
    this.jobs = [];
    this.activeJob = null;
    this.isProcessing = false;
    this.batchTotalCount = 0;
    this.batchProcessedCount = 0;
    this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Main Queue Executor — Process jobs concurrently up to MAX_CONCURRENT_ANALYSES
   */
  private async processNextInQueue(): Promise<void> {
    if (this.isPaused) return;

    while (this.activeWorkersCount < this.MAX_CONCURRENT_ANALYSES) {
      const nextJob = this.jobs.find((j) => j.status === "Queued");
      if (!nextJob) {
        if (this.activeWorkersCount === 0) {
          this.isProcessing = false;
          this.activeJob = null;
          this.batchTotalCount = 0;
          this.batchProcessedCount = 0;
          this.notifyListeners();
        }
        break;
      }

      this.isProcessing = true;
      this.activeWorkersCount++;

      // Update real-time batch progress (e.g. "Indexing 5/20")
      const totalInBatch = Math.max(1, this.batchTotalCount || this.jobs.length);
      this.batchProcessedCount = Math.min(totalInBatch, this.batchProcessedCount + 1);
      const progressLabel = `Indexing ${this.batchProcessedCount}/${totalInBatch}`;
      nextJob.batchTotal = totalInBatch;
      nextJob.batchCurrent = this.batchProcessedCount;
      nextJob.batchProgressText = progressLabel;
      this.activeJob = nextJob;

      this.runJob(nextJob);
    }
  }

  /**
   * Runs a single job in background worker slot
   */
  private async runJob(job: ProcessingJob): Promise<void> {
    try {
      await this.executePipeline(job);
    } catch (err: any) {
      console.error(`Pipeline execution error for job ${job.id}:`, err);
      await this.handleJobFailure(job, err.message || "Pipeline execution failed");
    } finally {
      this.activeWorkersCount = Math.max(0, this.activeWorkersCount - 1);
      this.persistQueue();
      this.notifyListeners();

      // Yield briefly to main thread before checking for more work
      await yieldToMainThread(10);
      this.processNextInQueue();
    }
  }

  /**
   * Update job status and progress percent
   */
  private updateJobState(
    job: ProcessingJob,
    status: ProcessingJobStatus,
    progressPercent: number
  ): void {
    job.status = status;
    job.progressPercent = progressPercent;
    this.notifyListeners();
  }

  /**
   * Execute optimized image processing pipeline
   * Runs OCR, Image Resizing & Gemini AI concurrently for maximum speed without quality loss
   */
  private async executePipeline(job: ProcessingJob): Promise<void> {
    job.attempts += 1;
    job.startedAt = job.startedAt || new Date().toISOString();

    // Step 1: Preparing & High-Performance Image Optimization
    this.updateJobState(job, "Preparing", 15);
    await yieldToMainThread(5);

    let rawSource = job.base64Data || job.imageUri;
    if (!rawSource || !rawSource.startsWith("data:image")) {
      rawSource = job.imageUri;
    }

    // Compute SHA-256 hash for duplicate check
    const imgHash = job.sha256Hash || (await computeImageSha256(rawSource));
    job.sha256Hash = imgHash;
    job.hash = imgHash;

    // Multi-factor duplicate check across hash, dimensions, OCR, Gemini summary, file size
    const currentStored = loadStoredScreenshots();
    const dupCheck = handleDuplicateIndexing(
      {
        id: job.imageId,
        hash: imgHash,
        sha256Hash: imgHash,
        fileName: job.fileName,
        folder: job.folder,
        imageUrl: job.imageUri,
        base64Data: rawSource,
      },
      currentStored
    );

    if (dupCheck.isDuplicate && dupCheck.processedItem) {
      console.log(`[ProcessingQueue] "Already indexed" - ${job.fileName} duplicate detected. Skipping OCR & Gemini processing.`);
      job.status = "Completed";
      job.progressPercent = 100;
      job.completedAt = new Date().toISOString();
      job.title = dupCheck.processedItem.title;
      job.description = dupCheck.processedItem.description || dupCheck.processedItem.summary;
      job.aiDescription = dupCheck.processedItem.ai_description || dupCheck.processedItem.summary;
      job.category = dupCheck.processedItem.category;
      job.tags = dupCheck.processedItem.tags;
      job.keywords = dupCheck.processedItem.keywords;
      job.errorMessage = "Already Indexed";
      job.base64Data = undefined;
      this.updateJobState(job, "Completed", 100);
      return;
    }

    // Fast image optimization: generate crisp 1600px OCR/AI image + 320px thumbnail in one operation
    const optResult = await optimizeImageForPipeline(rawSource, {
      maxDimension: 1600,
      quality: 0.88,
      thumbnailMax: 320,
      thumbnailQuality: 0.78,
    });

    const optimizedBase64 = optResult.optimizedBase64 || rawSource;
    job.thumbnailUri = optResult.thumbnailBase64 || job.imageUri;

    // Step 2 & 3: Run Consolidated High-Speed AI Vision & OCR Analysis
    this.updateJobState(job, "AI Analysis", 45);

    let ocrText = "";
    let rawAiTitle: string | undefined = undefined;
    let aiSummary = "";
    let aiDescription = "";
    let aiCategory: CategoryType = "Other";
    let aiCollectionName: string | undefined = undefined;
    let aiTags: string[] = ["screenshot", "indexed"];
    let aiKeywords: string[] = [];
    let aiKeyEntities: string[] = [];
    let aiObjects: string[] = [];
    let rawAiSmartCategory: any = undefined;
    let rawAiPrivacyLevel: any = undefined;
    let rawAiSensitiveCategories: string[] = [];
    let aiSucceeded = false;
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    // Single consolidated high-speed AI call: extracts OCR + all metadata simultaneously (when online)
    if (!isOffline && optimizedBase64 && optimizedBase64.startsWith("data:image")) {
      try {
        const aiRes = await analyzeScreenshotImage(optimizedBase64, job.fileName);
        if (aiRes.success && aiRes.analysis) {
          const analysis = aiRes.analysis;
          rawAiTitle = analysis.title;
          aiSummary = analysis.summary || "";
          aiDescription = analysis.description || analysis.summary || "";
          aiCategory = (analysis.category as CategoryType) || "Other";
          aiCollectionName = analysis.collectionName;
          ocrText = (analysis.fullText || "").trim();
          aiTags = Array.from(new Set([...aiTags, ...(analysis.tags || [])]));
          aiKeywords = Array.isArray(analysis.keywords) ? analysis.keywords : [];
          aiKeyEntities = Array.isArray(analysis.keyEntities) ? analysis.keyEntities : [];
          aiObjects = Array.isArray(analysis.objects) ? analysis.objects : [];
          const anyAnalysis = analysis as any;
          rawAiSmartCategory = anyAnalysis.smart_category || anyAnalysis.smartCategory;
          rawAiPrivacyLevel = anyAnalysis.privacy_level || anyAnalysis.privacyLevel;
          rawAiSensitiveCategories = Array.isArray(anyAnalysis.sensitive_categories) ? anyAnalysis.sensitive_categories : [];
          aiSucceeded = true;
        }
      } catch (aiErr) {
        console.warn("[ProcessingQueue] AI analysis warning, attempting OCR fallback:", aiErr);
      }
    }

    // Fast OCR: use client-side persistent Tesseract OCR when offline or server OCR when online
    if (!ocrText && optimizedBase64 && optimizedBase64.startsWith("data:image")) {
      this.updateJobState(job, "OCR Processing", 65);
      try {
        if (isOffline) {
          const clientOcr = await extractTextClientOCR(optimizedBase64);
          ocrText = (clientOcr.text || clientOcr.ocrText || "").trim();
        } else {
          const ocrRes = await extractTextServerOCR(optimizedBase64, job.fileName);
          ocrText = (ocrRes.text || ocrRes.ocrText || "").trim();
        }
      } catch (e) {
        console.warn("[ProcessingQueue] OCR fallback failed:", e);
      }
    }

    job.ocrText = ocrText;
    if (!aiSummary) {
      aiSummary = ocrText ? `Extracted text: ${ocrText.slice(0, 150)}...` : "Screenshot image.";
    }
    if (!aiDescription) {
      aiDescription = ocrText ? `Contains extracted OCR text: ${ocrText.slice(0, 200)}` : "Screenshot image.";
    }

    // Heuristic Category & Tag Inference from OCR if AI did not categorize
    if (aiCategory === "Other" && ocrText) {
      const lowerOcr = ocrText.toLowerCase();
      if (lowerOcr.includes("passport") || lowerOcr.includes("republic") || lowerOcr.includes("nationality") || lowerOcr.includes("visa")) {
        aiCategory = "Passport";
        aiTags.push("passport", "identity", "travel", "document");
      } else if (lowerOcr.includes("electricity") || lowerOcr.includes("power") || lowerOcr.includes("kwh") || lowerOcr.includes("meter reading") || lowerOcr.includes("energy bill")) {
        aiCategory = "Electricity Bill";
        aiTags.push("electricity", "bill", "utility", "power", "energy");
      } else if (lowerOcr.includes("recipe") || lowerOcr.includes("ingredients") || lowerOcr.includes("tablespoon") || lowerOcr.includes("cook") || lowerOcr.includes("bake") || lowerOcr.includes("pizza") || lowerOcr.includes("pasta")) {
        aiCategory = "Recipe";
        aiTags.push("recipe", "food", "cooking", "kitchen");
      } else if (lowerOcr.includes("flight") || lowerOcr.includes("airline") || lowerOcr.includes("boarding pass") || lowerOcr.includes("seat") || lowerOcr.includes("pnr")) {
        aiCategory = "Ticket & Travel";
        aiTags.push("flight", "travel", "ticket", "boarding");
      } else if (lowerOcr.includes("qr code") || lowerOcr.includes("upi") || lowerOcr.includes("scan to pay") || lowerOcr.includes("gpay")) {
        aiCategory = "QR Code";
        aiTags.push("qrcode", "payment", "scan");
      } else if (lowerOcr.includes("invoice") || lowerOcr.includes("receipt") || lowerOcr.includes("total:") || lowerOcr.includes("subtotal") || lowerOcr.includes("gst") || lowerOcr.includes("amount due")) {
        aiCategory = "Receipt & Invoice";
        aiTags.push("receipt", "invoice", "payment", "finance");
      } else if (lowerOcr.includes("amazon") || lowerOcr.includes("order #") || lowerOcr.includes("delivered") || lowerOcr.includes("tracking #")) {
        aiCategory = "E-Commerce";
        aiTags.push("order", "shopping", "ecommerce", "package");
      } else if (lowerOcr.includes("import ") || lowerOcr.includes("const ") || lowerOcr.includes("function ") || lowerOcr.includes("class ") || lowerOcr.includes("console.log")) {
        aiCategory = "Code & Dev";
        aiTags.push("code", "development", "programming");
      }
    }

    // Extract OCR keywords if keywords array is empty
    if (aiKeywords.length === 0 && ocrText) {
      const words = ocrText
        .replace(/[^\w\s$#@%-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["this", "that", "with", "from", "have", "were", "what", "when", "your"].includes(w.toLowerCase()));
      aiKeywords = Array.from(new Set(words)).slice(0, 10);
    }

    const primaryTitle = determinePrimaryTitle(rawAiTitle, ocrText, job.fileName, aiSummary);
    const finalProcessingStatus = aiSucceeded
      ? "Completed"
      : ocrText
      ? "CompletedWithLimitedMetadata"
      : "CompletedWithLimitedMetadata";

    job.title = primaryTitle;
    job.aiDescription = aiDescription;
    job.description = aiDescription;
    job.category = aiCategory;
    job.tags = Array.from(new Set(aiTags));
    job.keywords = aiKeywords;
    job.keyEntities = aiKeyEntities;
    job.objects = aiObjects;

    // Step 3.5: QR Code Detection & URL / Website Extraction
    let qrResult = { hasQrCode: false, qrCodeData: null as string | null, qrCodeType: "OTHER" as any, qrUrl: null as string | null };
    try {
      qrResult = await decodeQrFromImage(job.imageUri);
    } catch (qrErr) {
      console.warn("[ProcessingQueue] QR detection warning:", qrErr);
    }

    const combinedTextForUrls = [ocrText, primaryTitle, aiSummary, aiDescription, ...(aiKeywords || [])].filter(Boolean).join(" ");
    const websiteInfo = extractWebsitesFromText(combinedTextForUrls);

    // Step 4: Batch Persistence & Fast Storage Write
    this.updateJobState(job, "Saving Metadata", 88);
    await yieldToMainThread(5);

    const nowIso = new Date().toISOString();
    job.processingTimestamp = nowIso;

    const privacyResult = detectScreenshotPrivacy(ocrText, primaryTitle, aiCategory, aiTags);
    const smartClassification = classifySmartSnaps(
      ocrText,
      primaryTitle,
      aiCategory,
      aiTags,
      aiKeyEntities,
      aiKeywords
    );

    // Prioritize AI smart_category if specific, otherwise strict OCR/visual classifier
    const finalSmartCategory =
      rawAiSmartCategory && rawAiSmartCategory !== "Other"
        ? rawAiSmartCategory
        : smartClassification.smartCategory;

    let finalPrivacyLevel = smartClassification.privacyLevel;
    if (rawAiPrivacyLevel === "highly_sensitive") {
      finalPrivacyLevel = "highly_sensitive";
    } else if (rawAiPrivacyLevel === "private" && finalPrivacyLevel === "normal") {
      finalPrivacyLevel = "private";
    }

    const finalSensitiveCategories = Array.from(
      new Set([
        ...smartClassification.sensitiveCategories,
        ...privacyResult.sensitiveCategories,
        ...rawAiSensitiveCategories,
      ])
    );

    const finalPrivacyReasons = Array.from(
      new Set([
        ...smartClassification.privacyReasons,
        ...privacyResult.privacyReasons,
      ])
    );

    const isFinalSensitive = finalPrivacyLevel === "private" || finalPrivacyLevel === "highly_sensitive";

    // Auto smart collection routing:
    // Route financial to "💳 Banking & Payments"
    if (
      smartClassification.isFinance ||
      ["Banking", "Transactions", "Payments", "Money Transfers"].includes(finalSmartCategory)
    ) {
      if (!aiCollectionName || aiCollectionName === "Ideas & Notes" || aiCollectionName === "Financial Documents") {
        aiCollectionName = "💳 Banking & Payments";
      }
    } else if (isFinalSensitive) {
      if (!aiCollectionName || aiCollectionName === "Ideas & Notes") {
        aiCollectionName = "🔒 Private & Sensitive";
      }
    }

    const updatedItem: ScreenshotItem = normalizeScreenshotItem({
      id: job.imageId,
      imageUrl: job.imageUri,
      image_uri: job.imageUri,
      thumbnailUri: job.thumbnailUri || job.imageUri,
      thumbnail_uri: job.thumbnailUri || job.imageUri,
      title: primaryTitle,
      category: aiCategory,
      collectionName: aiCollectionName,
      summary: aiSummary,
      ai_description: aiDescription,
      description: aiDescription,
      fullText: ocrText,
      ocr_text: ocrText,
      keyEntities: aiKeyEntities,
      keywords: aiKeywords,
      tags: Array.from(new Set(aiTags)),
      objects: aiObjects,
      objectsDetected: aiObjects,
      fileName: job.fileName,
      file_name: job.fileName,
      folder: job.folder || "Screenshots",
      createdAt: nowIso,
      date_created: nowIso,
      dateModified: nowIso,
      date_modified: nowIso,
      indexedAt: nowIso,
      indexed_at: nowIso,
      isScreenshot: true,
      is_screenshot: true,
      processingStatus: isOffline ? ("waiting_for_network" as any) : (finalProcessingStatus as any),
      processing_status: isOffline ? ("waiting_for_network" as any) : (finalProcessingStatus as any),
      cloudSyncStatus: isOffline ? "pending" : "synced",
      processingTimestamp: nowIso,
      processing_timestamp: nowIso,
      content_hash: imgHash,
      contentHash: imgHash,
      sha256Hash: imgHash,
      sha256_hash: imgHash,
      hash: imgHash,
      fileHash: imgHash,
      smart_category: finalSmartCategory,
      smartCategory: finalSmartCategory,
      privacy_level: finalPrivacyLevel,
      privacyLevel: finalPrivacyLevel,
      sensitive_categories: finalSensitiveCategories,
      sensitiveCategories: finalSensitiveCategories,
      is_sensitive: isFinalSensitive,
      isSensitive: isFinalSensitive,
      masked_ocr_text: privacyResult.maskedOcrText,
      maskedOcrText: privacyResult.maskedOcrText,
      privacy_reasons: finalPrivacyReasons,
      privacyReasons: finalPrivacyReasons,
      is_blurred: isFinalSensitive,
      isBlurred: isFinalSensitive,
      // URL, Website and QR Code detection
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
      has_qr_code: qrResult.hasQrCode,
      hasQrCode: qrResult.hasQrCode,
      qr_code_data: qrResult.qrCodeData,
      qrCodeData: qrResult.qrCodeData,
      qr_code_type: qrResult.qrCodeType,
      qrCodeType: qrResult.qrCodeType,
      qr_url: qrResult.qrUrl,
      qrUrl: qrResult.qrUrl,
      qr_code: qrResult.hasQrCode ? {
        hasQrCode: true,
        data: qrResult.qrCodeData || "",
        type: qrResult.qrCodeType,
        url: qrResult.qrUrl || undefined,
      } : undefined,
    });

    // Batch persist to SQLite / IndexedDB
    saveStoredScreenshotsBatch([updatedItem]);

    // Print Pipeline Debugging Report
    printPipelineDebuggingReport(updatedItem);

    // Step 5: Incremental Search Index Update
    this.updateJobState(job, "Updating Search Index", 95);
    searchEngine.updateItem(updatedItem);
    await yieldToMainThread(5);

    // Finalize Step: Completed (or waiting_for_network if offline) & Free Memory
    if (isOffline) {
      job.status = "waiting_for_network";
      job.progressPercent = 100;
      job.completedAt = nowIso;
      job.errorMessage = "Waiting for Internet";
      job.base64Data = undefined;
    } else {
      job.status = "Completed";
      job.progressPercent = 100;
      job.completedAt = nowIso;
      job.base64Data = undefined;
    }

    // Dispatch global event for App and views to receive real-time completed screenshot
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("snapfind_screenshot_processed", {
          detail: { screenshot: updatedItem, jobId: job.id },
        })
      );
    }
  }

  /**
   * Automatically resume offline jobs when network connectivity returns
   * Enriches metadata via cloud AI without repeating successful local OCR
   */
  public async resumeWaitingForNetworkJobs(): Promise<void> {
    const waitingJobs = this.jobs.filter(
      (j) => j.status === "waiting_for_network" || j.status === "waiting_for_verification"
    );
    if (waitingJobs.length === 0) return;

    console.log(`[ProcessingQueue] Resuming ${waitingJobs.length} offline jobs for cloud enrichment...`);

    const stored = loadStoredScreenshots();
    const quotaCheck = SubscriptionManager.canIndexScreenshot(stored.length);

    for (const job of waitingJobs) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break;

      if (!quotaCheck.allowed) {
        job.status = "waiting_for_verification";
        job.errorMessage = "Waiting for account verification";
        continue;
      }

      try {
        this.updateJobState(job, "AI Analysis", 50);
        let rawSource = job.base64Data || job.imageUri;
        if (!rawSource || !rawSource.startsWith("data:image")) {
          rawSource = job.imageUri;
        }

        const optResult = await optimizeImageForPipeline(rawSource, {
          maxDimension: 1600,
          quality: 0.88,
          thumbnailMax: 320,
          thumbnailQuality: 0.78,
        });
        const optimizedBase64 = optResult.optimizedBase64 || rawSource;

        if (optimizedBase64 && optimizedBase64.startsWith("data:image")) {
          const aiRes = await analyzeScreenshotImage(optimizedBase64, job.fileName);
          if (aiRes.success && aiRes.analysis) {
            const analysis = aiRes.analysis;
            const existingItem = stored.find((s) => s.id === job.imageId);
            if (existingItem) {
              const enrichedItem: ScreenshotItem = normalizeScreenshotItem({
                ...existingItem,
                title: determinePrimaryTitle(analysis.title, existingItem.fullText || job.ocrText, job.fileName, analysis.summary),
                summary: analysis.summary || existingItem.summary,
                description: analysis.description || analysis.summary || existingItem.description,
                ai_description: analysis.description || analysis.summary || existingItem.ai_description,
                category: (analysis.category as CategoryType) || existingItem.category,
                tags: Array.from(new Set([...(existingItem.tags || []), ...(analysis.tags || [])])),
                keywords: Array.from(new Set([...(existingItem.keywords || []), ...(analysis.keywords || [])])),
                keyEntities: Array.from(new Set([...(existingItem.keyEntities || []), ...(analysis.keyEntities || [])])),
                objects: Array.from(new Set([...(existingItem.objects || []), ...(analysis.objects || [])])),
                collectionName: analysis.collectionName || existingItem.collectionName,
                processingStatus: "Completed",
                processing_status: "Completed",
                cloudSyncStatus: "synced",
                dateModified: new Date().toISOString(),
                date_modified: new Date().toISOString(),
              });

              saveStoredScreenshotsBatch([enrichedItem]);
              searchEngine.updateItem(enrichedItem);

              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("snapfind_screenshot_processed", {
                    detail: { screenshot: enrichedItem, jobId: job.id },
                  })
                );
              }
            }
          }
        }

        job.status = "Completed";
        job.progressPercent = 100;
        job.completedAt = new Date().toISOString();
        job.errorMessage = undefined;
        job.base64Data = undefined;
      } catch (err: any) {
        console.warn(`[ProcessingQueue] Failed resuming job ${job.id}:`, err);
      }
    }

    this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Handle failures with automatic retry logic (up to 3 attempts)
   */
  private async handleJobFailure(job: ProcessingJob, errorMsg: string): Promise<void> {
    if (job.attempts < job.maxAttempts) {
      console.warn(`Job ${job.id} failed (Attempt ${job.attempts}/${job.maxAttempts}). Re-queuing...`);
      job.status = "Queued";
      job.errorMessage = `Retry ${job.attempts}/${job.maxAttempts}: ${errorMsg}`;
      job.progressPercent = 0;
      await yieldToMainThread(500); // Backoff delay before retry
    } else {
      console.error(`Job ${job.id} permanently failed after ${job.attempts} attempts.`);
      job.status = "Failed";
      job.errorMessage = errorMsg;
      job.progressPercent = 100;
      job.base64Data = undefined; // Clear memory

      // Update screenshot in storage so it transitions from 'Pending' to 'Failed'
      const failedItem = normalizeScreenshotItem({
        id: job.imageId,
        imageUrl: job.imageUri,
        image_uri: job.imageUri,
        fileName: job.fileName,
        title: job.fileName || "Screenshot",
        processingStatus: "Failed",
        processing_status: "Failed",
      });
      saveStoredScreenshotsBatch([failedItem]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("snapfind_screenshot_processed", {
            detail: { screenshot: failedItem, jobId: job.id, error: errorMsg },
          })
        );
      }
    }
  }

  /**
   * Get all current jobs
   */
  public getAllJobs(): ProcessingJob[] {
    return [...this.jobs];
  }

  /**
   * Get job by ID
   */
  public getJob(jobId: string): ProcessingJob | undefined {
    return this.jobs.find((j) => j.id === jobId || j.imageId === jobId);
  }

  /**
   * Manually retry a failed or stuck screenshot processing job
   */
  public retryScreenshot(item: ScreenshotItem): ProcessingJob | null {
    // Remove previous jobs for this image
    this.jobs = this.jobs.filter((j) => j.imageId !== item.id && j.id !== item.id);

    // Reset screenshot status in storage
    const resetItem = normalizeScreenshotItem({
      ...item,
      processingStatus: "Queued",
      processing_status: "Queued",
    });
    saveStoredScreenshotsBatch([resetItem]);

    // Create fresh job and enqueue
    const newJob: ProcessingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      imageId: item.id,
      imageUri: item.imageUrl || item.image_uri,
      fileName: item.fileName || item.file_name || `image_${item.id}.png`,
      folder: item.folder || "Screenshots",
      sha256Hash: item.sha256Hash,
      hash: item.sha256Hash,
      status: "Queued",
      progressPercent: 0,
      attempts: 0,
      maxAttempts: MAX_RETRIES,
      queuedAt: new Date().toISOString(),
    };

    this.jobs.push(newJob);
    this.batchTotalCount = Math.max(1, this.jobs.filter((j) => j.status !== "Failed").length);
    this.persistQueue();
    this.notifyListeners();
    this.processNextInQueue();
    return newJob;
  }
}

export const processingQueue = new ProcessingQueueService();

