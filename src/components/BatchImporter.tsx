import React, { useState, useRef } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  UploadCloud,
  FileImage,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem } from "../types";
import { analyzeScreenshotImage } from "../services/api";
import { extractTextServerOCR } from "../services/ocr";
import { normalizeScreenshotItem, loadStoredScreenshots } from "../services/storage";
import { determinePrimaryTitle, printPipelineDebuggingReport } from "../services/pipelineAudit";
import { INITIAL_SAMPLE_SCREENSHOTS } from "../data/sampleScreenshots";
import { searchEngine } from "../services/searchEngine";
import { processingQueue } from "../services/processingQueue";
import { computeImageSha256 } from "../utils/hashUtils";
import { handleDuplicateIndexing, checkExactDuplicateByHash } from "../services/duplicateDetector";
import { NotificationService } from "../services/notificationService";
import { optimizeImageForPipeline } from "../utils/imageOptimizer";
import { PageHeroHeader } from "./PageHeroHeader";
import { detectScreenshotPrivacy } from "../services/privacyDetector";
import { decodeQrFromImage, extractWebsitesFromText } from "../utils/qrDetector";

interface BatchImporterProps {
  onAddScreenshots: (newItems: ScreenshotItem[]) => void;
  isDark: boolean;
  onFinishImport: () => void;
  addToast: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

interface StagedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
}

interface ProcessingProgressState {
  isProcessing: boolean;
  currentIndex: number;
  totalCount: number;
  currentFileName: string;
  completedCount: number;
  duplicateCount: number;
  errorCount: number;
  isCompleted: boolean;
}

