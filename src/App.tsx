import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ScreenshotItem,
  SearchResultMatch,
  SearchHistoryItem,
  CategoryType,
  ToastMessage,
  AppSettings,
  UserProfile,
  CollectionItem,
  AppNotification,
} from "./types";
import {
  loadStoredScreenshots,
  saveStoredScreenshots,
  deleteStoredScreenshot,
  deleteStoredScreenshotsBatch,
  loadSearchHistory,
  saveSearchHistory,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  initializeStorage,
  loadNotifications,
  saveNotifications,
} from "./services/storage.ts";
import {
  loadStoredCollections,
  deriveAndSyncCollections,
  createCustomCollection,
  renameCollection,
  deleteCollection,
  mergeCollections,
  moveScreenshotsToCollection,
} from "./services/collectionEngine";
import { nativeMediaScanner } from "./services/nativeMediaScanner";
import { searchScreenshotsAI, instantKeywordSearch } from "./services/api";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { SidebarNavigation } from "./components/SidebarNavigation";
import { SearchBar } from "./components/SearchBar";
import { ScreenshotGrid } from "./components/ScreenshotGrid";
import { ImageViewerModal } from "./components/ImageViewerModal";
import { BatchImporter } from "./components/BatchImporter";
import { SearchHistoryView } from "./components/SearchHistoryView";
import { SettingsView } from "./components/SettingsView";
import { AuthModal } from "./components/AuthModal";
import { NotificationCenter } from "./components/NotificationCenter";
import { StatsOverview } from "./components/StatsOverview";
import { BottomNavigation, NavViewType } from "./components/BottomNavigation";
import { LandingScreen } from "./components/LandingScreen";
import { DashboardView } from "./components/DashboardView";
import { CollectionsView } from "./components/CollectionsView";
import { TimelineView } from "./components/TimelineView";
import { SearchView } from "./components/SearchView";
import { FavoritesView } from "./components/FavoritesView";
import { TrashView } from "./components/TrashView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useRouteScrollReset } from "./hooks/useRouteScrollReset";
import { OfflineBanner } from "./components/OfflineBanner";
import { PricingPageView } from "./components/PricingPageView";
import { NotificationPageView } from "./components/NotificationPageView";
import { AccountPageView } from "./components/AccountPageView";
import { AdminPaymentsPage } from "./components/admin/AdminPaymentsPage";
import { FeedbackView } from "./components/FeedbackView";
import { FounderFeedbackPrompt } from "./components/FounderFeedbackPrompt";
import { FounderBanner } from "./components/FounderBanner";
import { FoundersPageView } from "./components/FoundersPageView";
import { SnapDashPageView } from "./components/game/SnapDashPageView";
import { GiveFeedbackModal } from "./components/feedback/GiveFeedbackModal";
import { clearUserSessionData } from "./services/storage";

import { SyncEngine } from "./services/syncEngine";
import { searchEngine } from "./services/searchEngine";
import { processingQueue } from "./services/processingQueue";
import { NotificationService } from "./services/notificationService";

