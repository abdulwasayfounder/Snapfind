import React, { useState } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Search,
  Layers,
  Heart,
  UploadCloud,
  CreditCard,
  Crown,
  Sparkles,
  Bell,
  Settings,
  User,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  X,
  ShieldCheck,
  Gamepad2,
  MessageSquarePlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NavViewType } from "./BottomNavigation";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  activeView: NavViewType;
  setActiveView: (view: NavViewType) => void;
  isDark: boolean;
  indexedCount: number;
  favoriteCount: number;
  trashCount?: number;
  unreadNotificationCount?: number;
  onOpenUpgradeModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarNavigation: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isDark,
  indexedCount,
  favoriteCount,
  trashCount = 0,
  unreadNotificationCount = 0,
  onOpenUpgradeModal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { isPro, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("snapfind_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("snapfind_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const handleUpgradeClick = () => {
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal();
    } else {
      window.dispatchEvent(
        new CustomEvent("snapfind_open_pro_modal", {
          detail: { feature: "SnapFind Pro Unlimited Screenshots & AI Vision" },
        })
      );
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleNavClick = (view: NavViewType) => {
    setActiveView(view);
    if (onCloseMobile) onCloseMobile();
  };

  // Top navigation items
  const topNavItems = [
    {
      id: "dashboard" as NavViewType,
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: activeView === "dashboard" || activeView === "landing" || activeView === "timeline",
    },
    {
      id: "gallery" as NavViewType,
      label: "Gallery",
      icon: ImageIcon,
      count: indexedCount,
      isActive: activeView === "gallery",
    },
    {
      id: "search" as NavViewType,
      label: "Search",
      icon: Search,
      isActive: activeView === "search" || activeView === "history",
    },
    {
      id: "collections" as NavViewType,
      label: "Collections",
      icon: Layers,
      isActive: activeView === "collections",
    },
    {
      id: "favorites" as NavViewType,
      label: "Favorites",
      icon: Heart,
      count: favoriteCount,
      isActive: activeView === "favorites",
    },
    {
      id: "trash" as NavViewType,
      label: "Trash",
      icon: Trash2,
      count: trashCount,
      isActive: activeView === "trash",
    },
    {
      id: "import" as NavViewType,
      label: "Import",
      icon: UploadCloud,
      isActive: activeView === "import",
    },
    {
      id: "game" as NavViewType,
      label: "SnapDash Mini-Game",
      icon: Gamepad2,
      isActive: activeView === "game",
    },
  ];

  // Business items (Plans & Pricing)
  const businessItems = [
    {
      id: "pricing" as NavViewType,
      label: "Plans & Pricing",
      icon: CreditCard,
      isActive: activeView === "pricing" || activeView === "founders",
    },
  ];

  const isAdmin =
    user?.email?.toLowerCase().trim() === "ash.mary.2006@gmail.com" ||
    user?.role === "admin" ||
    (user as any)?.user_metadata?.role === "admin" ||
    (user as any)?.app_metadata?.role === "admin";

  // Bottom items (Notifications, Settings, Account, Admin, Feedback)
  const bottomItems = [
    ...(isAdmin
      ? [
          {
            id: "admin-payments" as NavViewType,
            label: "Admin Payments",
            icon: ShieldCheck,
            isActive: activeView === "admin-payments",
          },
        ]
      : []),
    {
      id: "feedback" as NavViewType,
      label: "Give Feedback",
      icon: MessageSquarePlus,
      isActive: activeView === "feedback",
    },
    {
      id: "notifications" as NavViewType,
      label: "Notifications",
      icon: Bell,
      count: unreadNotificationCount,
      isActive: activeView === "notifications",
    },
    {
      id: "settings" as NavViewType,
      label: "Settings",
      icon: Settings,
      isActive: activeView === "settings",
    },
    {
      id: "account" as NavViewType,
      label: "Account",
      icon: User,
      isActive: activeView === "account",
    },
  ];

  // Render a navigation button
  const renderNavButton = (
    item: {
      id: NavViewType;
      label: string;
      icon: any;
      count?: number;
      isActive: boolean;
    },
    collapsedMode: boolean
  ) => {
    const Icon = item.icon;
    const active = item.isActive;

    return (
      <button
        key={item.id}
        id={`sidebar-nav-${item.id}`}
        type="button"
        title={collapsedMode ? item.label : undefined}
        onClick={() => handleNavClick(item.id)}
        className={`group relative flex items-center ${
          collapsedMode ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
        } w-full rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
          active
            ? "bg-[#CCFF00]/10 text-[#CCFF00] font-semibold border border-[#CCFF00]/20"
            : isDark
            ? "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#182230]"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        <div className={`flex items-center ${collapsedMode ? "justify-center" : "gap-3"} min-w-0`}>
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              active
                ? "text-[#CCFF00]"
                : isDark
                ? "text-[#94A3B8] group-hover:text-[#F8FAFC]"
                : "text-slate-500 group-hover:text-slate-800"
            }`}
          />
          {!collapsedMode && <span className="truncate">{item.label}</span>}
        </div>

        {/* Count badge for expanded mode */}
        {!collapsedMode && item.count !== undefined && item.count > 0 && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
              item.id === "notifications"
                ? "bg-[#FF6600]/20 text-[#FF6600] font-bold shadow-[0_0_8px_rgba(255,102,0,0.3)]"
                : isDark
                ? "bg-white/[0.06] text-[#94A3B8]"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {item.count}
          </span>
        )}

        {/* Dot indicator for collapsed mode if there are unread/counts */}
        {collapsedMode && item.count !== undefined && item.count > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              item.id === "notifications"
                ? "bg-[#FF6600] shadow-[0_0_6px_rgba(255,102,0,0.8)]"
                : "bg-[#CCFF00]"
            }`}
          />
        )}

        {/* Left active border indicator */}
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* DESKTOP COLLAPSIBLE SIDEBAR */}
      <aside
        id="desktop-sidebar"
        className={`shrink-0 hidden lg:flex flex-col border-r h-screen overflow-hidden p-3 transition-[width] duration-200 select-none z-30 ${
          isCollapsed ? "w-16" : "w-60"
        } ${
          isDark
            ? "bg-[#0D1117] border-white/[0.08] text-[#F8FAFC]"
            : "bg-slate-50 border-slate-200 text-slate-800"
        }`}
      >
        {/* Top Header / Logo & Collapse Toggle (Fixed at top) */}
        <div className="shrink-0 space-y-2 pb-2">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "justify-between"
            } px-1 pb-2 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200/80"}`}
          >
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => handleNavClick("dashboard")}
                className="flex items-center gap-2 group cursor-pointer text-left"
              >
                <SnapFindLogo className="w-7 h-7 rounded-lg object-contain border border-white/[0.08] bg-[#07090D]" />
                <div className="flex items-center">
                  <span className="font-extrabold text-sm tracking-tight text-white">
                    Snap<span className="bg-gradient-to-r from-[#CCFF00] to-[#00FF66] bg-clip-text text-transparent">Find</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20 ml-1.5">
                    AI
                  </span>
                </div>
              </button>
            )}

            <button
              id="sidebar-toggle-collapse"
              type="button"
              onClick={toggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`p-1.5 rounded-lg text-[#94A3B8] hover:text-white transition-colors cursor-pointer ${
                isDark ? "hover:bg-white/5" : "hover:bg-slate-200"
              }`}
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Middle Navigation Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-1 space-y-4 pr-0.5">
          {/* Top Primary Navigation Group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
                Navigation
              </div>
            )}
            {topNavItems.map((item) => renderNavButton(item, isCollapsed))}
          </div>

          {/* Main Business Section (Plans & Pricing) */}
          <div className={`pt-2 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200/80"}`}>
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
                Plans &amp; Pricing
              </div>
            )}

            <div className="space-y-1">
              {businessItems.map((item) => renderNavButton(item, isCollapsed))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Section (Notifications, Settings, Account) */}
        <div className={`shrink-0 pt-2 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200/80"}`}>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
              System
            </div>
          )}
          <div className="space-y-1">
            {bottomItems.map((item) => renderNavButton(item, isCollapsed))}
          </div>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER NAVIGATION DRAWER */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            />

            {/* Slide-over Content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={`relative w-72 max-w-[85vw] h-full flex flex-col justify-between p-4 shadow-2xl overflow-y-auto select-none ${
                isDark ? "bg-[#0D1117] text-[#F8FAFC] border-r border-white/[0.08]" : "bg-white text-slate-800 border-r border-slate-200"
              }`}
            >
              <div className="space-y-5">
                {/* Header with Logo & Close Button */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <SnapFindLogo className="w-7 h-7 rounded-xl object-contain border border-white/[0.08] bg-[#07090D]" />
                    <span className="font-extrabold text-base tracking-tight text-white">
                      Snap<span className="bg-gradient-to-r from-[#CCFF00] to-[#00FF66] bg-clip-text text-transparent">Find</span>
                    </span>
                  </div>

                  <button
                    id="mobile-drawer-close-btn"
                    type="button"
                    onClick={onCloseMobile}
                    className="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Navigation */}
                <div className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
                    Main Navigation
                  </div>
                  {topNavItems.map((item) => renderNavButton(item, false))}
                </div>

                {/* Business Section */}
                <div className="pt-2 border-t border-white/[0.08] space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
                    Plans &amp; Pricing
                  </div>
                  {businessItems.map((item) => renderNavButton(item, false))}
                </div>

                {/* Bottom Navigation */}
                <div className="pt-2 border-t border-white/[0.08] space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-[#64748B]">
                    System & Account
                  </div>
                  {bottomItems.map((item) => renderNavButton(item, false))}
                </div>
              </div>

              {/* User summary at bottom of drawer */}
              {user && (
                <div className="pt-4 mt-6 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-[#CCFF00]/20 text-[#CCFF00] flex items-center justify-center font-bold text-[10px]">
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                    <span className="truncate text-slate-300">{user.name || "SnapFind User"}</span>
                  </div>
                  {isPro && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30">
                      PRO
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarNavigation;
