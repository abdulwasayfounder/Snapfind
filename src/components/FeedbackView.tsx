import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MessageSquarePlus,
  Bug,
  Sparkles,
  Search,
  Cpu,
  Palette,
  Zap,
  HelpCircle,
  Star,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  X,
  User,
  ShieldCheck,
  Crown,
  History,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  ThumbsUp,
  RefreshCw,
  ExternalLink,
  FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  FeedbackItem,
  FeedbackType,
  FeedbackSubmitPayload,
  UserProfile,
  ScreenshotItem,
} from "../types";
import { FeedbackService } from "../services/feedbackService";
import { PageHeroHeader } from "./PageHeroHeader";
import { useAuth } from "../context/AuthContext";

interface FeedbackViewProps {
  isDark: boolean;
  currentUser?: UserProfile | null;
  screenshots?: ScreenshotItem[];
  onNavigate?: (view: any) => void;
  preselectedType?: FeedbackType;
  initialFounderPrompt?: boolean;
}

const FEEDBACK_TYPES: {
  id: FeedbackType;
  label: string;
  description: string;
  icon: any;
  color: string;
  badgeBg: string;
  badgeBorder: string;
}[] = [
  {
    id: "Bug Report",
    label: "Bug Report",
    description: "Something is broken, visual glitch, or unexpected crash",
    icon: Bug,
    color: "text-rose-400",
    badgeBg: "bg-rose-500/10 text-rose-400",
    badgeBorder: "border-rose-500/20",
  },
  {
    id: "Feature Request",
    label: "Feature Request",
    description: "New capability, format support, or workflow idea",
    icon: Sparkles,
    color: "text-indigo-400",
    badgeBg: "bg-indigo-500/10 text-indigo-400",
    badgeBorder: "border-indigo-500/20",
  },
  {
    id: "Search Quality",
    label: "Search Quality",
    description: "Natural language query results, relevance, ranking",
    icon: Search,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-400",
    badgeBorder: "border-amber-500/20",
  },
  {
    id: "AI Accuracy",
    label: "AI Accuracy",
    description: "OCR transcription, summaries, or entity detection accuracy",
    icon: Cpu,
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-400",
    badgeBorder: "border-purple-500/20",
  },
  {
    id: "UI/UX Feedback",
    label: "UI/UX Feedback",
    description: "Design aesthetics, navigation flow, readability & dark mode",
    icon: Palette,
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10 text-cyan-400",
    badgeBorder: "border-cyan-500/20",
  },
  {
    id: "Performance",
    label: "Performance",
    description: "Indexing speed, latency, memory usage, or smoothness",
    icon: Zap,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-400",
    badgeBorder: "border-emerald-500/20",
  },
  {
    id: "Other",
    label: "Other",
    description: "General thoughts, founder questions, or anything else",
    icon: HelpCircle,
    color: "text-slate-400",
    badgeBg: "bg-slate-500/10 text-slate-300",
    badgeBorder: "border-slate-500/20",
  },
];

