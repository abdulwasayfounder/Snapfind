import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  Star,
  FolderInput,
  X,
  Copy,
  LayoutGrid,
  Grid3X3,
  List,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  CheckCircle2,
  Layers,
  FileText,
  FileCode,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem, SearchResultMatch, CategoryType } from "../types";
import { ScreenshotCard } from "./ScreenshotCard";
import { PaginationControls } from "./PaginationControls";
import { preloadImages } from "../services/imageCache";
import { PageHeroHeader } from "./PageHeroHeader";

interface ScreenshotGridProps {
  screenshots: ScreenshotItem[];
  searchResults: SearchResultMatch[];
  searchQuery: string;
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  isDark: boolean;
  onSelect: (item: ScreenshotItem) => void;
  onToggleFavorite: (id: string) => void;
  onMoveCategory?: (id: string, newCategory: CategoryType) => void;
  onDelete: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onBatchFavorite?: (ids: string[], isFavorite: boolean) => void;
  onBatchMoveCategory?: (ids: string[], newCategory: CategoryType) => void;
  onBatchExport?: (ids: string[], format: "json" | "txt" | "md") => void;
  onBatchShare?: (ids: string[]) => void;
  onBatchReindex?: (ids: string[]) => void;
  onCopyText: (text: string) => void;
  onOpenImport: () => void;
}

