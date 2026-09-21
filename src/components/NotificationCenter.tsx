import React, { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
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
  Lock,
  ExternalLink,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  ScreenshotItem,
  ToastMessage,
} from "../types";

export interface NotificationCenterProps {
  notifications: AppNotification[];
  toasts?: ToastMessage[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onSelectScreenshot?: (screenshot: ScreenshotItem) => void;
  screenshots?: ScreenshotItem[];
  onDismissToast?: (id: string) => void;
  isDark: boolean;
  onTriggerSync?: () => void;
  onCopyText?: (text: string) => void;
  onOpenPricing?: () => void;
  onOpenAuth?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export type CategoryFilterTab = "ALL" | "UNREAD" | NotificationCategory;

export function formatNotificationRelativeTime(timestamp: string): string {
  try {
    const now = Date.now();
    const date = new Date(timestamp);
    const diff = now - date.getTime();
    if (isNaN(diff)) return "Recently";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

export function getCategoryVisuals(category: NotificationCategory | string, isDark: boolean) {
  switch (category) {
    case "IMPORTANT":
      return {
        label: "Important",
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
        badgeBg: isDark ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-red-100 text-red-800 border-red-200",
        iconBg: isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600",
        accentBorder: "border-red-500/40",
      };
    case "SECURITY":
      return {
        label: "Security",
        icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
        badgeBg: isDark ? "bg-purple-500/15 text-purple-300 border-purple-500/30" : "bg-purple-100 text-purple-800 border-purple-200",
        iconBg: isDark ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-600",
        accentBorder: "border-purple-500/40",
      };
    case "INDEXING":
      return {
        label: "Indexing",
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        badgeBg: isDark ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-cyan-100 text-cyan-800 border-cyan-200",
        iconBg: isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600",
        accentBorder: "border-cyan-500/40",
      };
    case "ACCOUNT":
      return {
        label: "Account",
        icon: <User className="w-4 h-4 text-emerald-400" />,
        badgeBg: isDark ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-200",
        iconBg: isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600",
        accentBorder: "border-emerald-500/40",
      };
    case "SUBSCRIPTION":
      return {
        label: "Subscription",
        icon: <Crown className="w-4 h-4 text-amber-400" />,
        badgeBg: isDark ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-amber-100 text-amber-800 border-amber-200",
        iconBg: isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600",
        accentBorder: "border-amber-500/40",
      };
    case "SYNC":
      return {
        label: "Sync",
        icon: <Cloud className="w-4 h-4 text-teal-400" />,
        badgeBg: isDark ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : "bg-teal-100 text-teal-800 border-teal-200",
        iconBg: isDark ? "bg-teal-500/10 border-teal-500/20 text-teal-400" : "bg-teal-50 border-teal-200 text-teal-600",
        accentBorder: "border-teal-500/40",
      };
    case "SYSTEM":
    default:
      return {
        label: "System",
        icon: <Server className="w-4 h-4 text-blue-400" />,
        badgeBg: isDark ? "bg-blue-500/15 text-blue-300 border-blue-500/30" : "bg-blue-100 text-blue-800 border-blue-200",
        iconBg: isDark ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600",
        accentBorder: "border-blue-500/40",
      };
  }
}

export function getPriorityVisuals(priority?: NotificationPriority) {
  switch (priority) {
    case "critical":
      return {
        label: "Critical",
        dotColor: "bg-red-500",
        badge: "text-red-400 bg-red-500/15 border-red-500/30",
        pulse: true,
      };
    case "high":
      return {
        label: "High",
        dotColor: "bg-amber-500",
        badge: "text-amber-400 bg-amber-500/15 border-amber-500/30",
        pulse: false,
      };
    case "low":
      return {
        label: "Low",
        dotColor: "bg-slate-400",
        badge: "text-slate-400 bg-slate-500/10 border-slate-500/20",
        pulse: false,
      };
    case "medium":
    default:
      return {
        label: "Normal",
        dotColor: "bg-blue-400",
        badge: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        pulse: false,
      };
  }
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  toasts = [],
  isOpen,
  onClose,
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onSelectScreenshot,
  screenshots = [],
  onDismissToast,
  isDark,
  onTriggerSync,
  onCopyText,
  onOpenPricing,
  onOpenAuth,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState<CategoryFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filtering
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
  }, [notifications, activeTab, searchQuery]);

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
        onClose();
        return;
      }
    }
    if (notification.type === "SUBSCRIPTION" && onOpenPricing) {
      onOpenPricing();
      onClose();
      return;
    }
    if (notification.type === "SECURITY" && onOpenAuth) {
      onOpenAuth();
      onClose();
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
    { id: "ALL", label: "All", count: categoryCounts.ALL, icon: SlidersHorizontal },
    { id: "SECURITY", label: "Security", count: categoryCounts.SECURITY, icon: ShieldAlert },
    { id: "ACCOUNT", label: "Account", count: categoryCounts.ACCOUNT, icon: User },
    { id: "SUBSCRIPTION", label: "Subscription", count: categoryCounts.SUBSCRIPTION, icon: Crown },
    { id: "INDEXING", label: "Indexing", count: categoryCounts.INDEXING, icon: Sparkles },
    { id: "IMPORTANT", label: "Alerts", count: categoryCounts.IMPORTANT, icon: AlertTriangle },
  ];

