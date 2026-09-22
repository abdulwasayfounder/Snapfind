import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  Star,
  Trash2,
  Sparkles,
  FileText,
  Search,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Layers,
  Share2,
  RotateCcw,
  Tag,
  Box,
  FileCode,
  KeyRound,
  QrCode,
  Globe,
  ExternalLink,
  Link2,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { ScreenshotItem } from "../types";
import { AskAIBottomSheet } from "./AskAIBottomSheet";

interface ImageViewerModalProps {
  item: ScreenshotItem | null;
  items?: ScreenshotItem[];
  onSelectItem?: (item: ScreenshotItem) => void;
  onClose: () => void;
  isDark: boolean;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onReindex?: (id: string) => void;
  onSearchTag: (tag: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  item,
  items = [],
  onSelectItem,
  onClose,
  isDark,
  onToggleFavorite,
  onDelete,
  onReindex,
  onSearchTag,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [ocrSearch, setOcrSearch] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [revealSensitive, setRevealSensitive] = useState(false);

  // Collapsible Section Toggles (AI Summary, OCR, Keywords, Tags, Objects, Links & QR open by default; Metadata collapsed)
  const [sections, setSections] = useState({
    summary: true,
    ocr: true,
    keywords: true,
    tags: true,
    objects: true,
    linksAndQr: true,
    metadata: false,
  });

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [copiedQr, setCopiedQr] = useState<boolean>(false);

  const handleCopyUrl = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleCopyQrData = (data: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(data);
      setCopiedQr(true);
      setTimeout(() => setCopiedQr(false), 2000);
    }
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Touch gesture pinch tracking state
  const touchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const activeItemsList = items.length > 0 ? items : item ? [item] : [];
  const currentIndex = activeItemsList.findIndex((i) => i.id === item?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activeItemsList.length - 1;

  useEffect(() => {
    setZoomLevel(1);
    setRevealSensitive(false);
  }, [item?.id]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectItem) {
      setSwipeDirection("left");
      onSelectItem(activeItemsList[currentIndex + 1]);
    }
  }, [hasNext, onSelectItem, activeItemsList, currentIndex]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectItem) {
      setSwipeDirection("right");
      onSelectItem(activeItemsList[currentIndex - 1]);
    }
  }, [hasPrev, onSelectItem, activeItemsList, currentIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key.toLowerCase() === "i") {
        setIsInfoOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === "f") {
        onToggleFavorite(item.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, handleNext, handlePrev, onClose, onToggleFavorite]);

  if (!item) return null;

  const isSensitive = Boolean(
    item.is_sensitive ||
    item.isSensitive ||
    item.privacy_level === "highly_sensitive" ||
    item.privacy_level === "private" ||
    item.privacyLevel === "highly_sensitive" ||
    item.privacyLevel === "private"
  );

  const rawOcrText = (item.fullText || item.ocr_text || "").trim();
  const maskedText = (item.masked_ocr_text || item.maskedOcrText || "").trim();
  const displayedOcrText = isSensitive && !revealSensitive && maskedText ? maskedText : rawOcrText;

  const ocrLines = displayedOcrText ? displayedOcrText.split("\n").filter((l) => l.trim().length > 0) : [];
  const filteredOcrLines = ocrSearch
    ? ocrLines.filter((line) => line.toLowerCase().includes(ocrSearch.toLowerCase()))
    : ocrLines;
  const ocrWordCount = displayedOcrText ? displayedOcrText.split(/\s+/).filter(Boolean).length : 0;

  const handleCopyOCR = () => {
    const textToCopy = displayedOcrText || item.summary || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = item.imageUrl;
    a.download = `${item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_screenshot.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = () => {
    const text = `📸 ${item.title}\nCategory: ${item.category}\n\nSummary: ${item.summary}`;
    if (navigator.share) {
      navigator.share({ title: item.title, text }).catch(() => {
        navigator.clipboard.writeText(text);
      });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const formattedDate = new Date(item.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 overflow-hidden select-none">
      {/* Dimmed Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-3xl border border-white/[0.08] bg-[#07090D] text-slate-100 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Top Control Bar */}
        <div className="h-14 px-4 sm:px-6 border-b border-white/[0.08] bg-[#0D1117] flex items-center justify-between gap-3 shrink-0">
          {/* Left: Index Counter & Title */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
            {activeItemsList.length > 1 && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-mono text-xs border border-white/[0.08] shrink-0 font-medium">
                {currentIndex + 1} / {activeItemsList.length}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold truncate text-[#F8FAFC]">
                {item.title}
              </h2>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Ask AI Button */}
            <button
              onClick={() => setIsAskAIOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-blue-300 hover:bg-[#3B82F6] hover:text-white font-semibold text-xs transition-colors cursor-pointer shadow-[0_0_12px_rgba(59,130,246,0.25)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>

            {/* Favorite Button */}
            <button
              onClick={() => onToggleFavorite(item.id)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                item.isFavorite
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-white/5 text-slate-400 border-white/[0.08] hover:text-white"
              }`}
              title="Favorite"
            >
              <Star className={`w-4 h-4 ${item.isFavorite ? "fill-current" : ""}`} />
            </button>

            {/* Blur/Unblur Eye Toggle if Sensitive */}
            {isSensitive && (
              <button
                onClick={() => setRevealSensitive((r) => !r)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  revealSensitive
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                }`}
                title={revealSensitive ? "Hide sensitive content" : "Unblur private screenshot"}
              >
                {revealSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Share summary"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Info Toggle */}
            <button
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isInfoOpen
                  ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  : "bg-white/5 text-slate-400 border-white/[0.08] hover:text-white"
              }`}
              title="Toggle Details"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors ml-1 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Stage & Collapsible Inspect Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Main Stage: Photo Canvas */}
          <div className="flex-1 relative bg-[#07090D] flex items-center justify-center overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#0D1117]/90 backdrop-blur-md border border-white/[0.08] text-slate-200 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-slate-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Prev Button */}
            {hasPrev && (
              <button
                onClick={handlePrev}
                className="absolute left-3 z-20 p-2.5 rounded-full bg-[#0D1117]/80 hover:bg-[#3B82F6] text-white border border-white/[0.08] backdrop-blur-md transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Button */}
            {hasNext && (
              <button
                onClick={handleNext}
                className="absolute right-3 z-20 p-2.5 rounded-full bg-[#0D1117]/80 hover:bg-[#3B82F6] text-white border border-white/[0.08] backdrop-blur-md transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Image display */}
            <div className="w-full h-full flex items-center justify-center p-4 relative">
              <motion.img
                animate={{ scale: zoomLevel }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                src={item.imageUrl}
                alt={item.title}
                className={`max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg select-none transition-all duration-300 ${
                  isSensitive && !revealSensitive ? "filter blur-2xl brightness-75 contrast-75" : ""
                }`}
              />

              {/* Private Blur Notice & Quick Unblur Button */}
              {isSensitive && !revealSensitive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 pointer-events-none">
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/85 backdrop-blur-xl border border-rose-500/30 max-w-xs text-center space-y-3 shadow-2xl pointer-events-auto">
                    <div className="w-10 h-10 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/30">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Private Content Blurred</h4>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Sensitive text & numbers masked to protect against shoulder surfing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevealSensitive(true)}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/20 shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5 text-rose-400" />
                      <span>Tap to Reveal Image</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Collapsible Inspect Detail Panel */}
          {isInfoOpen && (
            <div className="w-full lg:w-[420px] xl:w-[460px] max-w-full flex flex-col h-auto max-h-[65vh] lg:max-h-full lg:h-full bg-[#0D1117] border-t lg:border-t-0 lg:border-l border-white/[0.08] z-20 shrink-0 overflow-y-auto p-4 sm:p-5 space-y-4 select-text">
              {/* Processing Status Banner (Failed / Pending / Queued) */}
              {item.processingStatus === "Failed" && (
                <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      AI Analysis Incomplete
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Failed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    AI Vision could not finish extracting OCR metadata for this item.
                  </p>
                  {onReindex && (
                    <button
                      onClick={() => onReindex(item.id)}
                      className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry AI Analysis
                    </button>
                  )}
                </div>
              )}

              {item.processingStatus &&
                item.processingStatus !== "Completed" &&
                item.processingStatus !== "Failed" && (
                  <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        AI Indexing in Progress
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.processingStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Extracting OCR text and generating intelligent visual summary...
                    </p>
                  </div>
                )}

              {/* Sensitive Image Protection Banner */}
              {isSensitive && (
                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-400" />
                      Sensitive Image Protected
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wide">
                      {item.privacy_level || item.privacyLevel || "Private"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Automated privacy protection detected sensitive content. Sensitive entities are masked to prevent accidental visual exposure.
                  </p>

                  {/* Sensitive Category Badges */}
                  {Array.isArray(item.sensitive_categories || item.sensitiveCategories) &&
                    (item.sensitive_categories || item.sensitiveCategories)!.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(item.sensitive_categories || item.sensitiveCategories)!.map((cat: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 border border-rose-500/25 text-rose-200 capitalize"
                          >
                            {cat.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Mask / Reveal Toggle */}
                  <div className="pt-1 flex items-center justify-between border-t border-rose-500/20 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {revealSensitive ? "Unmasked raw text revealed" : "Zero-exposure OCR masking active"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealSensitive((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {revealSensitive ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                          Mask Data
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-rose-300" />
                          Reveal Original
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Section 1: AI Vision Summary */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                <button
                  onClick={() => toggleSection("summary")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[#3B82F6]">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" /> AI Summary
                  </span>
                  {sections.summary ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                {sections.summary && (
                  <div className="px-4 pb-4 text-xs leading-relaxed text-slate-200 border-t border-white/[0.05] pt-3">
                    {item.summary || item.description || "No AI summary generated for this screenshot."}
                  </div>
                )}
              </div>

              {/* Section 2: Category & Vault */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#121821] p-4 space-y-2.5">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Category & Vault
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                    {item.category}
                  </span>
                  {(item.smart_category || item.smartCategory) && (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30 flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3 h-3 text-[#00FF66]" />
                      <span>{item.smart_category || item.smartCategory}</span>
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-purple-400" />
                    {item.collectionName || item.collection || "General Vault"}
                  </span>
                </div>
              </div>

              {/* Section 3: OCR Extracted Text */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                <button
                  onClick={() => toggleSection("ocr")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" /> Extracted Text (OCR)
                    </span>
                    {rawOcrText ? (
                      <span className="text-[10px] font-mono text-emerald-300/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {ocrWordCount} words
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {rawOcrText ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyOCR();
                        }}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy text"
                      >
                        {copiedText ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-sans">
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                          </span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : null}
                    {sections.ocr ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>
                {sections.ocr && (
                  <div className="px-4 pb-4 space-y-2.5 border-t border-white/[0.05] pt-3">
                    {rawOcrText ? (
                      <>
                        {ocrLines.length > 3 && (
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              value={ocrSearch}
                              onChange={(e) => setOcrSearch(e.target.value)}
                              placeholder="Search in extracted text..."
                              className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/40"
                            />
                          </div>
                        )}
                        <div className="max-h-60 overflow-y-auto font-mono text-[11.5px] leading-relaxed text-slate-200 bg-black/40 p-3 rounded-xl border border-white/5 select-text whitespace-pre-wrap break-words">
                          {filteredOcrLines.length > 0 ? (
                            filteredOcrLines.map((l, i) => <div key={i}>{l}</div>)
                          ) : (
                            <span className="text-slate-500 italic">No text matching "{ocrSearch}"</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-slate-400 leading-relaxed italic">
                        No text detected in this image (e.g. photos, graphics, or diagrams). Visual features and objects are indexed below.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Keywords & Entities */}
              {(() => {
                const keyEntities = Array.isArray(item.keyEntities) ? item.keyEntities : [];
                const keywords = Array.isArray(item.keywords) ? item.keywords : [];
                const otherKeywords = keywords.filter(
                  (k) => !keyEntities.some((e) => e.toLowerCase() === k.toLowerCase())
                );
                const totalKeyCount = keyEntities.length + otherKeywords.length;

                return (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                    <button
                      onClick={() => toggleSection("keywords")}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 text-indigo-400 font-semibold">
                          <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Keywords & Entities
                        </span>
                        {totalKeyCount > 0 && (
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            {totalKeyCount}
                          </span>
                        )}
                      </div>
                      {sections.keywords ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    {sections.keywords && (
                      <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05] pt-3">
                        {totalKeyCount > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {/* Key Entities highlighted with distinct style */}
                            {keyEntities.map((ent, i) => (
                              <button
                                key={`ent-${i}`}
                                onClick={() => onSearchTag(ent)}
                                title={`Search entity "${ent}"`}
                                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/25 transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                {ent}
                              </button>
                            ))}
                            {/* Secondary Keywords */}
                            {otherKeywords.map((kw, i) => (
                              <button
                                key={`kw-${i}`}
                                onClick={() => onSearchTag(kw)}
                                title={`Search keyword "${kw}"`}
                                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/[0.08] text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-slate-500 italic">
                            No specific keywords or entities extracted yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section 5: Tags */}
              {(() => {
                const tagsList = Array.isArray(item.tags) ? item.tags : [];

                return (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                    <button
                      onClick={() => toggleSection("tags")}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 text-purple-400 font-semibold">
                          <Tag className="w-3.5 h-3.5 text-purple-400" /> Tags
                        </span>
                        {tagsList.length > 0 && (
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                            {tagsList.length}
                          </span>
                        )}
                      </div>
                      {sections.tags ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    {sections.tags && (
                      <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05] pt-3">
                        {tagsList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {tagsList.map((t, i) => (
                              <button
                                key={i}
                                onClick={() => onSearchTag(t)}
                                title={`Filter by tag #${t}`}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-colors cursor-pointer"
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-slate-500 italic">
                            No tags assigned.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section 6: Detected Objects */}
              {(() => {
                const detectedObjectsList =
                  Array.isArray(item.objects) && item.objects.length > 0
                    ? item.objects
                    : Array.isArray(item.objectsDetected) && item.objectsDetected.length > 0
                    ? item.objectsDetected
                    : [];

                return (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                    <button
                      onClick={() => toggleSection("objects")}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 text-cyan-400 font-semibold">
                          <Box className="w-3.5 h-3.5 text-cyan-400" /> Detected Objects
                        </span>
                        {detectedObjectsList.length > 0 && (
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            {detectedObjectsList.length}
                          </span>
                        )}
                      </div>
                      {sections.objects ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    {sections.objects && (
                      <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05] pt-3">
                        {detectedObjectsList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {detectedObjectsList.map((obj, i) => (
                              <button
                                key={i}
                                onClick={() => onSearchTag(obj)}
                                title={`Search object "${obj}"`}
                                className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Box className="w-3 h-3 text-cyan-400" />
                                {obj}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-slate-500 italic">
                            No physical objects detected.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section: 🔗 Links & QR */}
              {(() => {
                const isValidWebUrl = (urlStr: string): boolean => {
                  try {
                    const parsed = new URL(urlStr);
                    return parsed.protocol === "http:" || parsed.protocol === "https:";
                  } catch {
                    return false;
                  }
                };

                const rawUrls: (string | undefined)[] = [
                  ...(item.detected_urls || []),
                  ...(item.detectedUrls || []),
                  ...(item.urls || []),
                  ...(item.website?.detectedUrls || []),
                  item.website_url,
                  item.websiteUrl,
                  item.website?.websiteUrl,
                  item.website?.url,
                ];

                const allDetectedUrls: string[] = Array.from(
                  new Set(
                    rawUrls
                      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
                      .map((u) => {
                        const trimmed = u.trim();
                        return trimmed.startsWith("http://") || trimmed.startsWith("https://")
                          ? trimmed
                          : `https://${trimmed}`;
                      })
                      .filter(isValidWebUrl)
                  )
                );

                const websiteName = item.website_name || item.websiteName || item.website?.name;
                const websiteDomain = item.website_domain || item.websiteDomain || item.website?.domain;

                const hasQrCode = Boolean(
                  item.has_qr_code ||
                  item.hasQrCode ||
                  (typeof item.qr_code === "object" && item.qr_code?.hasQrCode) ||
                  Boolean(item.qr_code_data) ||
                  Boolean(item.qrCodeData)
                );

                const qrCodeData = item.qr_code_data || item.qrCodeData || (typeof item.qr_code === "object" ? item.qr_code?.data : typeof item.qr_code === "string" ? item.qr_code : null);
                const qrCodeType = item.qr_code_type || item.qrCodeType || (typeof item.qr_code === "object" ? item.qr_code?.type : "URL") || "URL";
                const qrUrl = item.qr_url || item.qrUrl || (typeof item.qr_code === "object" ? item.qr_code?.url : null) || (qrCodeType === "URL" && qrCodeData && isValidWebUrl(qrCodeData) ? qrCodeData : null);

                const hasAnyLinkOrQr = Boolean(
                  websiteName ||
                  websiteDomain ||
                  allDetectedUrls.length > 0 ||
                  (hasQrCode && qrCodeData)
                );

                return (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                    <button
                      onClick={() => toggleSection("linksAndQr")}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-slate-400 font-semibold">
                        <Link2 className="w-3.5 h-3.5 text-[#CCFF00]" />
                        <span>Links & QR</span>
                        {hasAnyLinkOrQr && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20">
                            {allDetectedUrls.length + (hasQrCode ? 1 : 0)}
                          </span>
                        )}
                      </span>
                      {sections.linksAndQr ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {sections.linksAndQr && (
                      <div className="px-4 pb-4 space-y-3.5 border-t border-white/[0.05] pt-3 text-xs">
                        {!hasAnyLinkOrQr ? (
                          <p className="text-slate-400 italic text-center py-2 text-xs">
                            No links or QR codes detected.
                          </p>
                        ) : (
                          <>
                            {/* Website Name and Domain */}
                            {(websiteName || websiteDomain) && (
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-medium text-slate-400">Website:</div>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-200">
                                  <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  <span className="font-semibold text-white">{websiteName || websiteDomain}</span>
                                  {websiteDomain && websiteName && (
                                    <span className="text-slate-400 text-[11px] font-mono">({websiteDomain})</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Detected Links */}
                            {allDetectedUrls.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-medium text-slate-400">
                                  Detected Links:
                                </div>
                                <div className="space-y-1.5">
                                  {allDetectedUrls.map((url, idx) => (
                                    <div
                                      key={`${url}-${idx}`}
                                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition"
                                    >
                                      <span
                                        className="font-mono text-xs text-sky-300 hover:text-white truncate max-w-[210px] sm:max-w-[280px]"
                                        title={url}
                                      >
                                        {url}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => handleCopyUrl(url)}
                                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                                          title="Copy link"
                                        >
                                          {copiedUrl === url ? (
                                            <>
                                              <Check className="w-3 h-3 text-[#00FF66]" />
                                              <span className="text-[#00FF66]">Copied</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              <span>Copy</span>
                                            </>
                                          )}
                                        </button>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1 rounded-lg bg-[#CCFF00]/10 hover:bg-[#CCFF00]/20 text-[#CCFF00] hover:text-white text-[11px] font-medium transition flex items-center gap-1"
                                          title="Open link in new tab"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span>Open</span>
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* QR Code */}
                            {hasQrCode && qrCodeData && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[11px] font-medium text-slate-400">QR Code:</div>
                                <div className="rounded-xl border border-[#00FF66]/20 bg-[#00FF66]/5 p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#00FF66]">
                                      <Check className="w-4 h-4 text-[#00FF66]" />
                                      <span>QR Code Detected</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30 uppercase tracking-wide">
                                      Type: {qrCodeType}
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-slate-200 break-all select-all">
                                    {qrCodeData}
                                  </div>

                                  <div className="flex items-center gap-2 pt-0.5">
                                    <button
                                      onClick={() => handleCopyQrData(qrCodeData)}
                                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      {copiedQr ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                                          <span className="text-[#00FF66]">QR Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy QR Data</span>
                                        </>
                                      )}
                                    </button>

                                    {qrUrl && isValidWebUrl(qrUrl) && (
                                      <a
                                        href={qrUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 rounded-lg bg-[#CCFF00] hover:bg-[#b8e600] text-[#07090D] text-xs font-semibold transition flex items-center gap-1.5"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Open Link</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section 7: File & Date Metadata (Collapsed by default per user request) */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#121821] overflow-hidden">
                <button
                  onClick={() => toggleSection("metadata")}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-[#18202B] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-slate-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Metadata & File Info
                  </span>
                  {sections.metadata ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                {sections.metadata && (
                  <div className="px-4 pb-4 space-y-2 text-xs text-slate-400 border-t border-white/[0.05] pt-3">
                    <div className="flex justify-between items-center">
                      <span>Date added:</span>
                      <span className="text-slate-200 font-medium">{formattedDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>File name:</span>
                      <span className="text-slate-200 font-mono truncate max-w-[200px]">
                        {item.fileName || item.file_name || "screenshot.png"}
                      </span>
                    </div>
                    {(item.fileSizeKB || item.file_size) && (
                      <div className="flex justify-between items-center">
                        <span>File size:</span>
                        <span className="text-slate-200 font-mono">
                          {item.fileSizeKB ? `${item.fileSizeKB} KB` : `${Math.round((item.file_size || 0) / 1024)} KB`}
                        </span>
                      </div>
                    )}
                    {item.ocrAccuracyScore && (
                      <div className="flex justify-between items-center">
                        <span>OCR Confidence:</span>
                        <span className="text-emerald-400 font-mono">
                          {Math.round(item.ocrAccuracyScore * 100)}%
                        </span>
                      </div>
                    )}
                    {(item.sha256Hash || item.sha256_hash || item.hash) && (
                      <div className="flex justify-between items-center">
                        <span>Hash:</span>
                        <span className="text-slate-400 font-mono text-[10px] truncate max-w-[180px]">
                          {item.sha256Hash || item.sha256_hash || item.hash}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="pt-2">
                <button
                  onClick={() => onDelete(item.id)}
                  className="w-full py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Screenshot</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Ask AI Bottom Sheet Drawer */}
      <AskAIBottomSheet
        isOpen={isAskAIOpen}
        onClose={() => setIsAskAIOpen(false)}
        item={item}
      />
    </div>
  );
};
