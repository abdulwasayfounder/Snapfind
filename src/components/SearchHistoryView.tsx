import React, { useState, useMemo } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  History,
  Search,
  Trash2,
  ArrowUpRight,
  Sparkles,
  Clock,
  Calendar,
  Filter,
  X,
  Flame,
  CheckCircle,
  Folder,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SearchHistoryItem, CategoryType } from "../types";

interface SearchHistoryViewProps {
  history: SearchHistoryItem[];
  onExecuteSearch: (query: string) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem?: (id: string) => void;
  isDark: boolean;
}

export const SearchHistoryView: React.FC<SearchHistoryViewProps> = ({
  history,
  onExecuteSearch,
  onClearHistory,
  onDeleteHistoryItem,
  isDark,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Group search items by time (Today, Yesterday, Earlier)
  const groupedHistory = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const filtered = history.filter((item) => {
      if (filterCategory !== "All" && item.categoryFilter !== filterCategory) return false;
      if (searchFilter.trim() && !item.query.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      return true;
    });

    const groups: {
      today: SearchHistoryItem[];
      yesterday: SearchHistoryItem[];
      older: SearchHistoryItem[];
    } = { today: [], yesterday: [], older: [] };

    filtered.forEach((item) => {
      const t = new Date(item.timestamp).getTime();
      if (t >= todayStart) {
        groups.today.push(item);
      } else if (t >= yesterdayStart) {
        groups.yesterday.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  }, [history, filterCategory, searchFilter]);

  const totalSearches = history.length;
  const uniqueQueries = new Set(history.map((h) => h.query.toLowerCase())).size;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SnapFindLogo className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Search History</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                {totalSearches} records
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review past search queries and 1-click re-execute natural language queries.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold hover:bg-rose-950/30 text-rose-400 border-rose-800/40 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl border border-white/10 bg-[#121216]/60 backdrop-blur-md">
            <div className="text-[11px] text-slate-400 font-medium">Total Searches Logged</div>
            <div className="text-xl font-extrabold text-blue-400 mt-0.5">{totalSearches}</div>
          </div>
          <div className="p-3.5 rounded-2xl border border-white/10 bg-[#121216]/60 backdrop-blur-md">
            <div className="text-[11px] text-slate-400 font-medium">Unique Queries</div>
            <div className="text-xl font-extrabold text-purple-400 mt-0.5">{uniqueQueries}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl border border-white/10 bg-[#121216]/60 backdrop-blur-md">
            <div className="text-[11px] text-slate-400 font-medium">Search Response</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">0ms Instant</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar for History */}
      {history.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter search history..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#18181B] border border-white/10 text-white outline-none focus:border-blue-500 transition-colors"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grouped History List */}
      {history.length > 0 ? (
        <div className="space-y-6">
          {/* Today */}
          {groupedHistory.today.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Today</span>
              </div>
              <div className="space-y-2">
                {groupedHistory.today.map((item) => (
                  <HistoryItemCard
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onExecute={onExecuteSearch}
                    onDelete={onDeleteHistoryItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Yesterday */}
          {groupedHistory.yesterday.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Yesterday</span>
              </div>
              <div className="space-y-2">
                {groupedHistory.yesterday.map((item) => (
                  <HistoryItemCard
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onExecute={onExecuteSearch}
                    onDelete={onDeleteHistoryItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Older */}
          {groupedHistory.older.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Older Searches</span>
              </div>
              <div className="space-y-2">
                {groupedHistory.older.map((item) => (
                  <HistoryItemCard
                    key={item.id}
                    item={item}
                    isDark={isDark}
                    onExecute={onExecuteSearch}
                    onDelete={onDeleteHistoryItem}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`text-center py-16 px-4 rounded-3xl border border-dashed ${
            isDark ? "bg-[#121216]/50 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="p-4 rounded-full bg-slate-800/80 w-16 h-16 mx-auto flex items-center justify-center text-slate-400 mb-3">
            <History className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-sm mb-1">No search history recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try searching for screenshots like "Show passport" or "Electricity bill" in the AI Search page.
          </p>
        </div>
      )}
    </div>
  );
};

interface HistoryItemCardProps {
  item: SearchHistoryItem;
  isDark: boolean;
  onExecute: (query: string) => void;
  onDelete?: (id: string) => void;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({ item, isDark, onExecute, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between transition-all group hover:border-blue-500/60 ${
        isDark ? "bg-[#121216]/80 border-white/10 hover:bg-[#181820]" : "bg-white border-slate-200 hover:bg-blue-50/40"
      }`}
    >
      <div
        onClick={() => onExecute(item.query)}
        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
      >
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Search className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-slate-100 group-hover:text-blue-400 transition-colors">
            {item.query}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>•</span>
            <span className="text-blue-400 font-mono">{item.resultCount} results</span>
            {item.categoryFilter && item.categoryFilter !== "All" && (
              <>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-medium">
                  {item.categoryFilter}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={() => onExecute(item.query)}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>Search</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
