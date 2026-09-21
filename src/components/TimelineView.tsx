import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  CalendarDays,
  Clock,
  Sun,
  Archive,
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  Square,
  Copy,
  Layers,
  ArrowUp,
  Image as ImageIcon,
} from "lucide-react";
import { ScreenshotItem, CategoryType } from "../types";
import { ScreenshotCard } from "./ScreenshotCard";
import { PageHeroHeader } from "./PageHeroHeader";

interface TimelineViewProps {
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onSelectScreenshot: (item: ScreenshotItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteScreenshot: (id: string) => void;
  onCopyText: (text: string) => void;
  addToast: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

export type TimeBucketKey = "Today" | "Yesterday" | "Last 7 Days" | "Last Month" | "Older";

export interface TimelineBucket {
  key: TimeBucketKey;
  title: string;
  subtitle: string;
  icon: any;
  items: ScreenshotItem[];
}

export function parseScreenshotDate(item: ScreenshotItem): Date {
  const raw = item.createdAt || item.indexedAt || item.date_created || item.dateModified;
  if (!raw) return new Date(0);
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  screenshots,
  isDark,
  onSelectScreenshot,
  onToggleFavorite,
  onDeleteScreenshot,
  onCopyText,
  addToast,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "All">("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hideEmptyBuckets, setHideEmptyBuckets] = useState(false);

  // Filtered Screenshots
  const filteredScreenshots = useMemo(() => {
    return screenshots.filter((item) => {
      const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;

      const matchesText =
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.fullText.toLowerCase().includes(q) ||
        (item.keyEntities && item.keyEntities.some((e) => e.toLowerCase().includes(q))) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCat && matchesText;
    });
  }, [screenshots, searchQuery, selectedCategory]);

  // Dynamic grouping into Timeline Buckets
  const buckets = useMemo(() => {
    const now = new Date();
    // Start of today (00:00:00.000)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // Start of yesterday (24 hours before start of today)
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    // Start of 7 days ago
    const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
    // Start of 30 days ago
    const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;

    const todayItems: ScreenshotItem[] = [];
    const yesterdayItems: ScreenshotItem[] = [];
    const last7DaysItems: ScreenshotItem[] = [];
    const lastMonthItems: ScreenshotItem[] = [];
    const olderItems: ScreenshotItem[] = [];

    // Sort descending by date
    const sorted = [...filteredScreenshots].sort((a, b) => {
      return parseScreenshotDate(b).getTime() - parseScreenshotDate(a).getTime();
    });

    sorted.forEach((sc) => {
      const time = parseScreenshotDate(sc).getTime();
      if (time >= startOfToday) {
        todayItems.push(sc);
      } else if (time >= startOfYesterday) {
        yesterdayItems.push(sc);
      } else if (time >= startOf7Days) {
        last7DaysItems.push(sc);
      } else if (time >= startOf30Days) {
        lastMonthItems.push(sc);
      } else {
        olderItems.push(sc);
      }
    });

    const formatDateStr = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const todaySubtitle = formatDateStr(now);
    const yesterdayObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdaySubtitle = formatDateStr(yesterdayObj);

    const bucketList: TimelineBucket[] = [
      {
        key: "Today",
        title: "Today",
        subtitle: todaySubtitle,
        icon: Sun,
        items: todayItems,
      },
      {
        key: "Yesterday",
        title: "Yesterday",
        subtitle: yesterdaySubtitle,
        icon: Clock,
        items: yesterdayItems,
      },
      {
        key: "Last 7 Days",
        title: "Last 7 Days",
        subtitle: "Past week activity",
        icon: CalendarDays,
        items: last7DaysItems,
      },
      {
        key: "Last Month",
        title: "Last Month",
        subtitle: "Past 30 days activity",
        icon: Calendar,
        items: lastMonthItems,
      },
      {
        key: "Older",
        title: "Older",
        subtitle: "Earlier indexed captures",
        icon: Archive,
        items: olderItems,
      },
    ];

    if (hideEmptyBuckets) {
      return bucketList.filter((b) => b.items.length > 0);
    }
    return bucketList;
  }, [filteredScreenshots, hideEmptyBuckets]);

  // Smooth scroll handler to jump to section
  const scrollToBucket = (key: TimeBucketKey) => {
    const el = document.getElementById(`timeline-group-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBatchCopyOCR = () => {
    const selectedItems = screenshots.filter((s) => selectedIds.includes(s.id));
    const combined = selectedItems
      .map((s, idx) => `--- Screenshot ${idx + 1}: ${s.title} ---\n${s.fullText || s.summary}`)
      .join("\n\n");

    navigator.clipboard.writeText(combined);
    addToast({
      title: "Batch Copied",
      description: `Copied OCR text of ${selectedIds.length} screenshot(s) to clipboard.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 3D Chronological Timeline Hero Header */}
      <PageHeroHeader
        type="timeline"
        title="Chronological Timeline"
        subtitle="Explore your indexed screenshots organized naturally by time periods with sticky date headers, smooth jump navigation, and instant OCR inspection."
        isDark={isDark}
        actions={
          <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider w-full lg:w-auto">
              Jump to:
            </span>
            {["Today", "Yesterday", "Last 7 Days", "Last Month", "Older"].map((key) => {
              const b = buckets.find((bucket) => bucket.key === key);
              const count = b ? b.items.length : 0;
              return (
                <button
                  key={key}
                  onClick={() => scrollToBucket(key as TimeBucketKey)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    count > 0
                      ? isDark
                        ? "bg-[#3B82F6]/15 hover:bg-[#3B82F6]/30 text-blue-300 border border-[#3B82F6]/30"
                        : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                      : isDark
                      ? "bg-[#0D1117] text-slate-500 border border-white/[0.08] hover:bg-[#18202B]"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  <span>{key}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      count > 0
                        ? "bg-[#3B82F6] text-white"
                        : "bg-[#18202B] text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* Control Bar: Search, Category Filter, Toggle Options */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search timeline photos by title, summary, OCR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all ${
              isDark
                ? "bg-[#0D1117] border-white/[0.08] text-slate-200 placeholder-slate-500 focus:border-[#3B82F6]"
                : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
            }`}
          />
        </div>

        {/* Category Facet & Hide Empty Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className={`px-3 py-2 rounded-2xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all cursor-pointer ${
              isDark
                ? "bg-[#0D1117] border-white/[0.08] text-slate-200"
                : "bg-white border-slate-200 text-slate-800"
            }`}
          >
            <option value="All">All Categories</option>
            <option value="Passport">Passport</option>
            <option value="Electricity Bill">Electricity Bill</option>
            <option value="Recipe">Recipe</option>
            <option value="QR Code">QR Code</option>
            <option value="Ticket & Travel">Ticket & Travel</option>
            <option value="Receipt & Invoice">Receipt & Invoice</option>
            <option value="Chat & Message">Chat & Message</option>
            <option value="Code & Dev">Code & Dev</option>
            <option value="E-Commerce">E-Commerce</option>
            <option value="Admission & Certificate">Admission & Certificate</option>
            <option value="Financial">Financial</option>
            <option value="Notes & Ideas">Notes & Ideas</option>
            <option value="Other">Other</option>
          </select>

          <button
            onClick={() => setHideEmptyBuckets(!hideEmptyBuckets)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
              hideEmptyBuckets
                ? "bg-[#3B82F6]/20 text-blue-300 border-[#3B82F6]/40"
                : isDark
                ? "bg-[#0D1117] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-[#18202B]"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            {hideEmptyBuckets ? "Showing Active Periods Only" : "Show All Periods"}
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#3B82F6]/20 border border-[#3B82F6]/40">
              <span className="text-xs font-bold text-blue-300 px-2">
                {selectedIds.length} Selected
              </span>
              <button
                onClick={handleBatchCopyOCR}
                className="px-2.5 py-1 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy OCR</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="space-y-10">
        {buckets.map((bucket) => {
          const IconComponent = bucket.icon;
          const hasItems = bucket.items.length > 0;

          return (
            <div
              key={bucket.key}
              id={`timeline-group-${bucket.key}`}
              className="space-y-4 scroll-mt-24"
            >
              {/* STICKY DATE HEADER (Apple Photos Style) */}
              <div
                className={`sticky top-0 z-30 px-5 py-3.5 rounded-3xl border backdrop-blur-2xl shadow-xl transition-all duration-300 flex items-center justify-between ${
                  isDark
                    ? "bg-[#0D1117]/90 border-white/[0.08] text-white shadow-black/80"
                    : "bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-2xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6]">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black tracking-tight">{bucket.title}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
                        {bucket.items.length} {bucket.items.length === 1 ? "photo" : "photos"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{bucket.subtitle}</p>
                  </div>
                </div>

                {/* Quick Select All in Bucket */}
                {hasItems && (
                  <button
                    onClick={() => {
                      const bucketItemIds = bucket.items.map((i) => i.id);
                      const allSelected = bucketItemIds.every((id) => selectedIds.includes(id));
                      if (allSelected) {
                        setSelectedIds((prev) => prev.filter((id) => !bucketItemIds.includes(id)));
                      } else {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...bucketItemIds])));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="hidden sm:inline">Select Group</span>
                  </button>
                )}
              </div>

              {/* Bucket Photo Grid */}
              {!hasItems ? (
                <div className="p-8 rounded-3xl border border-dashed border-white/[0.08] text-center space-y-2 bg-[#0D1117]/40">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
                  <p className="text-xs text-slate-500 font-medium">
                    No screenshots captured in {bucket.title.toLowerCase()}.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.04,
                      },
                    },
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  {bucket.items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <ScreenshotCard
                        key={item.id}
                        item={item}
                        isDark={isDark}
                        isSelected={isSelected}
                        isSelectionMode={selectedIds.length > 0}
                        onSelect={() => onSelectScreenshot(item)}
                        onToggleSelect={toggleSelect}
                        onToggleFavorite={() => onToggleFavorite(item.id)}
                        onDelete={() => onDeleteScreenshot(item.id)}
                        onCopyText={(txt) => {
                          onCopyText(txt);
                          addToast({
                            title: "Text Copied",
                            description: "Copied OCR text to clipboard.",
                            type: "info",
                          });
                        }}
                      />
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Scroll to Top button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-20 right-6 z-40 p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-600/50 transition-all cursor-pointer hover:scale-110"
        title="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};
