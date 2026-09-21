import React from "react";
import {
  Home,
  Grid,
  Search,
  Layers,
  User,
} from "lucide-react";
import { motion } from "motion/react";

export type NavViewType =
  | "landing"
  | "dashboard"
  | "collections"
  | "timeline"
  | "favorites"
  | "trash"
  | "gallery"
  | "search"
  | "import"
  | "history"
  | "settings"
  | "pricing"
  | "founders"
  | "account"
  | "notifications"
  | "feedback"
  | "admin-payments"
  | "game";

interface BottomNavigationProps {
  activeView: NavViewType;
  setActiveView: (view: NavViewType) => void;
  isDark: boolean;
  indexedCount: number;
  favoriteCount?: number;
  trashCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeView,
  setActiveView,
  isDark,
}) => {
  const mobileNavItems: {
    id: NavViewType;
    label: string;
    icon: any;
    isActive: boolean;
  }[] = [
    {
      id: "dashboard",
      label: "Home",
      icon: Home,
      isActive: activeView === "dashboard" || activeView === "landing" || activeView === "timeline",
    },
    {
      id: "gallery",
      label: "Gallery",
      icon: Grid,
      isActive: activeView === "gallery" || activeView === "favorites" || activeView === "trash",
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      isActive: activeView === "search" || activeView === "history",
    },
    {
      id: "collections",
      label: "Collections",
      icon: Layers,
      isActive: activeView === "collections",
    },
    {
      id: "settings",
      label: "Profile",
      icon: User,
      isActive: activeView === "settings" || activeView === "pricing" || activeView === "notifications" || activeView === "feedback",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden select-none">
      <div
        className={`px-3 py-2 border-t backdrop-blur-xl flex items-center justify-around transition-colors ${
          isDark
            ? "bg-[#0D1117]/95 border-white/[0.08] text-[#F8FAFC]"
            : "bg-white/95 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] relative transition-colors cursor-pointer ${
                active ? "text-[#3B82F6] font-semibold" : "text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? "scale-105" : ""}`} />
              <span className="text-[10px] tracking-tight mt-1 font-medium">
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#3B82F6] shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
