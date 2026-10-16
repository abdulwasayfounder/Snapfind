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
      className="sticky top-0 z-40 border-b select-none bg-[#171A1D] border-[#30363D] text-[#F5F7FA]"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Left: Hamburger (Mobile) + Brand Logo & Title */}
        <div className="flex items-center gap-2">
          {onToggleMobileMenu && (
            <button
              id="mobile-nav-toggle-btn"
              type="button"
              onClick={onToggleMobileMenu}
              title="Open Navigation Menu"
              className="lg:hidden p-2 rounded-xl text-[#A7B0BA] hover:text-[#F5F7FA] hover:bg-[#1E2226] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setActiveView("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <SnapFindLogo
              className="w-8 h-8 rounded-xl object-contain border border-[#30363D] bg-[#101214] transition-colors group-hover:border-[#00D4FF]"
            />
            <div className="flex items-center gap-1">
              <span className="font-bold text-base sm:text-lg tracking-tight text-[#F5F7FA]">
                Snap<span className="text-[#00D4FF]">Find</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25 ml-1">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync indicator */}
          {syncState.isSyncing && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/20">
              <RefreshCw className="w-3 h-3 animate-spin text-[#00D4FF]" />
              <span>Syncing</span>
            </div>
          )}
          {syncState.lastError && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20">
              <AlertTriangle className="w-3 h-3" />
              <span>Sync Issue</span>
            </div>
          )}

          {/* Import screenshots button */}
          <button
            onClick={onOpenImport}
            id="import-btn-header"
            type="button"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl bg-[#00D4FF] hover:bg-[#00B8D9] active:scale-98 text-[#101214] text-xs font-semibold transition-colors cursor-pointer"
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
            className="relative p-2 rounded-xl text-[#A7B0BA] hover:text-[#F5F7FA] hover:bg-[#1E2226] border border-transparent hover:border-[#30363D] transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-[#171A1D]" />
            )}
          </button>

          {/* User Profile / Auth */}
          <button
            onClick={onOpenAuth}
            id="user-profile-btn"
            type="button"
            title={user.isLoggedIn ? user.name : "Sign In"}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl border border-[#30363D] hover:border-[#00D4FF]/40 bg-[#1E2226] hover:bg-[#262C32] transition-colors cursor-pointer text-xs font-medium text-[#F5F7FA]"
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
              <User className="w-4 h-4 text-[#A7B0BA] shrink-0" />
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
