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
        } w-full rounded-xl text-xs font-medium transition-colors duration-150 cursor-pointer ${
          active
            ? "bg-[#1E2226] text-[#00D4FF] font-semibold border border-[#30363D]"
            : "text-[#A7B0BA] hover:text-[#F5F7FA] hover:bg-[#1E2226]"
        }`}
      >
        <div className={`flex items-center ${collapsedMode ? "justify-center" : "gap-3"} min-w-0`}>
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              active ? "text-[#00D4FF]" : "text-[#A7B0BA] group-hover:text-[#F5F7FA]"
            }`}
          />
          {!collapsedMode && <span className="truncate">{item.label}</span>}
        </div>

        {/* Count badge for expanded mode */}
        {!collapsedMode && item.count !== undefined && item.count > 0 && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
              item.id === "notifications"
                ? "bg-[#F59E0B]/15 text-[#F59E0B] font-semibold border border-[#F59E0B]/30"
                : "bg-[#101214] border border-[#30363D] text-[#A7B0BA]"
            }`}
          >
            {item.count}
          </span>
        )}

        {/* Dot indicator for collapsed mode */}
        {collapsedMode && item.count !== undefined && item.count > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
              item.id === "notifications" ? "bg-[#F59E0B]" : "bg-[#00D4FF]"
            }`}
          />
        )}

        {/* Left active border indicator */}
        {active && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-[#00D4FF]" />
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
        } bg-[#171A1D] border-[#30363D] text-[#F5F7FA]`}
      >
        {/* Top Header / Logo & Collapse Toggle */}
        <div className="shrink-0 space-y-2 pb-2">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "justify-between"
            } px-1 pb-2 border-b border-[#30363D]`}
          >
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => handleNavClick("dashboard")}
                className="flex items-center gap-2 group cursor-pointer text-left"
              >
                <SnapFindLogo className="w-7 h-7 rounded-lg object-contain border border-[#30363D] bg-[#101214]" />
                <div className="flex items-center">
                  <span className="font-bold text-sm tracking-tight text-[#F5F7FA]">
                    Snap<span className="text-[#00D4FF]">Find</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25 ml-1.5">
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
              className="p-1.5 rounded-lg text-[#A7B0BA] hover:text-[#F5F7FA] hover:bg-[#1E2226] transition-colors cursor-pointer"
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
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider uppercase text-[#6B7280]">
                Navigation
              </div>
            )}
            {topNavItems.map((item) => renderNavButton(item, isCollapsed))}
          </div>

          {/* Main Business Section (Plans & Pricing) */}
          <div className="pt-2 border-t border-[#30363D]">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider uppercase text-[#6B7280]">
                Plans &amp; Pricing
              </div>
            )}

            <div className="space-y-1">
              {businessItems.map((item) => renderNavButton(item, isCollapsed))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Section */}
        <div className="shrink-0 pt-2 border-t border-[#30363D]">
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider uppercase text-[#6B7280]">
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
              className="relative w-72 max-w-[85vw] h-full flex flex-col justify-between p-4 shadow-2xl overflow-y-auto select-none bg-[#171A1D] text-[#F5F7FA] border-r border-[#30363D]"
            >
              <div className="space-y-5">
                {/* Header with Logo & Close Button */}
                <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
                  <div className="flex items-center gap-2.5">
                    <SnapFindLogo className="w-7 h-7 rounded-xl object-contain border border-[#30363D] bg-[#101214]" />
                    <span className="font-bold text-base tracking-tight text-[#F5F7FA]">
                      Snap<span className="text-[#00D4FF]">Find</span>
                    </span>
                  </div>

                  <button
                    id="mobile-drawer-close-btn"
                    type="button"
                    onClick={onCloseMobile}
                    className="p-1.5 rounded-xl text-[#A7B0BA] hover:text-[#F5F7FA] hover:bg-[#1E2226] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Navigation */}
                <div className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider uppercase text-[#6B7280]">
                    Main Navigation
                  </div>
                  {topNavItems.map((item) => renderNavButton(item, false))}
                </div>

                {/* Business Section */}
                <div className="pt-2 border-t border-[#30363D] space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider uppercase text-[#6B7280]">
                    Plans &amp; Pricing
                  </div>
                  {businessItems.map((item) => renderNavButton(item, false))}
                </div>

                {/* Bottom Navigation */}
                <div className="pt-2 border-t border-[#30363D] space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider uppercase text-[#6B7280]">
                    System & Account
                  </div>
                  {bottomItems.map((item) => renderNavButton(item, false))}
                </div>
              </div>

              {/* User summary at bottom of drawer */}
              {user && (
                <div className="pt-4 mt-6 border-t border-[#30363D] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-bold text-[10px]">
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                    <span className="truncate text-[#A7B0BA]">{user.name || "User"}</span>
                  </div>
                  {isPro && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30">
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