const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Exceptional Experience!",
};

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  isDark,
  currentUser,
  screenshots = [],
  onNavigate,
  preselectedType,
  initialFounderPrompt = false,
}) => {
  const { user: authUser, entitlement } = useAuth();
  const activeUser = currentUser || authUser;
  const isFounder = Boolean(
    entitlement?.isFounder || activeUser?.plan === "Founder" || initialFounderPrompt
  );

  // Form State
  const [selectedType, setSelectedType] = useState<FeedbackType>(
    preselectedType || "Feature Request"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(10);
  const [guestEmail, setGuestEmail] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [showScreenshotPicker, setShowScreenshotPicker] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedItem, setSubmittedItem] = useState<FeedbackItem | null>(null);
  const [historyItems, setHistoryItems] = useState<FeedbackItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = activeUser?.isLoggedIn && activeUser.id ? activeUser.id : "guest";

  // Load history on mount and when user changes
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const items = await FeedbackService.getUserFeedback(userId);
      setHistoryItems(items);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const unsub = FeedbackService.subscribe((items) => {
      setHistoryItems(items);
    });
    return () => unsub();
  }, [userId]);

  // Handle image upload from computer
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setScreenshotUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: FeedbackSubmitPayload = {
        type: selectedType,
        title: title.trim(),
        description: description.trim(),
        rating,
        nps_score: npsScore,
        screenshot_url: screenshotUrl,
        user_email: activeUser?.email || guestEmail.trim() || undefined,
      };

      const result = await FeedbackService.submitFeedback(payload, activeUser, isFounder);
      if (result.success) {
        setSubmittedItem(result.item);
        // Refresh local history
        await loadHistory();
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTitle("");
    setDescription("");
    setRating(5);
    setNpsScore(10);
    setScreenshotUrl(null);
    setSubmittedItem(null);
    setSelectedType("Feature Request");
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return historyItems;
    return historyItems.filter((item) => item.type === historyFilter);
  }, [historyItems, historyFilter]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Hero Banner */}
      <PageHeroHeader
        type="feedback"
        title="Direct Feedback & Ideas"
        subtitle="Every submission is directly reviewed by the product creators. Tell us what's working, what's broken, or what you want built next."
        isDark={isDark}
        actions={
          <div
            className={`flex items-center p-1 rounded-2xl border shrink-0 ${
              isDark ? "bg-slate-800/80 border-white/10" : "bg-slate-100 border-slate-200"
            }`}
          >
            <button
              onClick={() => {
                setActiveTab("form");
                if (submittedItem) handleResetForm();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "form"
                  ? isDark
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-900 shadow-sm"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Give Feedback</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === "history"
                  ? isDark
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-900 shadow-sm"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Your History</span>
              {historyItems.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {historyItems.length}
                </span>
              )}
            </button>
          </div>
        }
      />

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {activeTab === "form" ? (
          submittedItem ? (
            /* Post Submission Success Screen */
            <motion.div
              key="submitted-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className={`p-8 sm:p-12 rounded-3xl border text-center space-y-6 ${
                isDark ? "bg-slate-900/80 border-emerald-500/20" : "bg-white border-emerald-200 shadow-xl"
              }`}
            >
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-2xl font-bold tracking-tight">
                  Thanks for helping us improve SnapFind.
                </h3>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Your feedback on <span className="font-semibold text-emerald-400">"{submittedItem.title}"</span> has been securely received and assigned ID <code className="px-2 py-0.5 rounded bg-slate-800 text-xs font-mono">{submittedItem.id}</code>.
                </p>
              </div>

              {/* Submitted Card Summary */}
              <div
                className={`max-w-lg mx-auto p-4 rounded-2xl border text-left text-xs space-y-2 ${
                  isDark ? "bg-slate-950/60 border-white/10" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    {submittedItem.type}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: submittedItem.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="font-semibold text-sm line-clamp-1">{submittedItem.title}</p>
                <p className={`${isDark ? "text-slate-400" : "text-slate-600"} line-clamp-2`}>
                  {submittedItem.description}
                </p>
                {submittedItem.nps_score !== null && submittedItem.nps_score !== undefined && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-white/5">
                    Recommendation Score: <strong className="text-emerald-400">{submittedItem.nps_score}/10</strong>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleResetForm}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isDark ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  Submit Another Feedback
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5"
                >
                  <span>View All Submissions</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Main Feedback Submission Form */
            <motion.form
              key="form-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className={`p-6 sm:p-8 rounded-3xl border space-y-8 ${
                isDark ? "bg-slate-900/70 border-white/10 shadow-xl" : "bg-white border-slate-200 shadow-xl"
              }`}
            >
              {/* Step 1: Choose Feedback Type */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  1. What kind of feedback are you sharing?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {FEEDBACK_TYPES.map((type) => {
                    const isSelected = selectedType === type.id;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 relative ${
                          isSelected
                            ? isDark
                              ? "bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10"
                              : "bg-blue-50 border-blue-400 shadow-sm"
                            : isDark
                            ? "bg-slate-950/40 border-white/5 hover:border-white/15 hover:bg-slate-800/40"
                            : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl border shrink-0 ${
                            isSelected
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-400"
                              : `${type.badgeBg} ${type.badgeBorder}`
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-bold block truncate ${
                                isSelected
                                  ? isDark
                                    ? "text-white"
                                    : "text-blue-900"
                                  : isDark
                                  ? "text-slate-200"
                                  : "text-slate-800"
                              }`}
                            >
                              {type.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            )}
                          </div>
                          <p className={`text-[11px] mt-0.5 line-clamp-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {type.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Experience Rating (1-5 Stars) */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    2. Overall Experience Rating
                  </label>
                  <span className="text-xs font-semibold text-amber-400">
                    {RATING_LABELS[hoverRating || rating]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = (hoverRating || rating) >= starValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(starValue)}
                        className={`p-2.5 rounded-2xl border transition-all duration-150 transform hover:scale-110 active:scale-95 ${
                          isFilled
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-md shadow-amber-500/10"
                            : isDark
                            ? "bg-slate-950/40 border-white/5 text-slate-600 hover:text-slate-400"
                            : "bg-slate-100 border-slate-200 text-slate-300 hover:text-slate-400"
                        }`}
                      >
                        <Star
                          className={`w-6 h-6 ${isFilled ? "fill-amber-400" : ""}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Title & Description */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    3. Title / Summary <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      selectedType === "Bug Report"
                        ? "e.g., Search filter doesn't reset after selecting receipts"
                        : selectedType === "Feature Request"
                        ? "e.g., Add batch export to PDF with annotations"
                        : selectedType === "Search Quality"
                        ? "e.g., Query for 'medical insurance' missed doctor prescription screenshot"
                        : "e.g., Quick summary of your feedback or idea..."
                    }
                    className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Description & Details <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {description.length} characters
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      selectedType === "Bug Report"
                        ? "Steps to reproduce:\n1. Clicked on...\n2. Expected behavior...\n3. What actually happened..."
                        : "Please describe your thoughts, specific use-cases, and how this would help your daily screenshot workflow..."
                    }
                    className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                      isDark
                        ? "bg-slate-950/60 border-white/10 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              {/* Step 4: Optional Screenshot Attachment */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    4. Attach Screenshot (Optional)
                  </label>
                  {screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setScreenshotUrl(null)}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                {screenshotUrl ? (
                  <div className="flex items-center gap-4 p-3 rounded-2xl border bg-slate-950/40 border-white/10 max-w-md">
                    <img
                      src={screenshotUrl}
                      alt="Attachment preview"
                      className="w-16 h-16 object-cover rounded-xl border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Image Attached
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Will be stored securely with your ticket.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                        isDark
                          ? "bg-slate-950/40 border-white/10 hover:bg-slate-800 text-slate-300"
                          : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <UploadCloud className="w-4 h-4 text-blue-400" />
                      <span>Upload from Device</span>
                    </button>

                    {screenshots.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowScreenshotPicker(true)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                          isDark
                            ? "bg-slate-950/40 border-white/10 hover:bg-slate-800 text-slate-300"
                            : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                        <span>Pick from SnapFind Gallery</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 5: Optional Net Promoter Score (NPS 0-10) */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    5. How likely are you to recommend SnapFind? (Optional)
                  </label>
                  <span className="text-xs font-semibold text-slate-400">
                    {npsScore !== null ? (
                      npsScore >= 9 ? (
                        <span className="text-emerald-400 font-bold">Promoter ({npsScore}/10)</span>
                      ) : npsScore >= 7 ? (
                        <span className="text-amber-400 font-bold">Passive ({npsScore}/10)</span>
                      ) : (
                        <span className="text-rose-400 font-bold">Detractor ({npsScore}/10)</span>
                      )
                    ) : (
                      "Not Selected"
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                    const isSelected = npsScore === score;
                    let colorClass = "";
                    if (score <= 6) {
                      colorClass = isSelected
                        ? "bg-rose-500 text-white border-rose-500 font-bold shadow-md shadow-rose-500/20"
                        : "hover:bg-rose-500/15 hover:text-rose-400";
                    } else if (score <= 8) {
                      colorClass = isSelected
                        ? "bg-amber-500 text-white border-amber-500 font-bold shadow-md shadow-amber-500/20"
                        : "hover:bg-amber-500/15 hover:text-amber-400";
                    } else {
                      colorClass = isSelected
                        ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-md shadow-emerald-500/20"
                        : "hover:bg-emerald-500/15 hover:text-emerald-400";
                    }

                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setNpsScore(score)}
                        className={`h-9 rounded-xl border text-xs flex items-center justify-center transition-all ${
                          isSelected
                            ? colorClass
                            : isDark
                            ? `bg-slate-950/40 border-white/5 text-slate-300 ${colorClass}`
                            : `bg-slate-100 border-slate-200 text-slate-700 ${colorClass}`
                        }`}
                      >
                        {score}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>0 - Not at all likely</span>
                  <span>10 - Extremely likely</span>
                </div>
              </div>

              {/* Automatic User & Security Footer */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isDark ? "bg-slate-950/50 border-white/10" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    {activeUser?.name?.charAt(0) || <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">
                        {activeUser?.isLoggedIn ? activeUser.name || "Authenticated User" : "Guest Account"}
                      </span>
                      {activeUser?.isLoggedIn && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {activeUser?.email ? (
                        activeUser.email
                      ) : (
                        <span className="text-slate-500">
                          Optional reply email below if you want direct follow-up:
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!activeUser?.email && (
                  <input
                    type="email"
                    placeholder="your@email.com (optional)"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark
                        ? "bg-slate-900 border-white/10 text-white placeholder-slate-500"
                        : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                )}
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500 hidden sm:block">
                  Protected by zero-leak policy. Stored securely in Supabase.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                    isSubmitting || !title.trim() || !description.trim()
                      ? "opacity-50 cursor-not-allowed bg-slate-700 text-slate-400"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-95"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending to Team...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )
        ) : (
          /* Feedback History Section */
          <motion.div
            key="history-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
              isDark ? "bg-slate-900/70 border-white/10 shadow-xl" : "bg-white border-slate-200 shadow-xl"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Your Submitted Feedback</h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Track the status and responses for your suggestions and bug reports.
                </p>
              </div>

              {/* Filter */}
              {historyItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border focus:outline-none ${
                      isDark
                        ? "bg-slate-950 border-white/10 text-slate-300"
                        : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <option value="all">All Feedback Types</option>
                    {FEEDBACK_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {historyLoading ? (
              <div className="py-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Loading your feedback history...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <MessageSquarePlus className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-bold">No feedback submitted yet</h4>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Your thoughts, bug reports, and ideas directly shape future updates.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("form")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all inline-flex items-center gap-1.5 mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Your First Feedback</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => {
                  const isExpanded = expandedFeedbackId === item.id;
                  const typeDef = FEEDBACK_TYPES.find((t) => t.id === item.type) || FEEDBACK_TYPES[6];
                  const Icon = typeDef.icon;

                  let statusBg = "bg-slate-500/15 text-slate-400 border-slate-500/30";
                  if (item.status === "reviewed") statusBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                  if (item.status === "in_progress") statusBg = "bg-blue-500/15 text-blue-400 border-blue-500/30";
                  if (item.status === "resolved") statusBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isDark
                          ? "bg-slate-950/50 border-white/10 hover:border-white/20"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        onClick={() => setExpandedFeedbackId(isExpanded ? null : item.id)}
                        className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl border shrink-0 ${typeDef.badgeBg} ${typeDef.badgeBorder}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold truncate">{item.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusBg}`}>
                                {item.status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-400">
                                <Star className="w-3 h-3 fill-current" />
                                {item.rating}/5
                              </span>
                              {item.nps_score !== null && item.nps_score !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-semibold">NPS: {item.nps_score}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.id}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-4 mt-3 border-t border-white/5 space-y-3 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-400 text-[11px] block mb-1">
                                Full Description:
                              </span>
                              <p className={`whitespace-pre-wrap ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {item.description}
                              </p>
                            </div>

                            {item.screenshot_url && (
                              <div>
                                <span className="font-bold text-slate-400 text-[11px] block mb-1">
                                  Attached Screenshot:
                                </span>
                                <img
                                  src={item.screenshot_url}
                                  alt="Attached screenshot"
                                  className="max-h-48 rounded-xl border border-white/10 object-contain bg-slate-950"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 border-t border-white/5 flex-wrap">
                              <span>Version: <strong>{item.app_version}</strong></span>
                              <span>•</span>
                              <span>Platform: <strong>{item.platform}</strong></span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Vault Picker Modal */}
      <AnimatePresence>
        {showScreenshotPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl max-h-[80vh] rounded-3xl border flex flex-col overflow-hidden ${
                isDark ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm">Select Screenshot to Attach</h3>
                </div>
                <button
                  onClick={() => setShowScreenshotPicker(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
                {screenshots.slice(0, 24).map((shot) => (
                  <button
                    key={shot.id}
                    type="button"
                    onClick={() => {
                      setScreenshotUrl(shot.imageUrl || shot.thumbnailUri || null);
                      setShowScreenshotPicker(false);
                    }}
                    className={`group relative rounded-xl overflow-hidden border transition-all text-left ${
                      isDark ? "border-white/10 hover:border-blue-500" : "border-slate-200 hover:border-blue-500"
                    }`}
                  >
                    <img
                      src={shot.thumbnailUri || shot.imageUrl}
                      alt={shot.title}
                      className="w-full h-24 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-2 bg-slate-950/80">
                      <p className="text-[11px] font-semibold truncate text-white">
                        {shot.title || "Screenshot"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