const ALL_CATEGORIES: CategoryType[] = [
  "All",
  "Favorites",
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

const TARGET_MOVE_CATEGORIES: CategoryType[] = [
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

export const ScreenshotGrid: React.FC<ScreenshotGridProps> = ({
  screenshots,
  searchResults,
  searchQuery,
  selectedCategory,
  setSelectedCategory,
  isDark,
  onSelect,
  onToggleFavorite,
  onMoveCategory,
  onDelete,
  onBatchDelete,
  onBatchFavorite,
  onBatchMoveCategory,
  onBatchExport,
  onBatchShare,
  onBatchReindex,
  onCopyText,
  onOpenImport,
}) => {
  const [sortMode, setSortMode] = useState<"recent" | "oldest" | "category" | "title">("recent");
  const [viewLayout, setViewLayout] = useState<"grid" | "compact" | "list">("grid");
  const [localSearch, setLocalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals state
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<CategoryType>("Passport");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, sortMode, searchQuery, localSearch]);

  // Clear selection if category or query changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedCategory, searchQuery]);

  // Handle single item selection toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all items in view
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((item) => item.id)));
    }
  };

  // Select all matching items across all pages
  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map((item) => item.id)));
  };

  // Invert selection
  const handleInvertSelection = () => {
    const next = new Set<string>();
    paginatedItems.forEach((item) => {
      if (!selectedIds.has(item.id)) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  // Filter screenshots by Category / Favorites
  let filtered = screenshots.filter((item) => {
    if (selectedCategory === "All") return true;
    if (selectedCategory === "Favorites") return item.isFavorite;
    return item.category === selectedCategory;
  });

  // Local Keyword Search inside Gallery
  if (localSearch.trim()) {
    const term = localSearch.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.fullText.toLowerCase().includes(term) ||
        item.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  // Map match info from AI search
  const matchMap = new Map<string, SearchResultMatch>();
  searchResults.forEach((r) => matchMap.set(r.id, r));

  // If active AI search query, filter & sort by search match
  if (searchQuery.trim()) {
    if (searchResults.length > 0) {
      const matchIds = new Set(searchResults.map((r) => r.id));
      filtered = filtered.filter((item) => matchIds.has(item.id));

      // Sort by search score descending
      filtered.sort((a, b) => {
        const scoreA = matchMap.get(a.id)?.score || 0;
        const scoreB = matchMap.get(b.id)?.score || 0;
        return scoreB - scoreA;
      });
    } else {
      // Fallback simple query filter
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.fullText.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
  } else {
    // Standard sorting
    if (sortMode === "recent") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortMode === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortMode === "category") {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    } else if (sortMode === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  // Preload images for current items
  useEffect(() => {
    if (filtered.length > 0) {
      preloadImages(filtered.slice(0, 24).map((f) => f.imageUrl));
    }
  }, [filtered]);

  // Calculate paginated subset
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  // Bulk Actions
  const handleExecuteBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (onBatchDelete) {
      onBatchDelete(ids);
    } else {
      ids.forEach((id) => onDelete(id));
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleExecuteBulkFavorite = (isFav: boolean) => {
    const ids = Array.from(selectedIds);
    if (onBatchFavorite) {
      onBatchFavorite(ids, isFav);
    } else {
      ids.forEach((id) => onToggleFavorite(id));
    }
    setSelectedIds(new Set());
  };

  const handleExecuteBulkMove = () => {
    const ids = Array.from(selectedIds);
    if (onBatchMoveCategory) {
      onBatchMoveCategory(ids, targetCategory);
    } else if (onMoveCategory) {
      ids.forEach((id) => onMoveCategory(id, targetCategory));
    }
    setSelectedIds(new Set());
    setShowBulkMoveModal(false);
  };

  const handleExecuteBulkCopyText = () => {
    const ids = Array.from(selectedIds);
    const selectedItems = screenshots.filter((s) => ids.includes(s.id));
    const combinedText = selectedItems
      .map((s) => `--- ${s.title} (${s.category}) ---\n${s.fullText || s.summary}`)
      .join("\n\n");
    onCopyText(combinedText);
  };

  const handleExecuteExport = (format: "json" | "txt" | "md") => {
    const ids = Array.from(selectedIds);
    if (onBatchExport) {
      onBatchExport(ids, format);
    } else {
      handleExecuteBulkCopyText();
    }
    setShowExportModal(false);
    setSelectedIds(new Set());
  };

  const handleExecuteShare = () => {
    const ids = Array.from(selectedIds);
    if (onBatchShare) {
      onBatchShare(ids);
    } else {
      handleExecuteBulkCopyText();
    }
  };

  const handleExecuteReindex = () => {
    const ids = Array.from(selectedIds);
    setIsReindexing(true);
    setTimeout(() => {
      if (onBatchReindex) {
        onBatchReindex(ids);
      }
      setIsReindexing(false);
      setSelectedIds(new Set());
    }, 800);
  };

  return (
    <div className="space-y-6 relative">
      {/* 3D Gallery Hero Header */}
      {!searchQuery && (
        <PageHeroHeader
          type="gallery"
          title="Visual Knowledge Vault"
          subtitle="Explore, organize, and retrieve your screenshots with multi-select actions, categorized filtering, and OCR text extraction."
          isDark={isDark}
        />
      )}

      {/* Category Pills & Interactive Filters Toolbar */}
      <div className="space-y-4 pb-4 border-b border-slate-800/40 dark:border-slate-800">
        {/* Category & Special Filter Pills */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const isFavPill = cat === "Favorites";
              const isSelectedCat = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isSelectedCat
                      ? isFavPill
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : isDark
                      ? "bg-[#18181B] border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/40"
                      : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isFavPill && <Star className={`w-3.5 h-3.5 ${isSelectedCat ? "fill-white" : "text-amber-400 fill-amber-400"}`} />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gallery Controls & Selection Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Quick Search inside Gallery */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter gallery..."
              className={`w-full pl-9 pr-8 py-2 rounded-2xl text-xs font-medium border outline-none transition-all ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-500"
                  : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
              }`}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            {/* Multi-Select Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
              className={`px-3.5 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelectionMode || selectedIds.size > 0
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-500/25 ring-2 ring-blue-500/30"
                  : isDark
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {selectedIds.size > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span>{isSelectionMode ? "Exit Multi-Select" : "Multi-Select"}</span>
            </motion.button>

            {/* Select Quick Tools */}
            {(isSelectionMode || selectedIds.size > 0) && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleSelectAll}
                  className={`px-2.5 py-2 rounded-xl border text-[11px] font-medium transition-all ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Select / deselect items on current page"
                >
                  {selectedIds.size === paginatedItems.length && paginatedItems.length > 0
                    ? "Deselect Page"
                    : "Select Page"}
                </button>
                <button
                  onClick={handleSelectAllFiltered}
                  className={`px-2.5 py-2 rounded-xl border text-[11px] font-medium transition-all ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Select all matching items"
                >
                  Select All ({filtered.length})
                </button>
              </div>
            )}

            {/* Layout View Switcher */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <button
                onClick={() => setViewLayout("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Default Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("compact")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === "compact" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Compact Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewLayout === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortMode}
              onChange={(e: any) => setSortMode(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold bg-transparent outline-none cursor-pointer ${
                isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"
              }`}
            >
              <option value="recent">Sort: Most Recent</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="category">Sort: Category</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {filtered.length > 0 ? (
        <>
          <motion.div
            layout
            className={
              viewLayout === "compact"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6"
                : viewLayout === "list"
                ? "grid grid-cols-1 gap-4"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            }
          >
            {paginatedItems.map((item) => (
              <ScreenshotCard
                key={item.id}
                item={item}
                matchInfo={matchMap.get(item.id)}
                isDark={isDark}
                isSelected={selectedIds.has(item.id)}
                isSelectionMode={isSelectionMode || selectedIds.size > 0}
                onSelect={onSelect}
                onToggleSelect={handleToggleSelect}
                onToggleFavorite={onToggleFavorite}
                onMoveCategory={onMoveCategory}
                onDelete={onDelete}
                onCopyText={onCopyText}
              />
            ))}
          </motion.div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
            onItemsPerPageChange={(num) => setItemsPerPage(num)}
            isDark={isDark}
          />
        </>
      ) : (
        /* Empty State */
        <div
          className={`text-center py-16 px-4 rounded-3xl border flex flex-col items-center justify-center ${
            isDark
              ? "bg-slate-900/50 border-slate-800 text-slate-300"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          <div className="text-5xl mb-4 select-none animate-bounce">📸</div>
          <h3 className="text-xl font-bold mb-1 tracking-tight text-slate-100">
            {screenshots.length === 0
              ? "Upload your first screenshot."
              : "No matching screenshots found."}
          </h3>
          <p className="text-sm opacity-75 max-w-md mx-auto mb-6">
            {screenshots.length === 0
              ? "We'll organize it automatically."
              : searchQuery || localSearch
              ? `No screenshots matched your filters. Try clearing search terms or upload new ones.`
              : `We'll organize it automatically.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(searchQuery || localSearch || selectedCategory !== "All") && screenshots.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setLocalSearch("");
                }}
                className="px-4 py-2.5 rounded-2xl border text-xs font-semibold hover:bg-slate-800/20 transition-all"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={onOpenImport}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all"
            >
              Upload Screenshot
            </button>
          </div>
        </div>
      )}

      {/* Premium Floating Selection Dock with Spring Physics */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 70, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl p-3 sm:p-4 rounded-3xl border shadow-2xl backdrop-blur-2xl bg-[#09090B]/95 border-blue-500/40 text-slate-100 flex flex-col md:flex-row items-center justify-between gap-3.5"
          >
            {/* Dock Header: Counter & Selection Helpers */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start px-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <span className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 font-mono text-xs">
                    {selectedIds.size}
                  </span>
                  <span>Selected</span>
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={handleInvertSelection}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
                  title="Invert current selection"
                >
                  Invert
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
                  title="Clear selection"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Action Dock Buttons (All 7 Actions) */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none justify-start md:justify-end">
              {/* 1. Delete Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                title="Delete selected screenshots (Move to Trash)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </motion.button>

              {/* 2. Favorite Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleExecuteBulkFavorite(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                title="Add selected to Favorites"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Favorite</span>
              </motion.button>

              {/* 3. Move Collection / Category Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowBulkMoveModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                title="Move selected to collection or category"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Move Collection</span>
              </motion.button>

              {/* 4. Export Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                title="Export selected (JSON, TXT, MD)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </motion.button>

              {/* 5. Share Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleExecuteShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                title="Share selected items summary"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </motion.button>

              {/* 6. Copy OCR Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleExecuteBulkCopyText}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                title="Copy full concatenated OCR text"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy OCR</span>
              </motion.button>

              {/* 7. Reindex Action */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleExecuteReindex}
                disabled={isReindexing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                title="Re-run AI Vision indexing on selected items"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin text-cyan-400" : ""}`} />
                <span>{isReindexing ? "Scanning..." : "Reindex"}</span>
              </motion.button>

              {/* Close Dock Button */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all ml-1 shrink-0"
                title="Close dock"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Move Collection Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FolderInput className="w-5 h-5 text-blue-400" />
                <span>Move {selectedIds.size} Screenshots</span>
              </h3>
              <button onClick={() => setShowBulkMoveModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs opacity-80 leading-relaxed">
              Choose target collection or category for all {selectedIds.size} selected screenshot items:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {TARGET_MOVE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTargetCategory(cat)}
                  className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                    targetCategory === cat
                      ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20"
                      : isDark
                      ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>{cat}</span>
                  {targetCategory === cat && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkMoveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800/20"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkMove}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Confirm Move
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                <span>Export {selectedIds.size} Selected Items</span>
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs opacity-80 leading-relaxed">
              Select the export format for your selected screenshots metadata and extracted OCR text:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExecuteExport("json")}
                className="w-full p-4 rounded-2xl border text-left flex items-start gap-3 bg-slate-950/60 border-indigo-500/30 hover:border-indigo-400 transition-all cursor-pointer"
              >
                <FileCode className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-indigo-300">JSON Metadata Bundle (.json)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Complete raw JSON object containing titles, tags, OCR text, and AI confidence scores.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleExecuteExport("txt")}
                className="w-full p-4 rounded-2xl border text-left flex items-start gap-3 bg-slate-950/60 border-blue-500/30 hover:border-blue-400 transition-all cursor-pointer"
              >
                <FileText className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-blue-300">Text Digest (.txt)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Concatenated plain-text document with clear headings for all OCR text.
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleExecuteExport("md")}
                className="w-full p-4 rounded-2xl border text-left flex items-start gap-3 bg-slate-950/60 border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer"
              >
                <Sparkles className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-purple-300">Markdown Document (.md)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Formatted Markdown report with summaries, key facts, and code blocks.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800/20"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-lg">Move {selectedIds.size} Screenshots to Trash?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Selected screenshots will be moved to Trash. You can restore them anytime within 30 days.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-slate-800/20"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Move to Trash
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