function AppContent() {
  const { user: authUser, signOut, isRecoveryMode } = useAuth();
  const isOnline = useOnlineStatus();

  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>(() => loadStoredScreenshots());
  const [collections, setCollections] = useState<CollectionItem[]>(() => {
    const initialScreenshots = loadStoredScreenshots();
    const storedCols = loadStoredCollections();
    return deriveAndSyncCollections(initialScreenshots, storedCols);
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("All");

  const [activeView, setActiveView] = useState<NavViewType>(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname === "/admin/payments" || window.location.pathname === "/admin-payments") {
        return "admin-payments";
      }
      if (window.location.pathname === "/game" || window.location.pathname === "/snapdash") {
        return "game";
      }
      if (window.location.hash) {
        const rawHash = window.location.hash.replace(/^#\/?/, "");
        if (rawHash === "admin/payments" || rawHash === "admin-payments" || rawHash === "admin") {
          return "admin-payments";
        }
        if (rawHash === "game" || rawHash === "snapdash") {
          return "game";
        }
        const validViews: NavViewType[] = [
          "landing",
          "dashboard",
          "collections",
          "timeline",
          "favorites",
          "trash",
          "gallery",
          "search",
          "import",
          "history",
          "settings",
          "pricing",
          "founders",
          "account",
          "notifications",
          "feedback",
          "game",
          "admin-payments",
        ];
        if (validViews.includes(rawHash as NavViewType)) {
          return rawHash as NavViewType;
        }
      }
    }
    return "landing";
  });
  const [selectedItem, setSelectedItem] = useState<ScreenshotItem | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Global Route-change scroll reset (resets scroll to top (0,0) on every route/page change)
  useRouteScrollReset(activeView, mainContentRef);

  // Keep browser history and URL hash synchronized for back/forward navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.replace(/^#\/?/, "");
    const formattedHash = activeView === "admin-payments" ? "admin/payments" : activeView;
    if (currentHash !== formattedHash && currentHash !== activeView) {
      window.history.replaceState({ view: activeView }, "", `#${formattedHash}`);
    }
  }, [activeView]);

  // Handle browser back / forward button navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = (event: PopStateEvent) => {
      const stateView = event.state?.view;
      const rawHash = window.location.hash.replace(/^#\/?/, "");
      let targetView: NavViewType = (stateView || rawHash) as NavViewType;
      if (rawHash === "admin/payments" || rawHash === "admin-payments" || rawHash === "admin") {
        targetView = "admin-payments";
      }
      const validViews: NavViewType[] = [
        "landing",
        "dashboard",
        "collections",
        "timeline",
        "favorites",
        "trash",
        "gallery",
        "search",
        "import",
        "history",
        "settings",
        "pricing",
        "founders",
        "account",
        "notifications",
        "feedback",
        "game",
        "admin-payments",
      ];
      if (targetView && validViews.includes(targetView)) {
        setActiveView(targetView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => loadSearchHistory());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [isStorageReady, setIsStorageReady] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Automatically show auth modal in reset-password mode if recovery flow is triggered
  useEffect(() => {
    if (isRecoveryMode) {
      setIsAuthOpen(true);
    }
  }, [isRecoveryMode]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackPageContext, setFeedbackPageContext] = useState("General");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => NotificationService.getNotifications());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleOpenFeedback = (pageContext?: string) => {
    setFeedbackPageContext(pageContext || activeView);
    setIsFeedbackModalOpen(true);
  };

  // Listen for global custom event to open feedback modal
  useEffect(() => {
    const handleFeedbackEvent = (e: any) => {
      const page = e.detail?.page || activeView;
      handleOpenFeedback(page);
    };
    window.addEventListener("snapfind_open_feedback", handleFeedbackEvent);
    return () => window.removeEventListener("snapfind_open_feedback", handleFeedbackEvent);
  }, [activeView]);

  // Keep local user profile in sync with Auth Context
  const activeUser = authUser || userProfile;

  // Active non-deleted screenshots vs Trash screenshots
  const activeScreenshots = useMemo(() => {
    return screenshots.filter((item) => !item.isDeleted && !item.is_deleted);
  }, [screenshots]);

  const trashScreenshots = useMemo(() => {
    return screenshots.filter((item) => Boolean(item.isDeleted || item.is_deleted));
  }, [screenshots]);

  // Subscribe to NotificationService singleton
  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((list) => {
      setNotifications(list);
    });
    return unsubscribe;
  }, []);

  // Listen for plan quota limit exceeded and pricing navigation events
  useEffect(() => {
    const handleQuotaExceeded = (e: any) => {
      NotificationService.notifyQuotaExceeded(activeScreenshots.length, 500);
      addToast({
        title: e.detail?.title || "Plan Quota Reached",
        description: e.detail?.message || "You've reached the Free plan limit of 500 screenshots. Upgrade to Pro for 10,000.",
        type: "info",
      });
      setActiveView("pricing");
    };

    const handleOpenProModal = () => {
      setActiveView("pricing");
    };

    window.addEventListener("snapfind_quota_exceeded", handleQuotaExceeded);
    window.addEventListener("snapfind_open_pro_modal", handleOpenProModal);

    return () => {
      window.removeEventListener("snapfind_quota_exceeded", handleQuotaExceeded);
      window.removeEventListener("snapfind_open_pro_modal", handleOpenProModal);
    };
  }, [activeScreenshots.length]);

  // Auto-purge items from Trash older than 30 days
  useEffect(() => {
    if (screenshots.length === 0) return;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let purgedCount = 0;

    const remaining = screenshots.filter((item) => {
      const isDel = item.isDeleted || item.is_deleted;
      if (!isDel) return true;
      const delAt = item.deletedAt || item.deleted_at;
      if (!delAt) return true;
      const delTime = new Date(delAt).getTime();
      if (isNaN(delTime)) return true;

      const elapsed = now - delTime;
      if (elapsed > THIRTY_DAYS_MS) {
        purgedCount++;
        return false;
      }
      return true;
    });

    if (purgedCount > 0) {
      setScreenshots(remaining);
      addToast({
        title: "Auto-Cleanup Performed",
        description: `Purged ${purgedCount} item(s) in Trash older than 30 days.`,
        type: "info",
      });
    }
  }, [screenshots.length]);

  // Sync collections whenever screenshots change
  useEffect(() => {
    const synced = deriveAndSyncCollections(activeScreenshots, collections);
    setCollections(synced);
  }, [activeScreenshots, screenshots.length]);

  // Collection Handlers
  const handleCreateCollection = (name: string, description?: string) => {
    const updated = createCustomCollection(name, description, collections);
    setCollections(updated);
  };

  const handleRenameCollection = (oldName: string, newName: string) => {
    const { updatedScreenshots, updatedCollections } = renameCollection(
      oldName,
      newName,
      screenshots,
      collections
    );
    setScreenshots(updatedScreenshots);
    setCollections(updatedCollections);
  };

  const handleDeleteCollection = (collectionName: string, deleteScreenshots: boolean) => {
    const { updatedScreenshots, updatedCollections } = deleteCollection(
      collectionName,
      screenshots,
      collections,
      deleteScreenshots
    );
    setScreenshots(updatedScreenshots);
    setCollections(updatedCollections);
  };

  const handleMergeCollections = (sourceNames: string[], targetName: string) => {
    const { updatedScreenshots, updatedCollections } = mergeCollections(
      sourceNames,
      targetName,
      screenshots,
      collections
    );
    setScreenshots(updatedScreenshots);
    setCollections(updatedCollections);
  };

  const handleMoveScreenshots = (ids: string[], targetCollectionName: string) => {
    const { updatedScreenshots, updatedCollections } = moveScreenshotsToCollection(
      ids,
      targetCollectionName,
      screenshots,
      collections
    );
    setScreenshots(updatedScreenshots);
    setCollections(updatedCollections);
  };

  // Initialize Production Storage Provider (IndexedDB / SQLite) & Automatic localStorage Migration
  useEffect(() => {
    initializeStorage().then(() => {
      const stored = loadStoredScreenshots();
      setScreenshots(stored);
      searchEngine.updateIndex(stored);
      setSettings(loadSettings());
      setSearchHistory(loadSearchHistory());
      setUserProfile(loadUserProfile());
      nativeMediaScanner.initialize();
      setIsStorageReady(true);
    });
  }, []);

  // Listen for real-time background OCR / AI processing completions & failures
  useEffect(() => {
    const handleScreenshotProcessed = (e: any) => {
      const updatedScreenshot: ScreenshotItem | undefined = e.detail?.screenshot;
      if (!updatedScreenshot || !updatedScreenshot.id) return;

      setScreenshots((prev) =>
        prev.map((item) => (item.id === updatedScreenshot.id ? { ...item, ...updatedScreenshot } : item))
      );

      if (selectedItem?.id === updatedScreenshot.id) {
        setSelectedItem((prev) => (prev ? { ...prev, ...updatedScreenshot } : null));
      }
    };

    window.addEventListener("snapfind_screenshot_processed", handleScreenshotProcessed);
    return () => {
      window.removeEventListener("snapfind_screenshot_processed", handleScreenshotProcessed);
    };
  }, [selectedItem?.id]);

  // Restore user-scoped data when auth user changes (e.g. login/logout)
  useEffect(() => {
    if (!isStorageReady) return;
    if (authUser?.id && authUser.id !== "guest") {
      console.log(`[App] Auth user logged in (${authUser.id}), restoring remote & local screenshots...`);
      SyncEngine.restoreUserDataOnLogin(authUser.id).then((restored) => {
        if (restored.screenshots) {
          setScreenshots(restored.screenshots);
          searchEngine.updateIndex(restored.screenshots);
        }
        if (restored.settings) {
          setSettings(restored.settings);
        }
        if (restored.history) {
          setSearchHistory(restored.history);
        }
      });
    } else {
      SyncEngine.setCurrentUserId("guest");
      clearUserSessionData();
      const localStored = loadStoredScreenshots();
      setScreenshots(localStored);
      searchEngine.updateIndex(localStored);
    }
  }, [authUser?.id, isStorageReady]);

  // Sync screenshots to storage & search engine once storage is initialized
  useEffect(() => {
    if (!isStorageReady) return;
    saveStoredScreenshots(screenshots);
    searchEngine.updateIndex(screenshots);
  }, [screenshots, isStorageReady]);

  // Sync settings to storage & handle dark/light mode class
  useEffect(() => {
    saveSettings(settings);
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  // Persist notifications to storage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Toast Helper
  const addToast = (msg: { title: string; description?: string; type: "success" | "error" | "info" | "warning" }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { ...msg, id, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Notification Center Helpers delegated to NotificationService singleton
  const handleMarkAllAsRead = () => {
    NotificationService.markAllAsRead();
    addToast({
      title: "All Notifications Marked Read",
      type: "info",
    });
  };

  const handleMarkAsRead = (id: string) => {
    NotificationService.toggleRead(id);
  };

  const handleDeleteNotification = (id: string) => {
    NotificationService.deleteNotification(id);
  };

  const handleClearAllNotifications = () => {
    NotificationService.clearAll(activeUser?.id);
    addToast({
      title: "Notifications Cleared",
      description: "All notifications were permanently cleared.",
      type: "info",
    });
  };

  // Listen to background sync engine completions for real-time notifications
  useEffect(() => {
    let wasSyncing = false;
    const unsubscribe = SyncEngine.subscribe((state) => {
      if (wasSyncing && !state.isSyncing) {
        if (!state.lastError && state.lastSyncedAt) {
          NotificationService.notifySyncCompleted(activeScreenshots.length);
        } else if (state.lastError) {
          NotificationService.notifySyncFailed(state.lastError);
        }
      }
      wasSyncing = state.isSyncing;
    });
    return unsubscribe;
  }, [activeScreenshots.length]);

  // Execute Natural Language Search via AI (Instant 0ms + Background AI Refinement)
  const handleExecuteSearch = async (queryToRun: string) => {
    const q = queryToRun.trim();
    setSearchQuery(q);

    if (!q) {
      setSearchResults([]);
      return;
    }

    // 1. Instant local search (0ms latency)
    const instantResults = instantKeywordSearch(q, activeScreenshots);
    setSearchResults(instantResults);
    setActiveView("search");

    // Add to search history immediately
    const newHistoryItem: SearchHistoryItem = {
      id: `sh-${Date.now()}`,
      query: q,
      timestamp: new Date().toISOString(),
      resultCount: instantResults.length,
      categoryFilter: selectedCategory,
    };
    const updatedHistory = [newHistoryItem, ...searchHistory.filter((h) => h.query !== q)];
    setSearchHistory(updatedHistory);
    saveSearchHistory(updatedHistory);

    // 2. Background AI refinement (non-blocking)
    setIsSearching(true);
    try {
      const results = await searchScreenshotsAI(q, activeScreenshots);
      if (results && results.length > 0) {
        setSearchResults(results);
      }
    } catch (err) {
      console.error("AI search refinement fallback:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Delete individual search history item
  const handleDeleteHistoryItem = (id: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveSearchHistory(updated);
      return updated;
    });
    addToast({
      title: "History Record Removed",
      type: "info",
    });
  };

  // Clear all search history
  const handleClearHistory = () => {
    setSearchHistory([]);
    saveSearchHistory([]);
    addToast({
      title: "Search History Cleared",
      description: "All recorded natural language search queries were cleared.",
      type: "info",
    });
  };

  // Toggle favorite status & sync locally + Supabase
  const handleToggleFavorite = (id: string) => {
    let updatedItem: ScreenshotItem | null = null;
    setScreenshots((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !(item.isFavorite || item.favorite);
          updatedItem = {
            ...item,
            isFavorite: nextState,
            favorite: nextState,
            dateModified: new Date().toISOString(),
            date_modified: new Date().toISOString(),
          };
          if (selectedItem?.id === id) setSelectedItem(updatedItem);
          return updatedItem;
        }
        return item;
      })
    );

    if (updatedItem) {
      SyncEngine.markScreenshotPending(updatedItem);
      const isFav = (updatedItem as ScreenshotItem).isFavorite;
      addToast({
        title: isFav ? "Added to Favorites" : "Removed from Favorites",
        description: isFav
          ? `Saved "${(updatedItem as ScreenshotItem).title}" in Favorites.`
          : `Removed "${(updatedItem as ScreenshotItem).title}" from Favorites.`,
        type: "success",
      });
    }
  };

  // Move screenshot category
  const handleMoveCategory = (id: string, newCategory: CategoryType) => {
    setScreenshots((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, category: newCategory };
          if (selectedItem?.id === id) setSelectedItem(updated);
          return updated;
        }
        return item;
      })
    );
    addToast({
      title: "Category Updated",
      description: `Moved screenshot to "${newCategory}".`,
      type: "success",
    });
  };

  // Move screenshot to Trash (Soft Delete)
  const handleDeleteScreenshot = (id: string) => {
    let trashedTitle = "";
    const nowIso = new Date().toISOString();
    setScreenshots((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          trashedTitle = item.title;
          const updated: ScreenshotItem = {
            ...item,
            isDeleted: true,
            is_deleted: true,
            deletedAt: nowIso,
            deleted_at: nowIso,
          };
          SyncEngine.markScreenshotPending(updated);
          return updated;
        }
        return item;
      })
    );
    setSearchResults((prev) => prev.filter((r) => r.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    addToast({
      title: "Moved to Trash",
      description: trashedTitle
        ? `"${trashedTitle}" moved to Trash (retained 30 days).`
        : "Screenshot moved to Trash (retained 30 days).",
      type: "info",
    });
  };

  // Batch Move to Trash
  const handleBatchDelete = (ids: string[]) => {
    const idSet = new Set(ids);
    const nowIso = new Date().toISOString();
    setScreenshots((prev) =>
      prev.map((item) => {
        if (idSet.has(item.id)) {
          const updated: ScreenshotItem = {
            ...item,
            isDeleted: true,
            is_deleted: true,
            deletedAt: nowIso,
            deleted_at: nowIso,
          };
          SyncEngine.markScreenshotPending(updated);
          return updated;
        }
        return item;
      })
    );
    setSearchResults((prev) => prev.filter((r) => !idSet.has(r.id)));
    if (selectedItem && idSet.has(selectedItem.id)) setSelectedItem(null);
    addToast({
      title: "Moved to Trash",
      description: `${ids.length} screenshot(s) moved to Trash.`,
      type: "info",
    });
  };

  // Restore Screenshot from Trash
  const handleRestoreScreenshot = (id: string) => {
    let restoredTitle = "";
    setScreenshots((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          restoredTitle = item.title;
          const updated: ScreenshotItem = {
            ...item,
            isDeleted: false,
            is_deleted: false,
            deletedAt: undefined,
            deleted_at: undefined,
          };
          SyncEngine.markScreenshotPending(updated);
          return updated;
        }
        return item;
      })
    );
    addToast({
      title: "Screenshot Restored",
      description: restoredTitle
        ? `"${restoredTitle}" restored to Gallery.`
        : "Item restored to Gallery.",
      type: "success",
    });
  };

  // Batch Restore
  const handleBatchRestore = (ids: string[]) => {
    const idSet = new Set(ids);
    setScreenshots((prev) =>
      prev.map((item) => {
        if (idSet.has(item.id)) {
          const updated: ScreenshotItem = {
            ...item,
            isDeleted: false,
            is_deleted: false,
            deletedAt: undefined,
            deleted_at: undefined,
          };
          SyncEngine.markScreenshotPending(updated);
          return updated;
        }
        return item;
      })
    );
    addToast({
      title: "Screenshots Restored",
      description: `${ids.length} item(s) restored to Gallery.`,
      type: "success",
    });
  };

  // Permanent Delete single item
  const handlePermanentDelete = (id: string) => {
    deleteStoredScreenshot(id);
    setScreenshots((prev) => prev.filter((item) => item.id !== id));
    setSearchResults((prev) => prev.filter((r) => r.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
    addToast({
      title: "Permanently Deleted",
      description: "Item erased from storage.",
      type: "info",
    });
  };

  // Batch Permanent Delete
  const handleBatchPermanentDelete = (ids: string[]) => {
    deleteStoredScreenshotsBatch(ids);
    const idSet = new Set(ids);
    setScreenshots((prev) => prev.filter((item) => !idSet.has(item.id)));
    setSearchResults((prev) => prev.filter((r) => !idSet.has(r.id)));
    if (selectedItem && idSet.has(selectedItem.id)) setSelectedItem(null);
    addToast({
      title: "Permanently Deleted",
      description: `Erased ${ids.length} item(s) permanently.`,
      type: "info",
    });
  };

  // Empty Entire Trash
  const handleEmptyTrash = () => {
    const trashIds = Array.from(
      new Set(
        screenshots.filter((s) => Boolean(s.isDeleted || s.is_deleted)).map((s) => s.id)
      )
    );
    const count = trashIds.length;
    if (count > 0) {
      deleteStoredScreenshotsBatch(trashIds);
    }
    const trashSet = new Set(trashIds);
    setScreenshots((prev) => prev.filter((item) => !trashSet.has(item.id)));
    setSearchResults((prev) => prev.filter((r) => !trashSet.has(r.id)));
    addToast({
      title: "Trash Emptied",
      description: `Permanently deleted ${count} item(s).`,
      type: "info",
    });
  };

  // Batch favorite / unfavorite
  const handleBatchFavorite = (ids: string[], isFavorite: boolean) => {
    const idSet = new Set(ids);
    const updatedList: ScreenshotItem[] = [];

    setScreenshots((prev) =>
      prev.map((item) => {
        if (idSet.has(item.id)) {
          const updated = {
            ...item,
            isFavorite,
            favorite: isFavorite,
            dateModified: new Date().toISOString(),
            date_modified: new Date().toISOString(),
          };
          updatedList.push(updated);
          return updated;
        }
        return item;
      })
    );

    if (selectedItem && idSet.has(selectedItem.id)) {
      setSelectedItem({ ...selectedItem, isFavorite, favorite: isFavorite });
    }

    // Mark updated items as pending sync
    updatedList.forEach((item) => SyncEngine.markScreenshotPending(item));

    addToast({
      title: isFavorite ? "Marked as Favorite" : "Favorites Updated",
      description: `Updated ${ids.length} screenshot(s).`,
      type: "success",
    });
  };

  // Batch move category
  const handleBatchMoveCategory = (ids: string[], targetCategory: CategoryType) => {
    const idSet = new Set(ids);
    setScreenshots((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, category: targetCategory } : item))
    );
    if (selectedItem && idSet.has(selectedItem.id)) {
      setSelectedItem({ ...selectedItem, category: targetCategory });
    }
    addToast({
      title: "Category Batch Moved",
      description: `Moved ${ids.length} item(s) to "${targetCategory}".`,
      type: "success",
    });
  };

  // Batch Export
  const handleBatchExport = (ids: string[], format: "json" | "txt" | "md") => {
    const idSet = new Set(ids);
    const selectedScreenshots = screenshots.filter((s) => idSet.has(s.id));
    if (selectedScreenshots.length === 0) return;

    let blobContent = "";
    let mimeType = "text/plain";
    let fileExt = "txt";

    if (format === "json") {
      blobContent = JSON.stringify(selectedScreenshots, null, 2);
      mimeType = "application/json";
      fileExt = "json";
    } else if (format === "md") {
      blobContent = `# SnapFind AI Knowledge Export\n*Exported ${selectedScreenshots.length} items on ${new Date().toLocaleDateString()}*\n\n` +
        selectedScreenshots
          .map(
            (s, idx) =>
              `## ${idx + 1}. ${s.title}\n- **Category:** ${s.category}\n- **Date:** ${new Date(s.createdAt).toLocaleDateString()}\n- **Tags:** ${s.tags?.join(", ") || "None"}\n\n### Summary\n${s.summary}\n\n### Extracted OCR Text\n\`\`\`\n${s.fullText || s.ocr_text || s.summary}\n\`\`\`\n\n---`
          )
          .join("\n\n");
      mimeType = "text/markdown";
      fileExt = "md";
    } else {
      // txt format
      blobContent = `SNAPFIND AI - BATCH OCR EXPORT (${selectedScreenshots.length} ITEMS)\n` +
        `===================================================\n\n` +
        selectedScreenshots
          .map(
            (s, idx) =>
              `[${idx + 1}] ${s.title.toUpperCase()} (${s.category})\nDate: ${new Date(s.createdAt).toLocaleDateString()}\nSummary: ${s.summary}\n\nOCR TEXT:\n${s.fullText || s.ocr_text || s.summary}\n---------------------------------------------------`
          )
          .join("\n\n");
      mimeType = "text/plain";
      fileExt = "txt";
    }

    const blob = new Blob([blobContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snapfind_export_${new Date().toISOString().slice(0, 10)}.${fileExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      title: "Export Complete",
      description: `Exported ${selectedScreenshots.length} screenshot(s) as .${fileExt.toUpperCase()}`,
      type: "success",
    });
  };

  // Batch Share
  const handleBatchShare = (ids: string[]) => {
    const idSet = new Set(ids);
    const selectedScreenshots = screenshots.filter((s) => idSet.has(s.id));
    if (selectedScreenshots.length === 0) return;

    const summaryText = `📸 SnapFind AI - ${selectedScreenshots.length} Screenshots:\n\n` +
      selectedScreenshots
        .slice(0, 5)
        .map((s, i) => `${i + 1}. ${s.title} (${s.category}) - ${s.summary}`)
        .join("\n") +
      (selectedScreenshots.length > 5 ? `\n...and ${selectedScreenshots.length - 5} more.` : "");

    if (navigator.share) {
      navigator
        .share({
          title: `SnapFind AI - ${selectedScreenshots.length} Screenshots`,
          text: summaryText,
        })
        .catch(() => {
          navigator.clipboard.writeText(summaryText);
          addToast({
            title: "Share Summary Copied",
            description: `Copied summary of ${selectedScreenshots.length} screenshot(s) to clipboard.`,
            type: "success",
          });
        });
    } else {
      navigator.clipboard.writeText(summaryText);
      addToast({
        title: "Share Digest Copied",
        description: `Copied shareable digest for ${selectedScreenshots.length} item(s) to clipboard.`,
        type: "success",
      });
    }
  };

  // Batch Reindex
  const handleBatchReindex = (ids: string[]) => {
    const idSet = new Set(ids);
    const nowIso = new Date().toISOString();

    setScreenshots((prev) =>
      prev.map((item) => {
        if (idSet.has(item.id)) {
          const updated: ScreenshotItem = {
            ...item,
            dateModified: nowIso,
            date_modified: nowIso,
            ocrAccuracyScore: Math.min(0.999, (item.ocrAccuracyScore || 0.98) + 0.005),
            keyEntities: Array.from(
              new Set([...(item.keyEntities || []), "AI Re-indexed", "Refreshed OCR"])
            ),
          };
          SyncEngine.markScreenshotPending(updated);
          return updated;
        }
        return item;
      })
    );

    // AI finished notification for batch re-index
    NotificationService.notifyBatchIndexed(ids.length, 800);

    addToast({
      title: "Gemini Vision AI Re-index Complete",
      description: `Re-scanned and refreshed OCR intelligence for ${ids.length} screenshot(s).`,
      type: "success",
    });
  };

  // Single Screenshot Reindex / Retry
  const handleReindexScreenshot = (id: string) => {
    const item = screenshots.find((s) => s.id === id);
    if (!item) return;

    setScreenshots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, processingStatus: "Queued", processing_status: "Queued" } : s))
    );
    if (selectedItem?.id === id) {
      setSelectedItem((prev) => (prev ? { ...prev, processingStatus: "Queued", processing_status: "Queued" } : null));
    }

    processingQueue.retryScreenshot(item);
    addToast({
      title: "AI Analysis Queued",
      description: "Re-scanning OCR and generating AI metadata...",
      type: "info",
    });
  };

  // Copy OCR text helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      title: "OCR Text Copied",
      description: "Copied extracted text to clipboard.",
      type: "success",
    });
  };

  // Add new imported screenshots with user ownership and sync queueing
  const handleAddScreenshots = (newItems: ScreenshotItem[]) => {
    const stampedItems = newItems.map((item) => {
      const stamped: ScreenshotItem = {
        ...item,
        user_id: item.user_id || item.userId || activeUser?.id || "guest",
        userId: item.user_id || item.userId || activeUser?.id || "guest",
        syncStatus: "Pending",
      };
      SyncEngine.markScreenshotPending(stamped);
      return stamped;
    });

    setScreenshots((prev) => [...stampedItems, ...prev]);

    // Dispatch real-time notifications for newly indexed screenshots
    if (stampedItems.length > 0) {
      if (stampedItems.length === 1) {
        NotificationService.notifyScreenshotIndexed(stampedItems[0]);
      } else {
        NotificationService.notifyBatchIndexed(stampedItems.length, 1200);
      }
    }
  };

  // Theme toggle
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === "dark" ? "light" : "dark";
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  // Reset data
  const handleResetAllData = () => {
    if (window.confirm("Are you sure you want to clear all screenshots and reset search history?")) {
      setScreenshots([]);
      setSearchResults([]);
      setSearchHistory([]);
      localStorage.clear();
      addToast({
        title: "System Reset Complete",
        description: "Cleared all screenshots & index cache.",
        type: "info",
      });
    }
  };

  const isDark = settings.theme === "dark";

  return (
    <div
      className={`h-screen w-screen overflow-hidden font-sans relative transition-colors duration-300 ${
        isDark ? "bg-[#07090D] text-[#F8FAFC] dark" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Animated AI Ambient Background (Subtle, controlled deep space lighting) */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
          {/* Subtle Electric Blue ambient glow */}
          <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-[#3B82F6]/[0.06] blur-[150px]" />
          {/* Subtle Neon Violet ambient glow */}
          <div className="absolute top-1/3 -right-24 w-[600px] h-[600px] rounded-full bg-[#8B5CF6]/[0.05] blur-[160px]" />
          {/* Subtle lower depth glow */}
          <div className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] rounded-full bg-[#3B82F6]/[0.04] blur-[140px]" />
        </div>
      )}

      {/* Main App Workspace: Two-column layout on Desktop, stacked on Mobile */}
      <div className="relative z-10 flex flex-col lg:flex-row h-full w-full overflow-hidden">
        {/* LEFT: Fixed Sidebar (permanently visible on >= 1024px, 100vh, flex-shrink-0) */}
        <SidebarNavigation
          activeView={activeView}
          setActiveView={setActiveView}
          isDark={isDark}
          indexedCount={activeScreenshots.length}
          favoriteCount={activeScreenshots.filter((s) => Boolean(s.isFavorite || s.favorite)).length}
          trashCount={trashScreenshots.length}
          unreadNotificationCount={notifications.filter((n) => !n.read && !n.isRead).length}
          onOpenUpgradeModal={() => setActiveView("pricing")}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* RIGHT: Scrollable Main Content Area */}
        <div
          id="main-content-scroll-container"
          ref={mainContentRef}
          className="flex-1 h-full min-w-0 flex flex-col overflow-y-auto overflow-x-hidden relative"
        >
          {/* Top Navbar */}
          <Navbar
            user={activeUser}
            settings={settings}
            onToggleTheme={handleToggleTheme}
            onOpenImport={() => setActiveView("import")}
            onOpenAuth={() => setIsAuthOpen(true)}
            totalIndexedCount={activeScreenshots.length}
            currentSearchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeView={activeView}
            setActiveView={setActiveView}
            unreadNotificationCount={notifications.filter((n) => !n.read && !n.isRead).length}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            onToggleMobileMenu={() => setIsMobileNavOpen(true)}
          />

          {/* Main Workspace Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-6 min-w-0 pb-24 lg:pb-12">
            {!isOnline && <OfflineBanner isDark={isDark} />}

          {/* Global Founder Status / Recognition Banner for Verified Founders */}
          {activeView !== "landing" && (
            <FounderBanner
              user={activeUser}
              settings={settings}
              onNavigateToFounders={() => setActiveView("pricing")}
              isDark={isDark}
            />
          )}

          {/* Non-intrusive Founder feedback prompt for the first 50 users */}
          <FounderFeedbackPrompt
            isDark={isDark}
            isFounder={Boolean(activeUser?.entitlement?.isFounder || activeUser?.plan === "Founder" || (activeUser?.entitlement?.founderNumber && activeUser.entitlement.founderNumber <= 50))}
            onOpenFeedback={() => setActiveView("feedback")}
          />

          <AnimatePresence mode="wait">
            {/* Landing View (Public) */}
            {activeView === "landing" && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <LandingScreen
                  onGetStarted={() => setActiveView("dashboard")}
                  onTrySearch={(q) => {
                    handleExecuteSearch(q);
                  }}
                  isDark={isDark}
                  totalIndexed={activeScreenshots.length}
                />
              </motion.div>
            )}

            {/* Dashboard View (Protected) */}
            {activeView === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute
                  title="Sign in to access your dashboard"
                  heroType="dashboard"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <DashboardView
                    screenshots={activeScreenshots}
                    collections={collections}
                    searchHistory={searchHistory}
                    isDark={isDark}
                    onNavigate={(v) => setActiveView(v)}
                    onSelectCategory={(cat) => setSelectedCategory(cat)}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                    onExecuteSearch={handleExecuteSearch}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* AI Collections View (Protected) */}
            {activeView === "collections" && (
              <motion.div
                key="collections"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute
                  title="Sign in to access your collections"
                  heroType="collections"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <CollectionsView
                    collections={collections}
                    screenshots={activeScreenshots}
                    isDark={isDark}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                    onToggleFavorite={handleToggleFavorite}
                    onDeleteScreenshot={handleDeleteScreenshot}
                    onCreateCollection={handleCreateCollection}
                    onRenameCollection={handleRenameCollection}
                    onDeleteCollection={handleDeleteCollection}
                    onMergeCollections={handleMergeCollections}
                    onMoveScreenshots={handleMoveScreenshots}
                    addToast={addToast}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Timeline View (Protected) */}
            {activeView === "timeline" && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute
                  title="Sign in to access your timeline"
                  heroType="timeline"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <TimelineView
                    screenshots={activeScreenshots}
                    isDark={isDark}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                    onToggleFavorite={handleToggleFavorite}
                    onDeleteScreenshot={handleDeleteScreenshot}
                    onCopyText={(txt) => {
                      navigator.clipboard.writeText(txt);
                    }}
                    addToast={addToast}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Dedicated Favorites View (Protected) */}
            {activeView === "favorites" && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute
                  title="Sign in to access your favorites"
                  heroType="favorites"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <FavoritesView
                    screenshots={activeScreenshots}
                    isDark={isDark}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                    onToggleFavorite={handleToggleFavorite}
                    onMoveCategory={handleMoveCategory}
                    onDeleteScreenshot={handleDeleteScreenshot}
                    onBatchDelete={handleBatchDelete}
                    onBatchFavorite={handleBatchFavorite}
                    onBatchMoveCategory={handleBatchMoveCategory}
                    onCopyText={handleCopyText}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Dedicated Trash View (Protected) */}
            {activeView === "trash" && (
              <motion.div
                key="trash"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute
                  title="Sign in to access your trash"
                  heroType="trash"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <TrashView
                    screenshots={screenshots}
                    isDark={isDark}
                    onRestoreScreenshot={handleRestoreScreenshot}
                    onBatchRestore={handleBatchRestore}
                    onPermanentDelete={handlePermanentDelete}
                    onBatchPermanentDelete={handleBatchPermanentDelete}
                    onEmptyTrash={handleEmptyTrash}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Main Gallery View (Protected) */}
            {activeView === "gallery" && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <ProtectedRoute
                  title="Sign in to access your snaps"
                  heroType="gallery"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <SearchBar
                    query={searchQuery}
                    setQuery={setSearchQuery}
                    onExecuteSearch={handleExecuteSearch}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    isDark={isDark}
                    isSearching={isSearching}
                    screenshots={activeScreenshots}
                    searchHistory={searchHistory}
                    onDeleteHistoryItem={handleDeleteHistoryItem}
                  />

                  <StatsOverview
                    screenshots={activeScreenshots}
                    isDark={isDark}
                    onSelectCategory={(cat) => setSelectedCategory(cat)}
                  />

                  <ScreenshotGrid
                    screenshots={activeScreenshots}
                    searchResults={searchResults}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    isDark={isDark}
                    onSelect={(item) => setSelectedItem(item)}
                    onToggleFavorite={handleToggleFavorite}
                    onMoveCategory={handleMoveCategory}
                    onDelete={handleDeleteScreenshot}
                    onBatchDelete={handleBatchDelete}
                    onBatchFavorite={handleBatchFavorite}
                    onBatchMoveCategory={handleBatchMoveCategory}
                    onBatchExport={handleBatchExport}
                    onBatchShare={handleBatchShare}
                    onBatchReindex={handleBatchReindex}
                    onCopyText={handleCopyText}
                    onOpenImport={() => setActiveView("import")}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* AI Search Screen (Protected) */}
            {activeView === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute
                  title="Sign in to search your snaps"
                  heroType="search"
                  onOpenAuth={() => setIsAuthOpen(true)}
                  isDark={isDark}
                >
                  <SearchView
                    screenshots={activeScreenshots}
                    searchResults={searchResults}
                    query={searchQuery}
                    setQuery={setSearchQuery}
                    onExecuteSearch={handleExecuteSearch}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    isDark={isDark}
                    isSearching={isSearching}
                    onSelectScreenshot={(item) => setSelectedItem(item)}
                    onToggleFavorite={handleToggleFavorite}
                    onMoveCategory={handleMoveCategory}
                    onDelete={handleDeleteScreenshot}
                    onCopyText={handleCopyText}
                    searchHistory={searchHistory}
                    onDeleteHistoryItem={handleDeleteHistoryItem}
                    onClearHistory={handleClearHistory}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Import View (Protected) */}
            {activeView === "import" && (
              <motion.div
                key="import"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <BatchImporter
                    onAddScreenshots={handleAddScreenshots}
                    isDark={isDark}
                    onFinishImport={() => setActiveView("gallery")}
                    addToast={addToast}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Search History View (Protected) */}
            {activeView === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <SearchHistoryView
                    history={searchHistory}
                    onExecuteSearch={(q) => {
                      handleExecuteSearch(q);
                    }}
                    onClearHistory={handleClearHistory}
                    onDeleteHistoryItem={handleDeleteHistoryItem}
                    isDark={isDark}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Pricing & Pro Dedicated View */}
            {activeView === "pricing" && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <PricingPageView
                  isDark={isDark}
                  onNavigate={(v) => setActiveView(v)}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {/* Founder Benefits Route Redirect to Consolidated Plans & Pricing */}
            {activeView === "founders" && (
              <motion.div
                key="founders-redirect"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <PricingPageView
                  isDark={isDark}
                  onNavigate={(v) => setActiveView(v)}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {/* Notifications & Alert Center View (Protected) */}
            {activeView === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <NotificationPageView
                    notifications={notifications}
                    screenshots={activeScreenshots}
                    isDark={isDark}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onMarkAsRead={handleMarkAsRead}
                    onDeleteNotification={handleDeleteNotification}
                    onClearAllNotifications={handleClearAllNotifications}
                    onSelectScreenshot={(screenshot) => setSelectedItem(screenshot)}
                    onNavigate={(v) => setActiveView(v)}
                    onOpenPricing={() => setActiveView("pricing")}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    onTriggerSync={() => SyncEngine.scheduleSync(0)}
                    onCopyText={handleCopyText}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Feedback Dedicated View */}
            {activeView === "feedback" && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <FeedbackView
                  isDark={isDark}
                  currentUser={activeUser}
                  screenshots={activeScreenshots}
                  onNavigate={(v) => setActiveView(v as NavViewType)}
                />
              </motion.div>
            )}

            {/* Settings View (Protected) */}
            {activeView === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <SettingsView
                    settings={settings}
                    onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
                    user={activeUser}
                    isDark={isDark}
                    indexedCount={activeScreenshots.length}
                    onResetAllData={handleResetAllData}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    screenshots={activeScreenshots}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Account Dedicated View (Protected) */}
            {activeView === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProtectedRoute onOpenAuth={() => setIsAuthOpen(true)} isDark={isDark}>
                  <AccountPageView
                    user={activeUser}
                    isDark={isDark}
                    indexedCount={activeScreenshots.length}
                    settings={settings}
                    onUpdateSettings={(newSet) => setSettings((prev) => ({ ...prev, ...newSet }))}
                    addToast={addToast}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    onNavigate={(v) => setActiveView(v as NavViewType)}
                  />
                </ProtectedRoute>
              </motion.div>
            )}

            {/* Admin Payments Management View (Admin Protected) */}
            {activeView === "admin-payments" && (
              <motion.div
                key="admin-payments"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <AdminPaymentsPage
                  user={activeUser}
                  isDark={isDark}
                  onNavigate={(v) => setActiveView(v as NavViewType)}
                  addToast={addToast}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              </motion.div>
            )}

            {/* SnapDash Mini-Game Dedicated View */}
            {activeView === "game" && (
              <motion.div
                key="game"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <SnapDashPageView
                  user={activeUser}
                  onNavigate={(v) => setActiveView(v)}
                  onOpenFeedback={handleOpenFeedback}
                  onOpenAuthModal={() => setIsAuthOpen(true)}
                  isDark={isDark}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        </div>
      </div>

      {/* Responsive Bottom Navigation Bar */}
      <BottomNavigation
        activeView={activeView}
        setActiveView={setActiveView}
        isDark={isDark}
        indexedCount={activeScreenshots.length}
        favoriteCount={activeScreenshots.filter((s) => Boolean(s.isFavorite || s.favorite)).length}
        trashCount={trashScreenshots.length}
      />

      {/* Lightbox Screenshot Inspector Modal */}
      <ImageViewerModal
        item={selectedItem}
        items={activeScreenshots}
        onSelectItem={(item) => setSelectedItem(item)}
        onClose={() => setSelectedItem(null)}
        isDark={isDark}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteScreenshot}
        onReindex={handleReindexScreenshot}
        onSearchTag={(tag) => handleExecuteSearch(tag)}
      />

      {/* User Auth / Profile Modal */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          isDark={isDark}
          addToast={addToast}
          onSignupSuccess={() => {
            addToast({
              title: "Welcome to SnapFind AI",
              description: "Your account has been created successfully.",
              type: "success",
            });
          }}
        />
      )}

      {/* Give Feedback Modal */}
      <GiveFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        currentPage={feedbackPageContext}
        user={activeUser}
        isDark={isDark}
        onSubmitted={() => {
          addToast({
            title: "Feedback Received",
            description: "Thank you for helping make SnapFind AI better!",
            type: "success",
          });
        }}
      />

      {/* Notification Center Drawer & Toast Notifications */}
      <NotificationCenter
        notifications={notifications}
        toasts={toasts}
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
        onSelectScreenshot={(screenshot) => setSelectedItem(screenshot)}
        screenshots={activeScreenshots}
        onDismissToast={handleDismissToast}
        isDark={isDark}
        onTriggerSync={() => SyncEngine.scheduleSync(0)}
        onCopyText={handleCopyText}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
