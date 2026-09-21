import React, { useEffect, useState } from "react";
import {
  UploadCloud,
  User,
  Bell,
  RefreshCw,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { SnapFindLogo } from "./SnapFindLogo";
import { UserProfile, AppSettings } from "../types";
import { NavViewType } from "./BottomNavigation";
import { SyncEngine, SyncState } from "../services/syncEngine";
import { ProBadge, FounderBadge } from "./subscription/UpgradePrompt";

interface NavbarProps {
  user: UserProfile;
  settings: AppSettings;
  onToggleTheme: () => void;
  onOpenImport: () => void;
  onOpenAuth: () => void;
  totalIndexedCount: number;
  currentSearchQuery: string;
  onSearchChange: (val: string) => void;
  activeView: NavViewType;
  setActiveView: (view: NavViewType) => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  onOpenImport,
  onOpenAuth,
  activeView,
  setActiveView,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onToggleMobileMenu,
}) => {
  const isDark = settings.theme === "dark";
  const [avatarError, setAvatarError] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(() => SyncEngine.getState());

  useEffect(() => {
    setAvatarError(false);
  }, [user.avatarUrl]);

  useEffect(() => {
    const unsubscribe = SyncEngine.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors select-none ${
        isDark
          ? "bg-[#0D1117]/90 border-white/[0.08] text-[#F8FAFC]"
          : "bg-white/90 border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
        {/* Left: Hamburger (Mobile) + Brand Logo & Title */}
        <div className="flex items-center gap-2">
          {onToggleMobileMenu && (
            <button
              id="mobile-nav-toggle-btn"
              type="button"
              onClick={onToggleMobileMenu}
              title="Open Navigation Menu"
              className="lg:hidden p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setActiveView("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <SnapFindLogo
              className="w-8 h-8 rounded-xl object-contain border border-white/[0.08] bg-[#07090D] shadow-sm group-hover:border-[#CCFF00]/40 transition-colors"
            />
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Snap<span className="bg-gradient-to-r from-[#CCFF00] to-[#00FF66] bg-clip-text text-transparent">Find</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20 ml-1">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync indicator */}
          {syncState.isSyncing && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/20">
              <RefreshCw className="w-3 h-3 animate-spin text-[#00FF66]" />
              <span>Syncing</span>
            </div>
          )}
          {syncState.lastError && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-[#FF6600] bg-[#FF6600]/10 border border-[#FF6600]/20">
              <AlertTriangle className="w-3 h-3" />
              <span>Sync Issue</span>
            </div>
          )}

          {/* Import screenshots button */}
          <button
            onClick={onOpenImport}
            id="import-btn-header"
            type="button"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl bg-[#CCFF00] hover:bg-[#D9FF33] active:scale-98 text-[#07090D] text-xs font-bold shadow-[0_0_15px_rgba(204,255,0,0.25)] transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            id="notification-center-btn"
            type="button"
            title="Notifications"
            className="relative p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6600] shadow-[0_0_8px_rgba(255,102,0,0.8)] ring-2 ring-[#0D1117]" />
            )}
          </button>

          {/* User Profile / Auth */}
          <button
            onClick={onOpenAuth}
            id="user-profile-btn"
            type="button"
            title={user.isLoggedIn ? user.name : "Sign In"}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 bg-[#121821] hover:bg-[#182230] transition-all cursor-pointer text-xs font-medium text-[#F8FAFC]"
          >
            {user.avatarUrl && user.isLoggedIn && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-5 h-5 rounded-lg object-cover shrink-0"
              />
            ) : (
              <User className="w-4 h-4 text-[#94A3B8] shrink-0" />
            )}
            <span className="hidden sm:inline truncate max-w-[100px]">
              {user.isLoggedIn ? user.name : "Sign In"}
            </span>
            {user.entitlement?.isFounder ? (
              <FounderBadge founderNumber={user.entitlement.founderNumber} size="xs" />
            ) : user.entitlement?.plan === "pro" ? (
              <ProBadge size="xs" />
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
