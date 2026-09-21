import React from "react";
import { X, SlidersHorizontal, Check, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CategoryType } from "../types";

export type DateFilterType = "all" | "today" | "week" | "month" | "year";
export type SortOptionType = "relevance" | "newest" | "oldest" | "ocrScore";
export type ProcessingStatusType = "all" | "indexed" | "pending";
export type FileTypeFilter = "all" | "png" | "jpeg" | "webp";

export interface FilterState {
  category: CategoryType;
  date: DateFilterType;
  onlyFavorites: boolean;
  hasOcrText: boolean;
  aiAnalyzed: boolean;
  processingStatus: ProcessingStatusType;
  fileType: FileTypeFilter;
  sortBy: SortOptionType;
}

interface SearchFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onUpdateFilters: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  activeCount: number;
  isDark: boolean;
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

const DATE_OPTIONS: { id: DateFilterType; label: string }[] = [
  { id: "all", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "week", label: "Past 7 days" },
  { id: "month", label: "Past 30 days" },
  { id: "year", label: "Past year" },
];

const SORT_OPTIONS: { id: SortOptionType; label: string }[] = [
  { id: "relevance", label: "Search Relevance" },
  { id: "newest", label: "Newest First" },
  { id: "oldest", label: "Oldest First" },
  { id: "ocrScore", label: "Highest OCR Accuracy" },
];

const STATUS_OPTIONS: { id: ProcessingStatusType; label: string }[] = [
  { id: "all", label: "All Statuses" },
  { id: "indexed", label: "Fully Indexed" },
  { id: "pending", label: "Pending Processing" },
];

const FILE_TYPE_OPTIONS: { id: FileTypeFilter; label: string }[] = [
  { id: "all", label: "All Formats" },
  { id: "png", label: "PNG" },
  { id: "jpeg", label: "JPEG / JPG" },
  { id: "webp", label: "WebP" },
];

export const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onClearFilters,
  activeCount,
  isDark,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        {/* Panel Container (Slide-over on desktop, bottom sheet on mobile) */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className={`w-screen max-w-md flex flex-col justify-between shadow-2xl relative z-10 ${
            isDark
              ? "bg-[#07090D] border-l border-white/[0.08] text-slate-100"
              : "bg-white border-l border-slate-200 text-slate-900"
          }`}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="font-semibold text-base text-slate-100">Filters</h2>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
                  {activeCount} active
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Filter Options */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 1. Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => onUpdateFilters({ category: e.target.value as CategoryType })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0D1117] text-slate-200 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Date Range Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateFilters({ date: opt.id })}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                      filters.date === opt.id
                        ? "bg-[#3B82F6]/20 border-[#3B82F6] text-blue-300 font-semibold"
                        : "bg-[#0D1117] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/15"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Checkbox / Boolean Toggles */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Content Properties
              </label>

              {/* Favorites Only */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-[#0D1117] cursor-pointer hover:border-white/15 transition-colors">
                <span className="text-xs font-medium text-slate-200">Favorites only</span>
                <input
                  type="checkbox"
                  checked={filters.onlyFavorites}
                  onChange={(e) => onUpdateFilters({ onlyFavorites: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-[#121821] text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </label>

              {/* Has OCR text */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-[#0D1117] cursor-pointer hover:border-white/15 transition-colors">
                <span className="text-xs font-medium text-slate-200">Has OCR text detected</span>
                <input
                  type="checkbox"
                  checked={filters.hasOcrText}
                  onChange={(e) => onUpdateFilters({ hasOcrText: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-[#121821] text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </label>

              {/* AI analyzed */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-[#0D1117] cursor-pointer hover:border-white/15 transition-colors">
                <span className="text-xs font-medium text-slate-200">AI analyzed & tagged</span>
                <input
                  type="checkbox"
                  checked={filters.aiAnalyzed}
                  onChange={(e) => onUpdateFilters({ aiAnalyzed: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-[#121821] text-[#3B82F6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>

            {/* 4. Sort By */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Sort & Relevance
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onUpdateFilters({ sortBy: e.target.value as SortOptionType })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0D1117] text-slate-200 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
              >
                {SORT_OPTIONS.map((sort) => (
                  <option key={sort.id} value={sort.id}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Processing Status */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                Processing Status
              </label>
              <select
                value={filters.processingStatus}
                onChange={(e) => onUpdateFilters({ processingStatus: e.target.value as ProcessingStatusType })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0D1117] text-slate-200 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. File Type */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                File Type
              </label>
              <select
                value={filters.fileType}
                onChange={(e) => onUpdateFilters({ fileType: e.target.value as FileTypeFilter })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#0D1117] text-slate-200 text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
              >
                {FILE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-white/[0.08] bg-[#07090D] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClearFilters}
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer text-center"
            >
              Apply Filters
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