export const BatchImporter: React.FC<BatchImporterProps> = ({
  onAddScreenshots,
  isDark,
  onFinishImport,
  addToast,
}) => {
  const [stagedFiles, setStagedFiles] = useState<StagedFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgressState>({
    isProcessing: false,
    currentIndex: 0,
    totalCount: 0,
    currentFileName: "",
    completedCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    isCompleted: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = (files: File[]) => {
    const validImageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validImageFiles.length === 0) {
      addToast({
        title: "No Images Selected",
        description: "Please select valid image or screenshot files (PNG, JPG, WEBP, etc.).",
        type: "info",
      });
      return;
    }

    const newStaged: StagedFileItem[] = validImageFiles.map((file, idx) => ({
      id: `staged-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
    // Reset completion state if new files are added
    if (progress.isCompleted) {
      setProgress((prev) => ({ ...prev, isCompleted: false, isProcessing: false }));
    }
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleClearAllStaged = () => {
    stagedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setStagedFiles([]);
    setProgress({
      isProcessing: false,
      currentIndex: 0,
      totalCount: 0,
      currentFileName: "",
      completedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      isCompleted: false,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleStartImportAndIndex = async () => {
    if (stagedFiles.length === 0 || progress.isProcessing) return;

    const total = stagedFiles.length;
    setProgress({
      isProcessing: true,
      currentIndex: 0,
      totalCount: total,
      currentFileName: stagedFiles[0]?.fileName || "",
      completedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      isCompleted: false,
    });

    const createdScreenshots: ScreenshotItem[] = [];
    let duplicates = 0;
    let errors = 0;
    let successes = 0;

    for (let i = 0; i < total; i++) {
      const staged = stagedFiles[i];
      const file = staged.file;

      setProgress((prev) => ({
        ...prev,
        currentIndex: i,
        currentFileName: staged.fileName,
      }));

      try {
        const base64 = await fileToBase64(file);
        const fileHash = await computeImageSha256(file);

        // Absolute Content-Hash Duplicate Check BEFORE OCR or AI
        const stored = loadStoredScreenshots();
        const exactDup = checkExactDuplicateByHash(fileHash, undefined, stored);
        if (exactDup.isDuplicate) {
          duplicates++;
          setProgress((prev) => ({ ...prev, duplicateCount: prev.duplicateCount + 1 }));
          console.log(`[BatchImporter] 📸 Already indexed - skipped ${file.name}`);
          continue;
        }

        // Multi-attribute fallback duplicate check
        const dupCheck = handleDuplicateIndexing(
          {
            hash: fileHash,
            sha256Hash: fileHash,
            contentHash: fileHash,
            fileSize: file.size,
            fileSizeKB: Math.round(file.size / 1024),
            creationTime: file.lastModified,
            fileName: file.name,
            imageUrl: base64,
            base64Data: base64,
          },
          stored
        );

        if (dupCheck.isDuplicate && dupCheck.processedItem) {
          duplicates++;
          setProgress((prev) => ({ ...prev, duplicateCount: prev.duplicateCount + 1 }));
          continue;
        }

        // Optimize image payload for OCR & Gemini processing
        const optResult = await optimizeImageForPipeline(base64, {
          maxDimension: 1600,
          quality: 0.88,
          thumbnailMax: 320,
          thumbnailQuality: 0.78,
        });
        const optimizedBase64 = optResult.optimizedBase64 || base64;
        const thumbnailUri = optResult.thumbnailBase64 || base64;

        // Consolidated Gemini Vision Analysis with fallback to OCR
        let analysis: any = null;
        let ocrText = "";

        try {
          const res = await analyzeScreenshotImage(optimizedBase64, file.name, file.type || "image/png");
          if (res.success && res.analysis) {
            analysis = res.analysis;
            ocrText = (analysis.fullText || "").trim();
          }
        } catch (aiErr) {
          console.warn("[BatchImporter] Gemini Vision warning:", aiErr);
        }

        // Fallback to standalone OCR only if AI didn't return text
        if (!ocrText) {
          try {
            const ocrRes = await extractTextServerOCR(optimizedBase64, file.name);
            if (ocrRes.success && (ocrRes.ocrText || ocrRes.text)) {
              ocrText = (ocrRes.ocrText || ocrRes.text).trim();
            }
          } catch (ocrErr) {
            console.warn("[BatchImporter] Standalone OCR fallback error:", ocrErr);
          }
        }

        const fullText = (analysis?.fullText || ocrText || "").trim();

        // Heuristics
        let category: any = analysis?.category || "Other";
        let tags: string[] = analysis?.tags || ["screenshot", "indexed"];
        let keyEntities: string[] = Array.isArray(analysis?.keyEntities) ? analysis.keyEntities : [];
        let keywords: string[] = Array.isArray(analysis?.keywords) ? analysis.keywords : [];

        if (category === "Other" && fullText) {
          const lower = fullText.toLowerCase();
          if (lower.includes("passport") || lower.includes("republic") || lower.includes("visa")) {
            category = "Passport";
            tags.push("passport", "identity", "travel");
          } else if (lower.includes("electricity") || lower.includes("power") || lower.includes("bill")) {
            category = "Electricity Bill";
            tags.push("electricity", "bill", "utility");
          } else if (lower.includes("recipe") || lower.includes("ingredients") || lower.includes("cook")) {
            category = "Recipe";
            tags.push("recipe", "food", "cooking");
          } else if (lower.includes("flight") || lower.includes("boarding pass") || lower.includes("airline")) {
            category = "Ticket & Travel";
            tags.push("flight", "travel", "ticket");
          } else if (lower.includes("invoice") || lower.includes("receipt") || lower.includes("total")) {
            category = "Receipt & Invoice";
            tags.push("receipt", "invoice", "payment");
          } else if (lower.includes("qr code") || lower.includes("upi") || lower.includes("scan to pay")) {
            category = "QR Code";
            tags.push("qrcode", "payment", "scan");
          }
        }

        if (keywords.length === 0 && fullText) {
          const words = fullText
            .replace(/[^\w\s$#@%-]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 3 && !["this", "that", "with", "from", "have", "were", "what"].includes(w.toLowerCase()));
          keywords = Array.from(new Set<string>(words)).slice(0, 10);
        }

        const summary = analysis?.summary || (fullText ? `OCR text: ${fullText.slice(0, 120)}...` : "Screenshot image.");
        const description = analysis?.description || summary;
        const selectedTitle = determinePrimaryTitle(analysis?.title, fullText, file.name, summary);

        const cleanTags: string[] = Array.from(new Set(tags));
        const cleanKeywords: string[] = Array.from(new Set(keywords));
        const cleanEntities: string[] = Array.from(new Set(keyEntities));

        const privacyResult = detectScreenshotPrivacy(
          fullText,
          selectedTitle,
          category,
          cleanTags
        );

        // QR Code Detection & URL / Website Extraction
        let qrResult = { hasQrCode: false, qrCodeData: null as string | null, qrCodeType: "OTHER" as any, qrUrl: null as string | null };
        try {
          qrResult = await decodeQrFromImage(optimizedBase64);
        } catch (qrErr) {
          console.warn("[BatchImporter] QR detection error:", qrErr);
        }

        const combinedTextForUrls = [fullText, selectedTitle, summary, description, ...cleanKeywords].filter(Boolean).join(" ");
        const websiteInfo = extractWebsitesFromText(combinedTextForUrls);

        const rawItem: Partial<ScreenshotItem> = {
          id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: selectedTitle,
          category,
          collectionName: analysis?.collectionName,
          summary,
          description,
          ai_description: description,
          ocr_text: fullText,
          fullText,
          keyEntities: cleanEntities,
          keywords: cleanKeywords,
          tags: cleanTags,
          objects: analysis?.objects || [],
          objectsDetected: analysis?.objects || [],
          textDensity: analysis?.textDensity || "medium",
          keyMetrics: analysis?.keyMetrics || [],
          imageUrl: base64,
          thumbnailUri: thumbnailUri || base64,
          thumbnail_uri: thumbnailUri || base64,
          file_name: file.name,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          indexedAt: new Date().toISOString(),
          processingStatus: analysis ? "Completed" : "CompletedWithLimitedMetadata",
          fileSizeKB: Math.round(file.size / 1024),
          content_hash: fileHash,
          contentHash: fileHash,
          sha256Hash: fileHash,
          sha256_hash: fileHash,
          hash: fileHash,
          fileHash,
          privacy_level: privacyResult.privacyLevel,
          privacyLevel: privacyResult.privacyLevel,
          sensitive_categories: privacyResult.sensitiveCategories,
          sensitiveCategories: privacyResult.sensitiveCategories,
          is_sensitive: privacyResult.isSensitive,
          isSensitive: privacyResult.isSensitive,
          masked_ocr_text: privacyResult.maskedOcrText,
          maskedOcrText: privacyResult.maskedOcrText,
          privacy_reasons: privacyResult.privacyReasons,
          privacyReasons: privacyResult.privacyReasons,
          // URL, Website & QR Code Structured Metadata
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
        };

        const newItem = normalizeScreenshotItem(rawItem);
        createdScreenshots.push(newItem);
        printPipelineDebuggingReport(newItem);
        successes++;
        setProgress((prev) => ({ ...prev, completedCount: successes }));
      } catch (err) {
        console.error("[BatchImporter] Error indexing file:", file.name, err);
        errors++;
        setProgress((prev) => ({ ...prev, errorCount: errors }));
      }
    }

    // Save all new items to storage & engine
    if (createdScreenshots.length > 0) {
      onAddScreenshots(createdScreenshots);
      createdScreenshots.forEach((item) => {
        searchEngine.updateItem(item);
        // Only enqueue if the item was not already successfully processed
        if (item.processingStatus !== "Completed" && !processingQueue.isDuplicate(item.id, item.imageUrl)) {
          processingQueue.enqueue({
            id: item.id,
            imageUri: item.imageUrl,
            fileName: item.fileName || "screenshot.png",
            folder: item.folder,
            base64Data: item.imageUrl,
          });
        }
      });

      addToast({
        title: `Imported ${createdScreenshots.length} Screenshot${createdScreenshots.length > 1 ? "s" : ""}`,
        description: "Vision OCR text indexing complete and searchable.",
        type: "success",
      });
    }

    if (duplicates > 0 && createdScreenshots.length === 0) {
      addToast({
        title: "📸 Already Indexed",
        description: `This screenshot is already in SnapFind. Duplicate imports skipped.`,
        type: "info",
      });
    } else if (duplicates > 0) {
      addToast({
        title: "Duplicates Skipped",
        description: `📸 Already indexed: ${duplicates} duplicate screenshot${duplicates > 1 ? "s were" : " was"} skipped.`,
        type: "info",
      });
    }

    setProgress({
      isProcessing: false,
      currentIndex: total,
      totalCount: total,
      currentFileName: "",
      completedCount: successes,
      duplicateCount: duplicates,
      errorCount: errors,
      isCompleted: true,
    });
  };

  const handleImportSamplePack = () => {
    onAddScreenshots(INITIAL_SAMPLE_SCREENSHOTS);
    addToast({
      title: "Sample Pack Loaded",
      description: "Added 6 sample screenshots (Passport, Bill, Recipe, QR Code, Admission, MacBook).",
      type: "success",
    });
    onFinishImport();
  };

  const percentComplete = progress.totalCount > 0
    ? Math.round(((progress.currentIndex + (progress.isCompleted ? 0 : 1)) / progress.totalCount) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-text">
      {/* Header Section */}
      <PageHeroHeader
        type="import"
        title="Import & Vision Indexing"
        subtitle="Bring your screenshots into SnapFind. Gemini vision pipeline extracts text, summaries, and key entities automatically."
        isDark={isDark}
        actions={
          <button
            onClick={handleImportSamplePack}
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Load 6 Sample Files</span>
          </button>
        }
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. INITIAL / STAGING AREA: Drag & Drop Zone */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!progress.isProcessing && !progress.isCompleted && (
        <div className="space-y-6">
          {/* Primary Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 flex flex-col items-center justify-center gap-4 ${
              isDragOver
                ? "border-[#3B82F6] bg-[#3B82F6]/10 scale-[0.99]"
                : isDark
                ? "bg-[#0D1117] border-white/[0.08] hover:border-[#3B82F6]/60 hover:bg-[#121821]"
                : "bg-slate-50 border-slate-300 hover:border-blue-400 hover:bg-slate-100"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesSelected(Array.from(e.target.files));
                }
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center border border-[#3B82F6]/20 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                Drag & Drop files here
              </h3>
              <p className="text-xs text-[#94A3B8]">
                or select multiple screenshot images from your computer or camera roll
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="choose-files-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Choose files</span>
              </button>
            </div>

            <div className="pt-2 text-[11px] text-[#64748B] flex items-center gap-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Supports PNG, JPG, WEBP, HEIC (Processed locally & with private AI)</span>
            </div>
          </div>

          {/* Staged Files Preview Grid */}
          {stagedFiles.length > 0 && (
            <div
              className={`p-5 rounded-3xl border space-y-4 ${
                isDark ? "bg-[#0D1117] border-white/[0.08]" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-[#3B82F6]" />
                    <span>Selected Screenshots ({stagedFiles.length})</span>
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Ready for OCR text extraction and AI indexing.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors cursor-pointer"
                  >
                    + Add More
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllStaged}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                {stagedFiles.map((staged) => (
                  <div
                    key={staged.id}
                    className={`group relative rounded-2xl border p-2 flex flex-col justify-between overflow-hidden ${
                      isDark ? "bg-[#121821] border-white/[0.08] hover:bg-[#18202B]" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 mb-2">
                      <img
                        src={staged.previewUrl}
                        alt={staged.fileName}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStagedFile(staged.id)}
                        title="Remove file"
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="px-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate" title={staged.fileName}>
                        {staged.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{staged.fileSizeFormatted}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Primary Action Button */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-4">
                <span className="text-xs text-[#94A3B8]">
                  Total: {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""}
                </span>

                <button
                  id="start-import-btn"
                  type="button"
                  onClick={handleStartImportAndIndex}
                  className="px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Import & Index ({stagedFiles.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PROGRESS SECTION (In-Page, Not Repeated Notifications) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {progress.isProcessing && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
            isDark ? "bg-[#0D1117] border-white/[0.08]" : "bg-white border-slate-200"
          }`}
        >
          <div className="space-y-2 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center mx-auto border border-[#3B82F6]/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-white">
              Indexing {Math.min(progress.currentIndex + 1, progress.totalCount)} of {progress.totalCount} screenshots
            </h3>

            <p className="text-xs text-slate-400 truncate">
              Currently analyzing: <span className="text-slate-200 font-medium">{progress.currentFileName}</span>
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>Progress</span>
              <span>{percentComplete}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[#121821] border border-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] transition-all duration-300 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2 border-t border-white/[0.08]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {progress.completedCount} indexed
            </span>
            {progress.duplicateCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" /> {progress.duplicateCount} duplicates skipped
              </span>
            )}
            {progress.errorCount > 0 && (
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" /> {progress.errorCount} failed
              </span>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. COMPLETION SECTION: Success state with [ View Gallery ] */}
      {/* ───────────────────────────────────────────────────────────── */}
      {progress.isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 sm:p-8 rounded-3xl border space-y-6 text-center ${
            isDark ? "bg-[#0D1117] border-white/[0.08]" : "bg-white border-slate-200"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <Check className="w-7 h-7 stroke-[3]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-white">
              {progress.completedCount} screenshot{progress.completedCount === 1 ? "" : "s"} imported successfully
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              All extracted OCR text and AI vision tags have been indexed and are ready for instant search.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              id="view-gallery-btn"
              type="button"
              onClick={onFinishImport}
              className="px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>View Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="import-more-btn"
              type="button"
              onClick={handleClearAllStaged}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs sm:text-sm font-semibold border border-white/[0.08] transition-colors cursor-pointer"
            >
              Import More
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
