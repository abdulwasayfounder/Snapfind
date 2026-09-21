import React, { useState, useMemo } from "react";
import {
  Heart,
  Search,
  X,
  Grid,
  List,
  Filter,
  Sparkles,
  ArrowUpDown,
  Bookmark,
  CheckCircle2,
  FolderInput,
  Trash2,
  Copy,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem, CategoryType } from "../types";
import { ScreenshotCard } from "./ScreenshotCard";
import { PageHeroHeader } from "./PageHeroHeader";

interface FavoritesViewProps {
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onSelectScreenshot: (item: ScreenshotItem) => void;
  onToggleFavorite: (id: string) => void;
  onMoveCategory?: (id: string, newCategory: CategoryType) => void;
  onDeleteScreenshot: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchFavorite?: (ids: string[], isFav: boolean) => void;
  onBatchMoveCategory?: (ids: string[], targetCategory: CategoryType) => void;
  onCopyText: (text: string) => void;
}

const CATEGORIES: CategoryType[] = [
  "All",
  "Passport",
  "Electricity Bill",
  "Recipe",
  "QR Code",
  "Ticket & Travel",
  "Receipt & Invoice",
  "Notes & Ideas",
  "Chat & Message",
  "Code & Dev",
  "E-Commerce",
  "Admission & Certificate",
  "Financial",
  "Other",
];

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  screenshots,
  isDark,
  onSelectScreenshot,
  onToggleFavorite,
  onMoveCategory,
  onDeleteScreenshot,
  onBatchDelete,
  onBatchFavorite,
  onBatchMoveCategory,
  onCopyText,
}) => {
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Filter master screenshots list to favorited items only (No duplicate storage)
  const allFavorites = useMemo(() => {
    return screenshots.filter((item) => Boolean(item.isFavorite || item.favorite));
  }, [screenshots]);

  // Search & Filter inside favorites
  const filteredFavorites = useMemo(() => {
    let list = [...allFavorites];

    // Category filter
    if (selectedCategory !== "All") {
      list = list.filter((item) => item.category === selectedCategory);
    }

    // Search query inside favorites (title, fullText, summary, keyEntities, tags)
    if (favoriteSearchQuery.trim()) {
      const q = favoriteSearchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const textMatch = item.fullText?.toLowerCase().includes(q) || item.ocr_text?.toLowerCase().includes(q);
        const summaryMatch = item.summary?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
        const entityMatch = item.keyEntities?.some((e) => e.toLowerCase().includes(q));
        const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q));
        const catMatch = item.category?.toLowerCase().includes(q);
        return titleMatch || textMatch || summaryMatch || entityMatch || tagMatch || catMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

    return list;
  }, [allFavorites, selectedCategory, favoriteSearchQuery, sortBy]);

  // Category Counts for Favorites
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allFavorites.length };
    for (const item of allFavorites) {
      const cat = item.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allFavorites]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredFavorites.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFavorites.map((f) => f.id));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <PageHeroHeader
        type="favorites"
        title="Favorites Vault"
        subtitle="Your bookmarked screenshots synced across local storage & Supabase cloud with zero latency."
        isDark={isDark}
        actions={
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {allFavorites.length} {allFavorites.length === 1 ? "Item" : "Items"}
            </span>
          </div>
        }
      />

      {/* Search inside Favorites & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input for Favorites */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search inside favorites (OCR text, title, tags, category)..."
              value={favoriteSearchQuery}
              onChange={(e) => setFavoriteSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs sm:text-sm font-medium border transition-all ${
                isDark
                  ? "bg-[#0D1117] border-white/[0.08] text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              }`}
            />
            {favoriteSearchQuery && (
              <button
                onClick={() => setFavoriteSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Toggles & Sorting */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className={`px-3 py-2.5 rounded-2xl text-xs font-semibold border appearance-none pr-8 cursor-pointer ${
                  isDark
                    ? "bg-[#0D1117] border-white/[0.08] text-slate-200 hover:border-white/15"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <option value="newest">Newest Favorited</option>
                <option value="oldest">Oldest Favorited</option>
                <option value="title">Title A-Z</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Selection Mode Button */}
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds([]);
              }}
              className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelectionMode
                  ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20"
                  : isDark
                  ? "bg-[#0D1117] border-white/[0.08] text-slate-300 hover:bg-[#18202B]"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSelectionMode ? "Cancel Selection" : "Select"}</span>
            </button>
          </div>
        </div>

        {/* Category Chips Bar */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-2 py-1">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            if (cat !== "All" && count === 0) return null; // Hide empty categories in favorites
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/20"
                    : isDark
                    ? "bg-[#0D1117] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-[#18202B]"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isDark
                      ? "bg-[#18202B] text-slate-400"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch Action Floating Bar if Selection Mode Active */}
        <AnimatePresence>
          {isSelectionMode && selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-slate-100 flex items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold text-rose-200 border border-rose-500/30 transition-all cursor-pointer"
                >
                  {selectedIds.length === filteredFavorites.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs font-bold text-rose-200">
                  {selectedIds.length} item(s) selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onBatchFavorite?.(selectedIds, false);
                    setSelectedIds([]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Remove from Favorites</span>
                </button>

                {onBatchDelete && (
                  <button
                    onClick={() => {
                      onBatchDelete(selectedIds);
                      setSelectedIds([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Favorites Content Grid / Empty States */}
      {filteredFavorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFavorites.map((item) => (
            <ScreenshotCard
              key={item.id}
              item={item}
              isDark={isDark}
              isSelected={selectedIds.includes(item.id)}
              isSelectionMode={isSelectionMode}
              onSelect={onSelectScreenshot}
              onToggleSelect={toggleSelectId}
              onToggleFavorite={onToggleFavorite}
              onMoveCategory={onMoveCategory}
              onDelete={onDeleteScreenshot}
              onCopyText={onCopyText}
            />
          ))}
        </div>
      ) : (
        <div
          className={`p-12 sm:p-16 text-center rounded-3xl border flex flex-col items-center justify-center space-y-4 ${
            isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <Heart className="w-12 h-12 fill-current animate-bounce" />
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-100">
              {allFavorites.length === 0
                ? "No Favorites Bookmarked Yet"
                : "No Matching Favorites Found"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {allFavorites.length === 0
                ? "Click the Heart icon on any screenshot in your Gallery or Search to save it directly to your Favorites Vault."
                : `No favorited screenshots match "${favoriteSearchQuery}". Try adjusting your query or category filter.`}
            </p>
          </div>

          {favoriteSearchQuery && (
            <button
              onClick={() => {
                setFavoriteSearchQuery("");
                setSelectedCategory("All");
              }}
              className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-rose-600/20"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
