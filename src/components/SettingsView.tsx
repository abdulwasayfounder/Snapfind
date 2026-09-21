import React, { useState, useEffect, useMemo } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  Settings,
  Sliders,
  Palette,
  Bell,
  HardDrive,
  Cpu,
  Sparkles,
  Shield,
  User,
  Info,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Lock,
  Mail,
  Zap,
  Key,
  ShieldCheck,
  Check,
  ChevronRight,
  Database,
  Cloud,
  FileText,
  Clock,
  Layers,
  Search,
  SlidersHorizontal,
  FolderOpen,
  Volume2,
  VolumeX,
  Smartphone,
  Flame,
  Globe,
  ExternalLink,
  Download,
  UploadCloud,
  Copy,
  Activity,
  Terminal,
  Fingerprint,
  MessageSquarePlus,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppSettings, UserProfile, ScreenshotItem } from "../types";
import { useAuth } from "../context/AuthContext";
import { SyncEngine, SyncState } from "../services/syncEngine";
import { AccountPageView } from "./AccountPageView";
import { FeedbackView } from "./FeedbackView";
import { YourUsageCard } from "./subscription/YourUsageCard";
import { PageHeroHeader } from "./PageHeroHeader";

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "notifications"
  | "storage"
  | "privacy"
  | "account"
  | "founder"
  | "feedback"
  | "about";

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  user: UserProfile;
  isDark: boolean;
  indexedCount: number;
  onResetAllData: () => void;
  onOpenAuth?: () => void;
  screenshots?: ScreenshotItem[];
  initialSection?: SettingsSectionId;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  user,
  isDark,
  indexedCount,
  onResetAllData,
  onOpenAuth,
  screenshots = [],
  initialSection = "general",
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const { updateName, changePassword, resetPassword, deleteAccount } = useAuth();

  // Account State
  const [nameInput, setNameInput] = useState(user.name || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reset password email state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete account confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Clear cache confirmation
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>(() => SyncEngine.getState());

  // Copy success indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    return SyncEngine.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    setNameMsg(null);
    const res = await updateName(nameInput);
    setNameLoading(false);
    if (res.error) {
      setNameMsg({ type: "error", text: res.error });
    } else {
      setNameMsg({ type: "success", text: "Display name updated successfully!" });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPassLoading(true);
    setPassMsg(null);
    const res = await changePassword(newPassword);
    setPassLoading(false);
    if (res.error) {
      setPassMsg({ type: "error", text: res.error });
    } else {
      setPassMsg({ type: "success", text: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSendResetEmail = async () => {
    setResetLoading(true);
    setResetMsg(null);
    const res = await resetPassword(user.email);
    setResetLoading(false);
    if (res.error) {
      setResetMsg({ type: "error", text: res.error });
    } else {
      setResetMsg({ type: "success", text: `Password recovery link sent to ${user.email}` });
    }
  };

  const handleDeleteAccountConfirm = async () => {
    setDeleteLoading(true);
    await deleteAccount();
    setDeleteLoading(false);
    setShowDeleteModal(false);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Nav Sections Definition
  const sections: {
    id: SettingsSectionId;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    badge?: string;
  }[] = [
    {
      id: "general",
      label: "General",
      description: "Startup, confirmation prompts, language",
      icon: <Sliders className="w-4 h-4" />,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Theme, accents, layout density & animations",
      icon: <Palette className="w-4 h-4" />,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Real-time alerts, OCR & AI updates, sounds",
      icon: <Bell className="w-4 h-4" />,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "storage",
      label: "Storage",
      description: "SQLite cache, sync state & cloud quota",
      icon: <HardDrive className="w-4 h-4" />,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "privacy",
      label: "Privacy",
      description: "Local encryption, telemetry, zero-leak policy",
      icon: <Shield className="w-4 h-4" />,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    },
    {
      id: "account",
      label: "Account",
      description: "Profile, password recovery & security",
      icon: <User className="w-4 h-4" />,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    ...(user.entitlement?.isFounder || user.plan === "Founder"
      ? [
          {
            id: "founder" as SettingsSectionId,
            label: "Founder",
            description: "Founder recognition banner & crown tag display",
            icon: <Crown className="w-4 h-4 text-amber-400" />,
            color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
            badge: user.entitlement?.founderNumber ? `#${user.entitlement.founderNumber}` : "VIP",
          },
        ]
      : []),
    {
      id: "feedback",
      label: "Feedback",
      description: "Bug reports, feature requests & product feedback",
      icon: <MessageSquarePlus className="w-4 h-4" />,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "about",
      label: "About",
      description: "Version, system status & build metadata",
      icon: <Info className="w-4 h-4" />,
      color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
      badge: "v2.4",
    },
  ];

  // Filter sections by search query if present
  const filteredSections = useMemo(() => {
    if (!searchFilter.trim()) return sections;
    const q = searchFilter.toLowerCase();
    return sections.filter(
      (s) => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [sections, searchFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top 3D Header Banner */}
      <PageHeroHeader
        type="settings"
        title="Workspace Preferences"
        subtitle="Configure system defaults, dark/light appearance, Gemini AI models, Supabase cloud sync, and security encryption."
        isDark={isDark}
        actions={
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Auto-Saved Local & Cloud</span>
          </div>
        }
      />

      {/* Main Settings Layout: Side Navigation + Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* Mobile Horizontal Section Tabs Bar */}
        <div className="lg:hidden w-full overflow-x-auto scrollbar-none pb-2">
          <div className="flex items-center gap-2">
            {sections.map((sec) => {
              const isSelected = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : isDark
                      ? "bg-[#18181B] border border-white/10 text-slate-400 hover:text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="shrink-0">{sec.icon}</div>
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Left Navigation Sidebar (Desktop) */}
        <div
          className={`hidden lg:block lg:col-span-4 p-3 rounded-3xl border space-y-2 sticky top-24 min-w-0 ${
            isDark ? "bg-[#0D1117] border-white/[0.08] backdrop-blur-xl" : "bg-white border-slate-200"
          }`}
        >
          {/* Quick Search inside Settings */}
          <div className="relative px-1 pt-1 pb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search settings..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-all ${
                isDark
                  ? "bg-[#121821] border-white/[0.08] text-white placeholder-slate-500 focus:border-[#3B82F6] focus:shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            {filteredSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? isDark
                        ? "bg-[#3B82F6]/15 border-[#3B82F6]/40 text-white shadow-md shadow-blue-950/30"
                        : "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
                      : isDark
                      ? "border-transparent text-slate-300 hover:bg-[#18202B] hover:border-white/[0.05]"
                      : "border-transparent text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${section.color}`}
                    >
                      {section.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{section.label}</span>
                        {section.badge && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 text-[9px] font-mono font-semibold">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? "text-blue-400 translate-x-0.5" : "text-slate-500 opacity-40 group-hover:opacity-100"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Quick Storage Badge in Sidebar */}
          <div className="pt-3 px-3 border-t border-white/5 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Indexed Screenshots</span>
              </span>
              <span className="font-mono font-bold text-slate-200">{indexedCount} items</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(5, (indexedCount / 50) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Dynamic Settings Panels */}
        <div className="w-full lg:col-span-8 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="space-y-6"
            >
              {/* SECTION 1: GENERAL */}
              {activeSection === "general" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<Sliders className="w-5 h-5 text-blue-400" />}
                    title="General Application Preferences"
                    description="Configure system startup behavior, confirmations, and language localization."
                  >
                    <div className="space-y-4 text-xs">
                      {/* Language Selection */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <div className="font-semibold text-slate-200">Interface Language</div>
                          <div className="text-[11px] text-slate-400">Select language for menus and buttons</div>
                        </div>
                        <select
                          value={settings.language || "en-US"}
                          onChange={(e) => onUpdateSettings({ language: e.target.value })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                            isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                          }`}
                        >
                          <option value="en-US">English (US)</option>
                          <option value="es-ES">Español</option>
                          <option value="fr-FR">Français</option>
                          <option value="de-DE">Deutsch</option>
                          <option value="ja-JP">日本語</option>
                          <option value="zh-CN">中文 (简体)</option>
                        </select>
                      </div>

                      {/* Auto Launch Toggle */}
                      <ToggleRow
                        title="Launch on System Startup"
                        description="Automatically launch SnapFind in background on device boot"
                        checked={settings.autoLaunchAtStartup ?? true}
                        onChange={(v) => onUpdateSettings({ autoLaunchAtStartup: v })}
                        isDark={isDark}
                      />

                      {/* Confirm Before Delete */}
                      <ToggleRow
                        title="Confirmation Prompts"
                        description="Show safety confirmation dialog before moving items to trash"
                        checked={settings.confirmBeforeDelete ?? true}
                        onChange={(v) => onUpdateSettings({ confirmBeforeDelete: v })}
                        isDark={isDark}
                      />

                      {/* Default Landing View */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <div className="font-semibold text-slate-200">Default Startup View</div>
                          <div className="text-[11px] text-slate-400">Choose default tab shown when opening the app</div>
                        </div>
                        <select
                          value={settings.defaultView || "gallery"}
                          onChange={(e) => onUpdateSettings({ defaultView: e.target.value })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                            isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                          }`}
                        >
                          <option value="gallery">Gallery Stream</option>
                          <option value="search">AI Search</option>
                          <option value="favorites">Starred Documents</option>
                          <option value="history">Search History</option>
                        </select>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* SECTION 2: APPEARANCE */}
              {activeSection === "appearance" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<Palette className="w-5 h-5 text-indigo-400" />}
                    title="Appearance & Theme"
                    description="Customize visual themes, color accents, layout density, and animations."
                  >
                    <div className="space-y-5 text-xs">
                      {/* Theme Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2.5">
                          Theme Mode
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: "dark", label: "Dark Mode", icon: <Moon className="w-4 h-4 text-indigo-400" /> },
                            { id: "light", label: "Light Mode", icon: <Sun className="w-4 h-4 text-amber-400" /> },
                            { id: "system", label: "System Sync", icon: <Monitor className="w-4 h-4 text-blue-400" /> },
                          ].map((th) => (
                            <button
                              key={th.id}
                              onClick={() => onUpdateSettings({ theme: th.id as any })}
                              className={`p-3.5 rounded-2xl border text-center font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                                settings.theme === th.id
                                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                                  : isDark
                                  ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {th.icon}
                              <span>{th.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Accent Color Palette */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2.5">
                          Interface Accent Tone
                        </label>
                        <div className="flex items-center gap-3 flex-wrap">
                          {[
                            { id: "blue", label: "Electric Blue", color: "bg-blue-500" },
                            { id: "indigo", label: "Deep Indigo", color: "bg-indigo-500" },
                            { id: "purple", label: "Cyber Purple", color: "bg-purple-500" },
                            { id: "emerald", label: "Emerald Mint", color: "bg-emerald-500" },
                            { id: "amber", label: "Amber Sun", color: "bg-amber-500" },
                          ].map((acc) => (
                            <button
                              key={acc.id}
                              onClick={() => onUpdateSettings({ accentColor: acc.id as any })}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                (settings.accentColor || "blue") === acc.id
                                  ? "bg-white/15 border-white/40 text-white shadow-md ring-2 ring-blue-500/30"
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              }`}
                            >
                              <span className={`w-3 h-3 rounded-full ${acc.color}`} />
                              <span>{acc.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Compact Grid View Toggle */}
                      <ToggleRow
                        title="Compact Grid Density"
                        description="Increase card density and display more screenshot previews per row"
                        checked={settings.compactGridView}
                        onChange={(v) => onUpdateSettings({ compactGridView: v })}
                        isDark={isDark}
                      />

                      {/* Reduced Motion Toggle */}
                      <ToggleRow
                        title="Reduced Motion & Fast Transitions"
                        description="Minimize motion animations for snappier window rendering and battery saving"
                        checked={settings.reducedMotion ?? false}
                        onChange={(v) => onUpdateSettings({ reducedMotion: v })}
                        isDark={isDark}
                      />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* SECTION 3: NOTIFICATIONS */}
              {activeSection === "notifications" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<Bell className="w-5 h-5 text-amber-400" />}
                    title="Notification Preferences"
                    description="SnapFind AI only notifies you when information is genuinely important or requires your attention."
                  >
                    <div className="space-y-4 text-xs">
                      {/* Master Notifications Toggle */}
                      <ToggleRow
                        title="Important Notifications"
                        description="Master switch for high-priority alerts, screenshot index summaries, and account activity"
                        checked={settings.enableNotifications}
                        onChange={(v) => onUpdateSettings({ enableNotifications: v })}
                        isDark={isDark}
                      />

                      {/* Security Alerts (Always ON / Locked) */}
                      <div
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          isDark ? "bg-[#18181B] border-white/5" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                              Security Alerts
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Always On
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            New logins, password changes, and account security notices (Mandatory for account protection)
                          </p>
                        </div>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled={true}
                            className="sr-only"
                          />
                          <div className="w-9 h-5 bg-emerald-500 rounded-full opacity-80 cursor-not-allowed flex items-center justify-end px-0.5">
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Subscription & Billing */}
                      <ToggleRow
                        title="Subscription & Billing"
                        description="Receive alerts for plan renewals, upgrades, and payment status updates"
                        checked={settings.notifyOnSubscription ?? true}
                        disabled={!settings.enableNotifications}
                        onChange={(v) => onUpdateSettings({ notifyOnSubscription: v })}
                        isDark={isDark}
                      />

                      {/* Screenshot Indexing */}
                      <ToggleRow
                        title="Screenshot Indexing"
                        description="Receive one grouped notification when screenshots finish processing and become searchable"
                        checked={settings.notifyOnIndexing ?? true}
                        disabled={!settings.enableNotifications}
                        onChange={(v) => onUpdateSettings({ notifyOnIndexing: v })}
                        isDark={isDark}
                      />

                      {/* Storage Warnings */}
                      <ToggleRow
                        title="Storage & Quota Warnings"
                        description="Notify only when storage capacity is approaching full (90%+)"
                        checked={settings.notifyOnStorageWarnings ?? true}
                        disabled={!settings.enableNotifications}
                        onChange={(v) => onUpdateSettings({ notifyOnStorageWarnings: v })}
                        isDark={isDark}
                      />

                      {/* Marketing */}
                      <ToggleRow
                        title="Product Tips & Updates"
                        description="Occasional announcements about new AI search capabilities (Default OFF)"
                        checked={settings.notifyOnMarketing ?? false}
                        disabled={!settings.enableNotifications}
                        onChange={(v) => onUpdateSettings({ notifyOnMarketing: v })}
                        isDark={isDark}
                      />

                      {/* Audio Sound Effect */}
                      <ToggleRow
                        title="Notification Sound Chimes"
                        description="Play a subtle audio tone for incoming important alerts"
                        checked={settings.soundEnabled ?? true}
                        disabled={!settings.enableNotifications}
                        onChange={(v) => onUpdateSettings({ soundEnabled: v })}
                        isDark={isDark}
                      />
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* SECTION 4: STORAGE */}
              {activeSection === "storage" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<HardDrive className="w-5 h-5 text-emerald-400" />}
                    title="Storage Engine & Database Cache"
                    description="Manage SQLite local cache, cloud backup quota, and data cleanup policies."
                  >
                    <div className="space-y-5 text-xs">
                      {/* Authoritative Usage Dashboard Card */}
                      <YourUsageCard
                        screenshots={screenshots}
                        user={user}
                        isDark={isDark}
                        onOpenUpgrade={() => setActiveSection("account")}
                      />

                      {/* Sync Toggles */}
                      <ToggleRow
                        title="Automatic Cloud Sync"
                        description="Synchronize metadata and vector embeddings with Supabase database"
                        checked={settings.syncEnabled ?? true}
                        onChange={(v) => onUpdateSettings({ syncEnabled: v })}
                        isDark={isDark}
                      />

                      <ToggleRow
                        title="Upload High-Res Images to Encrypted Cloud"
                        description="Store original image binaries in remote cloud storage alongside metadata"
                        checked={settings.uploadImagesToCloud ?? false}
                        onChange={(v) => onUpdateSettings({ uploadImagesToCloud: v })}
                        isDark={isDark}
                      />

                      {/* Auto-Clean Trash */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <div className="font-semibold text-slate-200">Auto-Purge Trash Retention</div>
                          <div className="text-[11px] text-slate-400">Permanently empty deleted items after period</div>
                        </div>
                        <select
                          value={settings.autoCleanTrashDays || 30}
                          onChange={(e) => onUpdateSettings({ autoCleanTrashDays: Number(e.target.value) })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                            isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                          }`}
                        >
                          <option value={7}>After 7 Days</option>
                          <option value={14}>After 14 Days</option>
                          <option value={30}>After 30 Days (Recommended)</option>
                          <option value={90}>After 90 Days</option>
                          <option value={0}>Never Auto-Purge</option>
                        </select>
                      </div>

                      {/* Clear Cache Action */}
                      <div className="pt-2">
                        <button
                          onClick={() => setShowClearCacheModal(true)}
                          className="w-full py-2.5 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Clear Local Offline Cache & Rebuild Index</span>
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* SECTION 5: PRIVACY */}
              {activeSection === "privacy" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<Shield className="w-5 h-5 text-teal-400" />}
                    title="Privacy & Data Protection"
                    description="SnapFind utilizes zero-knowledge encrypted local storage with complete user data sovereignty."
                  >
                    <div className="space-y-4 text-xs">
                      {/* Local Encryption */}
                      <ToggleRow
                        title="Encrypt On-Device SQLite Database"
                        description="AES-256 local database encryption for all indexed tokens and screenshot text"
                        checked={settings.encryptLocalCache ?? true}
                        onChange={(v) => onUpdateSettings({ encryptLocalCache: v })}
                        isDark={isDark}
                      />

                      {/* Anonymize OCR Data */}
                      <ToggleRow
                        title="Anonymize Sensitive OCR Entities"
                        description="Mask credit card CVVs and sensitive ID numbers in client-side search previews"
                        checked={settings.anonymizeOcrData ?? true}
                        onChange={(v) => onUpdateSettings({ anonymizeOcrData: v })}
                        isDark={isDark}
                      />

                      {/* Telemetry Toggle */}
                      <ToggleRow
                        title="Anonymous Diagnostics & Crash Telemetry"
                        description="Share non-identifying telemetry to help improve OCR accuracy models"
                        checked={settings.telemetryEnabled ?? false}
                        onChange={(v) => onUpdateSettings({ telemetryEnabled: v })}
                        isDark={isDark}
                      />

                      {/* Auto Lock Timer */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                        <div>
                          <div className="font-semibold text-slate-200">Inactivity Vault Auto-Lock</div>
                          <div className="text-[11px] text-slate-400">Lock vault after period of user inactivity</div>
                        </div>
                        <select
                          value={settings.autoLockMinutes || 15}
                          onChange={(e) => onUpdateSettings({ autoLockMinutes: Number(e.target.value) })}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer ${
                            isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                          }`}
                        >
                          <option value={5}>5 Minutes</option>
                          <option value={15}>15 Minutes (Default)</option>
                          <option value={30}>30 Minutes</option>
                          <option value={60}>1 Hour</option>
                          <option value={0}>Disabled</option>
                        </select>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* SECTION 8: ACCOUNT */}
              {activeSection === "account" && (
                <AccountPageView
                  user={user}
                  isDark={isDark}
                  indexedCount={indexedCount}
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  onOpenAuth={onOpenAuth}
                />
              )}

              {/* SECTION: FOUNDER */}
              {activeSection === "founder" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<Crown className="w-5 h-5 text-amber-400" />}
                    title="Founder Recognition"
                    description="Show your Founder rank and crown across SnapFind."
                  >
                    <div className="space-y-4 text-xs">
                      {/* Founder Recognition Toggle */}
                      <ToggleRow
                        title="Founder Recognition"
                        description="Show your Founder rank and crown across SnapFind."
                        checked={settings.founder_banner_enabled !== false}
                        onChange={(v) =>
                          onUpdateSettings({
                            founder_banner_enabled: v,
                            founderBannerEnabled: v,
                          })
                        }
                        isDark={isDark}
                      />

                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                            <span>👑 Founder #{user.entitlement?.founderNumber || "VIP"} Status Active</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            You have permanent complimentary Lifetime Pro access. Disabling the recognition banner only hides the top visual banner; your Founder entitlements and lifetime perks remain permanently active.
                          </p>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* SECTION 9: FEEDBACK */}
              {activeSection === "feedback" && (
                <FeedbackView
                  isDark={isDark}
                  currentUser={user}
                  screenshots={screenshots}
                />
              )}

              {/* SECTION 10: ABOUT */}
              {activeSection === "about" && (
                <div className="space-y-5">
                  <SectionCard
                    isDark={isDark}
                    icon={<Info className="w-5 h-5 text-blue-400" />}
                    title="About SnapFind AI"
                    description="Architecture, versioning, system telemetry, and licensing."
                  >
                    <div className="space-y-4 text-xs">
                      {/* App Spec Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                          <span className="text-[11px] text-slate-400">Release Version</span>
                          <div className="text-base font-extrabold text-blue-400 mt-0.5">v2.4.0 (Enterprise)</div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                          <span className="text-[11px] text-slate-400">AI Core Engine</span>
                          <div className="text-base font-extrabold text-purple-400 mt-0.5">Gemini 3.7 Vision</div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                          <span className="text-[11px] text-slate-400">Local DB Engine</span>
                          <div className="text-base font-extrabold text-emerald-400 mt-0.5">SQLite / IndexedDB</div>
                        </div>
                      </div>

                      {/* System Telemetry & Endpoints */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Search Latency:</span>
                          <span className="text-emerald-400 font-bold">0ms Client-Side Vector Match</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">OCR Precision:</span>
                          <span className="text-cyan-400 font-bold">99.8% Multi-Token Confidence</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Cloud Sync:</span>
                          <span className="text-teal-400 font-bold">Supabase Realtime v2</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Build Timestamp:</span>
                          <span className="text-slate-400">2026-08-15 01:48:25</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-slate-300 text-xs leading-relaxed flex items-start gap-2.5">
                        <SnapFindLogo className="w-5 h-5 rounded-lg shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">SnapFind AI Vision Engine</strong> — Instant screenshot indexing, deep optical character recognition, and multimodal natural language search crafted for privacy and speed.
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#121216] border border-rose-500/40 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Account Permanently?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deleting your account will permanently purge all your indexed screenshots, OCR search history, SQLite local cache, Supabase Database rows, and Supabase Cloud Storage images.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountConfirm}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? "Purging Data..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache Confirmation Modal */}
      {showClearCacheModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#121821] border border-amber-500/40 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 rounded-2xl bg-amber-500/20">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Clear Local Cache?</h3>
                <p className="text-xs text-slate-400">Reset local offline database</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear your local indexed cache and reset sample datasets. If cloud sync is active, your cloud data will remain safe.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearCacheModal(false)}
                className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetAllData();
                  setShowClearCacheModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                Clear & Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SectionCardProps {
  isDark: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ isDark, icon, title, description, children }) => {
  return (
    <div
      className={`p-6 rounded-3xl border space-y-5 transition-all ${
        isDark ? "bg-[#121821] border-white/[0.08] backdrop-blur-xl shadow-xl shadow-black/40" : "bg-white border-slate-200 shadow-md"
      }`}
    >
      <div className="flex items-start gap-3.5 border-b border-white/[0.08] pb-4">
        <div className="p-2.5 rounded-2xl bg-[#0D1117] border border-white/[0.08] shrink-0">{icon}</div>
        <div>
          <h3 className="font-extrabold text-base tracking-tight text-[#F8FAFC]">{title}</h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
};

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isDark: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, description, checked, onChange, disabled, isDark }) => {
  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
        disabled
          ? "opacity-40 pointer-events-none"
          : isDark
          ? "bg-[#0D1117] border-white/[0.08] hover:border-white/[0.15] hover:bg-[#18202B]"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="pr-4">
        <div className="font-semibold text-slate-200 text-xs">{title}</div>
        <div className="text-[11px] text-slate-400 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.4)]" : isDark ? "bg-[#18202B]" : "bg-slate-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};
