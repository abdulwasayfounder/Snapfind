import React, { useState, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  Search,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Trash,
  Info,
  ShieldAlert,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScreenshotItem } from "../types";
import { PageHeroHeader } from "./PageHeroHeader";

interface TrashViewProps {
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onRestoreScreenshot: (id: string) => void;
  onBatchRestore: (ids: string[]) => void;
  onPermanentDelete: (id: string) => void;
  onBatchPermanentDelete: (ids: string[]) => void;
  onEmptyTrash: () => void;
  onSelectScreenshot: (item: ScreenshotItem) => void;
}

export const TrashView: React.FC<TrashViewProps> = ({
  screenshots,
  isDark,
  onRestoreScreenshot,
  onBatchRestore,
  onPermanentDelete,
  onBatchPermanentDelete,
  onEmptyTrash,
  onSelectScreenshot,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showEmptyConfirmModal, setShowEmptyConfirmModal] = useState(false);
  const [sortBy, setSortBy] = useState<"daysLeft" | "newest" | "title">("daysLeft");

  // Calculate days remaining helper
  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const deletedDate = new Date(deletedAt).getTime();
    if (isNaN(deletedDate)) return 30;
    const now = Date.now();
    const elapsedMs = now - deletedDate;
    const daysElapsed = elapsedMs / (1000 * 60 * 60 * 24);
    const daysLeft = Math.max(0, Math.ceil(30 - daysElapsed));
    return daysLeft;
  };

  // Filter master list to deleted items only
  const trashItems = useMemo(() => {
    return screenshots.filter((item) => Boolean(item.isDeleted || item.is_deleted));
  }, [screenshots]);

  // Filter & search inside trash
  const filteredTrash = useMemo(() => {
    let list = [...trashItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const textMatch = item.fullText?.toLowerCase().includes(q) || item.ocr_text?.toLowerCase().includes(q);
        const summaryMatch = item.summary?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        return titleMatch || textMatch || summaryMatch || catMatch;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "daysLeft") {
        return getDaysRemaining(a.deletedAt) - getDaysRemaining(b.deletedAt);
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

    return list;
  }, [trashItems, searchQuery, sortBy]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTrash.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTrash.map((f) => f.id));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Banner */}
      <PageHeroHeader
        type="trash"
        title="Trash Bin"
        subtitle="Items in Trash are retained for 30 days before auto-deletion. You can restore them or permanently delete them now."
        isDark={isDark}
        actions={
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">
              {trashItems.length} {trashItems.length === 1 ? "Item" : "Items"}
            </span>

            {/* Empty Trash Button */}
            {trashItems.length > 0 && (
              <button
                onClick={() => setShowEmptyConfirmModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-red-600/25 cursor-pointer shrink-0"
              >
                <Trash className="w-4 h-4" />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        }
      />

      {/* Controls & Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search inside Trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs sm:text-sm font-medium border transition-all ${
                isDark
                  ? "bg-[#0D1117] border-white/[0.08] text-slate-100 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
                <option value="daysLeft">Expiring Soonest</option>
                <option value="newest">Recently Deleted</option>
                <option value="title">Title A-Z</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds([]);
              }}
              className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelectionMode
                  ? "bg-red-600 text-white border-red-500 shadow-md"
                  : isDark
                  ? "bg-[#0D1117] border-white/[0.08] text-slate-300 hover:bg-[#18202B]"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSelectionMode ? "Cancel" : "Select"}</span>
            </button>
          </div>
        </div>

        {/* Batch Action Bar */}
        <AnimatePresence>
          {isSelectionMode && selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-red-950/90 border border-red-500/40 text-slate-100 flex items-center justify-between gap-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 rounded-xl bg-red-900/60 hover:bg-red-800 text-xs font-semibold text-red-200 border border-red-500/30 transition-all cursor-pointer"
                >
                  {selectedIds.length === filteredTrash.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs font-bold text-red-200">
                  {selectedIds.length} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onBatchRestore(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected</span>
                </button>

                <button
                  onClick={() => {
                    onBatchPermanentDelete(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Items Grid */}
      {filteredTrash.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredTrash.map((item) => {
              const daysLeft = getDaysRemaining(item.deletedAt || (item as any).deleted_at);
              const isSelected = selectedIds.includes(item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-red-500 border-red-500/80 bg-red-950/20"
                      : isDark
                      ? "bg-[#121215] border-slate-800/80 hover:border-slate-700 hover:shadow-xl"
                      : "bg-white border-slate-200 hover:shadow-xl"
                  }`}
                >
                  {/* Countdown Badge overlay */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md border shadow-lg flex items-center gap-1 ${
                        daysLeft <= 3
                          ? "bg-red-600/90 text-white border-red-400 animate-pulse"
                          : daysLeft <= 7
                          ? "bg-amber-500/90 text-white border-amber-300"
                          : "bg-slate-900/80 text-slate-200 border-slate-700"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{daysLeft === 0 ? "Expires Today" : `${daysLeft} Days Left`}</span>
                    </span>
                  </div>

                  {/* Selection Checkbox overlay */}
                  {isSelectionMode && (
                    <button
                      onClick={() => toggleSelectId(item.id)}
                      className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/60 border border-white/20 text-white"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? "bg-red-600 border-red-400" : "border-white/60 bg-black/40"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  )}

                  {/* Image Thumbnail Container */}
                  <div
                    onClick={() => onSelectScreenshot(item)}
                    className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>

                  {/* Info & Action Footer */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category || "General"}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-100 truncate mt-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {item.summary || item.fullText || "No content summary"}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onRestoreScreenshot(item.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>

                      <button
                        onClick={() => onPermanentDelete(item.id)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div
          className={`p-12 sm:p-16 text-center rounded-3xl border flex flex-col items-center justify-center space-y-4 ${
            isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="p-4 rounded-3xl bg-slate-800 border border-slate-700 text-slate-400">
            <Trash2 className="w-12 h-12" />
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-100">
              {trashItems.length === 0 ? "Trash Bin is Empty" : "No Matching Items Found"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {trashItems.length === 0
                ? "When you delete screenshots, they move here and remain available for 30 days before being automatically purged."
                : `No deleted items match "${searchQuery}".`}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      <AnimatePresence>
        {showEmptyConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-[#121215] border border-red-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30">
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Empty Trash Permanently?</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                You are about to permanently delete all <strong>{trashItems.length}</strong> item(s) in your Trash Bin. They will be immediately erased from local storage and cloud database.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowEmptyConfirmModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onEmptyTrash();
                    setShowEmptyConfirmModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                >
                  Yes, Delete All Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
