import React, { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  SlidersHorizontal,
  Search,
  User,
  Crown,
  Server,
  Cloud,
  X,
  Filter,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  ScreenshotItem,
} from "../types";
import { NavViewType } from "./BottomNavigation";
import {
  CategoryFilterTab,
  formatNotificationRelativeTime,
  getCategoryVisuals,
  getPriorityVisuals,
} from "./NotificationCenter";
import { PageHeroHeader } from "./PageHeroHeader";

interface NotificationPageViewProps {
  notifications: AppNotification[];
  screenshots?: ScreenshotItem[];
  isDark: boolean;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onSelectScreenshot?: (screenshot: ScreenshotItem) => void;
  onNavigate: (view: NavViewType) => void;
  onOpenPricing?: () => void;
  onOpenAuth?: () => void;
  onTriggerSync?: () => void;
  onCopyText?: (text: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const NotificationPageView: React.FC<NotificationPageViewProps> = ({
  notifications,
  screenshots = [],
  isDark,
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onSelectScreenshot,
  onNavigate,
  onOpenPricing,
  onOpenAuth,
  onTriggerSync,
  onCopyText,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<CategoryFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const screenshotMap = useMemo(() => {
    return new Map<string, ScreenshotItem>(screenshots.map((s) => [s.id, s]));
  }, [screenshots]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read && !n.isRead).length;
  }, [notifications]);

  // Tab counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: notifications.length,
      UNREAD: unreadCount,
      IMPORTANT: 0,
      SECURITY: 0,
      INDEXING: 0,
      ACCOUNT: 0,
      SUBSCRIPTION: 0,
      SYSTEM: 0,
      SYNC: 0,
    };
    notifications.forEach((n) => {
      const cat = (n.type as string)?.toUpperCase();
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else if (cat === "SCREENSHOT_INDEXED" || cat === "OCR_COMPLETED" || cat === "AI_FINISHED") {
        counts.INDEXING++;
      } else if (cat === "SYNC_COMPLETED") {
        counts.SYNC++;
      } else if (cat === "ERROR") {
        counts.IMPORTANT++;
      } else {
        counts.SYSTEM++;
      }
    });
    return counts;
  }, [notifications, unreadCount]);

  // Filtered stream
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isRead = Boolean(n.read ?? n.isRead);
      const cat = (n.type as string)?.toUpperCase();

      // Tab filter
      if (activeTab === "UNREAD" && isRead) return false;
      if (activeTab !== "ALL" && activeTab !== "UNREAD") {
        if (activeTab === "INDEXING") {
          const match =
            cat === "INDEXING" ||
            cat === "SCREENSHOT_INDEXED" ||
            cat === "OCR_COMPLETED" ||
            cat === "AI_FINISHED";
          if (!match) return false;
        } else if (activeTab === "SYNC") {
          if (cat !== "SYNC" && cat !== "SYNC_COMPLETED") return false;
        } else if (activeTab === "IMPORTANT") {
          if (cat !== "IMPORTANT" && cat !== "ERROR") return false;
        } else if (cat !== activeTab) {
          return false;
        }
      }

      // Priority filter
      if (selectedPriority !== "ALL") {
        if (n.priority !== selectedPriority) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title?.toLowerCase().includes(q);
        const msgMatch = (n.message || n.description || "").toLowerCase().includes(q);
        const typeMatch = n.type?.toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [notifications, activeTab, selectedPriority, searchQuery]);

  const handleCardClick = (notification: AppNotification) => {
    const isRead = Boolean(notification.read ?? notification.isRead);
    if (!isRead) {
      onMarkAsRead(notification.id);
    }
    const screenshotId = notification.screenshotId || notification.metadata?.screenshotId;
    if (screenshotId && onSelectScreenshot) {
      const item = screenshotMap.get(screenshotId);
      if (item) {
        onSelectScreenshot(item);
        return;
      }
    }
    if (notification.type === "SUBSCRIPTION" && onOpenPricing) {
      onOpenPricing();
      return;
    }
    if (notification.type === "SECURITY" && onOpenAuth) {
      onOpenAuth();
      return;
    }
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopyText) {
      onCopyText(text);
    } else {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabsList: { id: CategoryFilterTab; label: string; count: number; icon: any }[] = [
    { id: "ALL", label: "All Alerts", count: categoryCounts.ALL, icon: SlidersHorizontal },
    { id: "SECURITY", label: "Security", count: categoryCounts.SECURITY, icon: ShieldAlert },
    { id: "ACCOUNT", label: "Account", count: categoryCounts.ACCOUNT, icon: User },
    { id: "SUBSCRIPTION", label: "Subscription", count: categoryCounts.SUBSCRIPTION, icon: Crown },
    { id: "INDEXING", label: "Indexing", count: categoryCounts.INDEXING, icon: Sparkles },
    { id: "IMPORTANT", label: "Alerts", count: categoryCounts.IMPORTANT, icon: AlertTriangle },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Hero Header */}
      <PageHeroHeader
        type="notifications"
        title="Notifications & Alert Center"
        subtitle="Real-time event stream for vision indexing, security, sync backups, and subscriptions."
        isDark={isDark}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read ({unreadCount})</span>
            </button>

            {notifications.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear History</span>
              </button>
            )}

            <button
              onClick={() => onNavigate("settings")}
              title="Notification Settings"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? "bg-[#18181B] border-white/10 hover:bg-white/10 text-slate-300"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Clear Confirmation Modal / Banner */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDark ? "bg-rose-950/30 border-rose-500/40 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Are you sure?</span> This will delete all{" "}
                {notifications.length} notification records.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  onClearAllNotifications();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isDark ? "bg-white/10 border-white/10 text-slate-200" : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-3xl border space-y-4 ${
          isDark ? "bg-[#0f0f13] border-white/10" : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications by title, details, or metadata..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-2xl border text-xs sm:text-sm outline-none transition-all ${
                isDark
                  ? "bg-[#18181B] border-white/10 text-slate-100 focus:border-blue-500/60 placeholder:text-slate-500"
                  : "bg-white border-slate-200 text-slate-900 focus:border-blue-500/60 placeholder:text-slate-400"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-semibold shrink-0">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={`px-3 py-2 rounded-2xl border text-xs font-semibold outline-none cursor-pointer w-full sm:w-auto ${
                isDark
                  ? "bg-[#18181B] border-white/10 text-slate-200 focus:border-blue-500"
                  : "bg-white border-slate-200 text-slate-800 focus:border-blue-500"
              }`}
            >
              <option value="ALL">All Priorities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabsList.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25"
                    : isDark
                    ? "bg-[#18181B] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-[#202026]"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive
                      ? "bg-white/20 text-white font-extrabold"
                      : isDark
                      ? "bg-white/5 text-slate-400"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading Skeletons
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`p-5 rounded-3xl border animate-pulse ${
                  isDark ? "bg-[#121216] border-white/5" : "bg-slate-100 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3.5 w-1/4 bg-white/10 rounded" />
                    <div className="h-4 w-1/2 bg-white/10 rounded" />
                    <div className="h-3 w-3/4 bg-white/10 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div
            className={`p-12 text-center rounded-3xl border space-y-3 ${
              isDark ? "bg-[#121216] border-white/10" : "bg-white border-slate-200"
            }`}
          >
            <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 w-16 h-16 mx-auto flex items-center justify-center text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-base text-rose-400">Error Loading Event Stream</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Retry Stream
              </button>
            )}
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => {
            const isRead = Boolean(n.read ?? n.isRead);
            const visuals = getCategoryVisuals(n.type, isDark);
            const priorityVisual = getPriorityVisuals(n.priority);
            const associatedScreenshot = (n.screenshotId || n.metadata?.screenshotId)
              ? screenshotMap.get(n.screenshotId || n.metadata?.screenshotId || "")
              : undefined;
            const messageText = n.message || n.description || "";
            const createdAtString = n.created_at || n.timestamp || "";

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={() => handleCardClick(n)}
                className={`group relative p-5 rounded-3xl border transition-all cursor-pointer ${
                  isDark
                    ? isRead
                      ? "bg-[#111115]/70 border-white/5 hover:border-white/15 hover:bg-[#16161c]"
                      : "bg-[#141522] border-blue-500/30 hover:border-blue-500/60 shadow-xl shadow-blue-950/20"
                    : isRead
                    ? "bg-white border-slate-200 hover:bg-slate-50"
                    : "bg-blue-50/70 border-blue-200 hover:bg-blue-50 shadow-sm"
                }`}
              >
                {/* Unread Indicator Glow */}
                {!isRead && (
                  <div className="absolute top-5 right-5 flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Category Visual Icon */}
                  <div className={`p-3 rounded-2xl border shrink-0 ${visuals.iconBg}`}>
                    {visuals.icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6 space-y-2">
                    {/* Top Meta Line: Category Badge + Priority + Timestamp */}
                    <div className="flex items-center gap-2.5 flex-wrap text-xs">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider text-[10px] ${visuals.badgeBg}`}
                      >
                        {visuals.label}
                      </span>

                      {n.priority && n.priority !== "medium" && (
                        <span
                          className={`font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 text-[10px] ${priorityVisual.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityVisual.dotColor}`} />
                          <span>{priorityVisual.label}</span>
                        </span>
                      )}

                      <span className="text-slate-400 font-mono text-xs ml-auto">
                        {formatNotificationRelativeTime(createdAtString)}
                      </span>
                    </div>

                    {/* Title & Message */}
                    <h3
                      className={`text-sm sm:text-base font-bold leading-snug ${
                        isDark
                          ? isRead
                            ? "text-slate-200"
                            : "text-white font-extrabold"
                          : isRead
                          ? "text-slate-800"
                          : "text-slate-900 font-extrabold"
                      }`}
                    >
                      {n.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {messageText}
                    </p>

                    {/* Metadata Badges */}
                    {n.metadata && Object.keys(n.metadata).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {n.metadata.failedCount !== undefined && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-mono font-bold">
                            {n.metadata.failedCount} Failed
                          </span>
                        )}
                        {n.metadata.syncCount !== undefined && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                            {n.metadata.syncCount} Synced
                          </span>
                        )}
                        {n.metadata.wordsCount !== undefined && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                            {n.metadata.wordsCount} words
                          </span>
                        )}
                        {n.metadata.accuracy !== undefined && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                            {(n.metadata.accuracy * 100).toFixed(1)}% Accuracy
                          </span>
                        )}
                        {n.metadata.planCycle && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                            {n.metadata.planCycle}
                          </span>
                        )}
                        {n.metadata.eventType && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono">
                            {n.metadata.eventType}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
                      {associatedScreenshot ? (
                        <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1.5">
                          <span>Inspect Screenshot</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      ) : n.type === "SUBSCRIPTION" && onOpenPricing ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPricing();
                          }}
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>View Subscription Options</span>
                        </button>
                      ) : n.type === "SYNC" && onTriggerSync ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriggerSync();
                          }}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Run Cloud Sync</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(messageText, n.id, e)}
                          className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === n.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied to clipboard</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Event Details</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Card Buttons: Read / Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(n.id);
                          }}
                          className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title={isRead ? "Mark as unread" : "Mark as read"}
                        >
                          <Check className={`w-4 h-4 ${isRead ? "opacity-30" : "text-blue-400"}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(n.id);
                          }}
                          className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          // Contextual Empty State
          <div
            className={`p-16 text-center rounded-3xl border space-y-4 ${
              isDark ? "bg-[#0f0f13] border-white/5" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="p-4 rounded-full bg-slate-800/40 border border-white/5 w-20 h-20 mx-auto flex items-center justify-center text-slate-400">
              <Bell className="w-10 h-10 opacity-40" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base">
                {activeTab === "UNREAD"
                  ? "You're all caught up!"
                  : activeTab === "ALL"
                  ? "No notifications logged yet"
                  : `No ${activeTab.toLowerCase()} notifications`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {activeTab === "UNREAD"
                  ? "There are no unread alerts at this time. When new background indexing or security events occur, they will appear here."
                  : activeTab === "IMPORTANT"
                  ? "No urgent alerts or processing errors. Storage quotas and pipelines are operating normally."
                  : activeTab === "SECURITY"
                  ? "No security warnings or password modification alerts."
                  : activeTab === "SUBSCRIPTION"
                  ? "No subscription or renewal notifications at this time."
                  : "Notifications are created from real application events such as screenshot OCR extraction, sync backups, account security, and subscription status."}
              </p>
            </div>
            {activeTab !== "ALL" && (
              <button
                onClick={() => setActiveTab("ALL")}
                className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                View All Notifications
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