  return (
    <>
      {/* 1. Global Floating Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-5 right-3 sm:right-5 left-3 sm:left-auto z-50 flex flex-col gap-2 max-w-sm sm:w-full pointer-events-none">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-2xl flex items-start gap-3.5 ${
                  toast.type === "success"
                    ? isDark
                      ? "bg-[#09090B]/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/30"
                      : "bg-white/95 border-emerald-200 text-slate-900 shadow-emerald-500/10"
                    : toast.type === "error"
                    ? isDark
                      ? "bg-[#09090B]/95 border-rose-500/40 text-slate-100 shadow-rose-950/30"
                      : "bg-white/95 border-rose-200 text-slate-900 shadow-rose-500/10"
                    : toast.type === "warning"
                    ? isDark
                      ? "bg-[#09090B]/95 border-amber-500/40 text-slate-100 shadow-amber-950/30"
                      : "bg-white/95 border-amber-200 text-slate-900 shadow-amber-500/10"
                    : isDark
                    ? "bg-[#09090B]/95 border-blue-500/40 text-slate-100 shadow-blue-950/30"
                    : "bg-white/95 border-blue-200 text-slate-900 shadow-blue-500/10"
                }`}
              >
                <div className="shrink-0 pt-0.5">
                  {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
                  {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {toast.type === "info" && <Info className="w-5 h-5 text-blue-400" />}
                </div>

                <div className="flex-1 space-y-0.5 text-xs min-w-0">
                  <h4 className="font-bold tracking-tight">{toast.title}</h4>
                  {toast.description && (
                    <p className="opacity-80 text-[11px] leading-relaxed line-clamp-2">
                      {toast.description}
                    </p>
                  )}
                </div>

                {onDismissToast && (
                  <button
                    onClick={() => onDismissToast(toast.id)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Slide-Over Notification Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`relative w-full max-w-lg h-full flex flex-col shadow-2xl border-l z-10 ${
                isDark
                  ? "bg-[#09090B] border-white/10 text-slate-100 shadow-black/80"
                  : "bg-white border-slate-200 text-slate-900 shadow-2xl"
              }`}
            >
              {/* Header */}
              <div className={`p-5 border-b space-y-3.5 ${isDark ? "border-white/10 bg-[#0c0c10]" : "border-slate-200 bg-slate-50/70"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                          Alerts & Notifications
                        </h2>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-md shadow-blue-500/30">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Real-time event stream & operational alerts
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-2xl border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Close notifications"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search & Actions Bar */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter alerts & events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-8.5 pr-3 py-1.5 rounded-xl border text-xs outline-none transition-all ${
                        isDark
                          ? "bg-[#18181B] border-white/10 text-slate-200 focus:border-blue-500/60 placeholder:text-slate-500"
                          : "bg-white border-slate-200 text-slate-800 focus:border-blue-500/60 placeholder:text-slate-400"
                      }`}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={onMarkAllAsRead}
                    disabled={unreadCount === 0}
                    title="Mark all as read"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>

                  {notifications.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      title="Clear all notifications"
                      className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills (Horizontal Scroll) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {tabsList.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25"
                            : isDark
                            ? "bg-[#141418] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-[#1c1c22]"
                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isActive
                              ? "bg-white/20 text-white font-bold"
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

              {/* Clear All Confirmation Banner */}
              <AnimatePresence>
                {showClearConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-rose-500/15 border-b border-rose-500/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>Permanently erase all {notifications.length} notifications?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClearAllNotifications();
                          setShowClearConfirm(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                      >
                        Yes, Clear
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notifications Content Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                  // Loading State Skeleton
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl border animate-pulse ${
                          isDark ? "bg-[#121216] border-white/5" : "bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-white/10" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-1/3 bg-white/10 rounded" />
                            <div className="h-4 w-3/4 bg-white/10 rounded" />
                            <div className="h-3 w-full bg-white/10 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  // Error State
                  <div className="text-center py-16 px-4 space-y-3">
                    <div className="p-3.5 rounded-full bg-rose-500/10 border border-rose-500/20 w-14 h-14 mx-auto flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-rose-300">Failed to Load Notifications</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{error}</p>
                    </div>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  // Real Notifications Stream
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => handleCardClick(n)}
                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                          isDark
                            ? isRead
                              ? "bg-[#111115]/80 border-white/5 hover:border-white/15 hover:bg-[#16161c]"
                              : "bg-[#141520] border-blue-500/30 hover:border-blue-500/50 shadow-lg shadow-blue-950/20"
                            : isRead
                            ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            : "bg-blue-50/70 border-blue-200 hover:bg-blue-50 shadow-sm"
                        }`}
                      >
                        {/* Unread Indicator Glow */}
                        {!isRead && (
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                            </span>
                          </div>
                        )}

                        <div className="flex items-start gap-3.5">
                          {/* Category Visual Icon */}
                          <div className={`p-2.5 rounded-2xl border shrink-0 ${visuals.iconBg}`}>
                            {visuals.icon}
                          </div>

                          {/* Body */}
                          <div className="flex-1 min-w-0 pr-5 space-y-1.5">
                            {/* Top Meta Line: Category Badge + Priority + Timestamp */}
                            <div className="flex items-center gap-2 flex-wrap text-[10px]">
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${visuals.badgeBg}`}
                              >
                                {visuals.label}
                              </span>

                              {n.priority && n.priority !== "medium" && (
                                <span
                                  className={`font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${priorityVisual.badge}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${priorityVisual.dotColor}`} />
                                  <span>{priorityVisual.label}</span>
                                </span>
                              )}

                              <span className="text-slate-400 font-mono ml-auto">
                                {formatNotificationRelativeTime(createdAtString)}
                              </span>
                            </div>

                            {/* Title & Message */}
                            <h4
                              className={`font-bold text-xs sm:text-sm leading-snug ${
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
                            </h4>

                            <p className="text-xs text-slate-300 leading-relaxed font-normal">
                              {messageText}
                            </p>

                            {/* Metadata Pills */}
                            {n.metadata && Object.keys(n.metadata).length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {n.metadata.failedCount !== undefined && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 font-mono font-bold">
                                    {n.metadata.failedCount} Failed
                                  </span>
                                )}
                                {n.metadata.syncCount !== undefined && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                                    {n.metadata.syncCount} Synced
                                  </span>
                                )}
                                {n.metadata.wordsCount !== undefined && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                                    {n.metadata.wordsCount} words
                                  </span>
                                )}
                                {n.metadata.accuracy !== undefined && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                                    {(n.metadata.accuracy * 100).toFixed(1)}% Accuracy
                                  </span>
                                )}
                                {n.metadata.planCycle && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                                    {n.metadata.planCycle}
                                  </span>
                                )}
                                {n.metadata.eventType && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono">
                                    {n.metadata.eventType}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/5">
                              {associatedScreenshot ? (
                                <span className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
                                  <span>Inspect Screenshot</span>
                                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              ) : n.type === "SUBSCRIPTION" && onOpenPricing ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPricing();
                                    onClose();
                                  }}
                                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Crown className="w-3 h-3" />
                                  <span>View Subscription</span>
                                </button>
                              ) : n.type === "SYNC" && onTriggerSync ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTriggerSync();
                                  }}
                                  className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Run Sync Now</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(messageText, n.id, e)}
                                  className="text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedId === n.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Toggle Read / Delete */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkAsRead(n.id);
                                  }}
                                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title={isRead ? "Mark as unread" : "Mark as read"}
                                >
                                  <Check className={`w-3.5 h-3.5 ${isRead ? "opacity-30" : "text-blue-400"}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteNotification(n.id);
                                  }}
                                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Delete alert"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
                  <div className="text-center py-16 px-4 space-y-3">
                    <div className="p-4 rounded-full bg-slate-800/50 border border-white/5 w-16 h-16 mx-auto flex items-center justify-center text-slate-400">
                      <Bell className="w-8 h-8 opacity-50" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">
                        {activeTab === "UNREAD"
                          ? "All caught up!"
                          : activeTab === "ALL"
                          ? "No notifications yet"
                          : `No ${activeTab.toLowerCase()} alerts`}
                      </h3>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                        {activeTab === "UNREAD"
                          ? "You have zero unread alerts. New application events will appear here as they happen."
                          : activeTab === "IMPORTANT"
                          ? "All processing and quota checks are healthy. No critical errors detected."
                          : activeTab === "SECURITY"
                          ? "No security events or unauthorized login attempts detected."
                          : activeTab === "SUBSCRIPTION"
                          ? "No pending subscription alerts or renewal notices."
                          : "Actual application events like screenshot indexing, security events, and sync status will stream here automatically."}
                      </p>
                    </div>
                    {activeTab !== "ALL" && (
                      <button
                        onClick={() => setActiveTab("ALL")}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        View All Alerts
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className={`p-4 border-t flex items-center justify-between text-xs text-slate-400 ${
                  isDark ? "border-white/10 bg-[#09090B]" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono">Event Engine Active</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
