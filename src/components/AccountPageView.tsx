import React, { useState, useEffect, useRef, useMemo } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  User,
  Shield,
  ShieldCheck,
  Key,
  Lock,
  Mail,
  Calendar,
  Layers,
  HardDrive,
  RefreshCw,
  Trash2,
  LogOut,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  Cloud,
  Check,
  Clock,
  Zap,
  Info,
  Sliders,
  Smartphone,
  Eye,
  EyeOff,
  UploadCloud,
  Copy,
  Crown,
  Gem,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, AppSettings, PaymentRequest } from "../types";
import { useAuth } from "../context/AuthContext";
import { SyncEngine, SyncState } from "../services/syncEngine";
import { SubscriptionManager, PLAN_LIMITS } from "../services/billing/SubscriptionManager";
import { ManualPaymentService } from "../services/billing/ManualPaymentService";
import { ManualPaymentModal } from "./subscription/ManualPaymentModal";
import { YourUsageCard } from "./subscription/YourUsageCard";
import { PaymentHistoryCard } from "./subscription/PaymentHistoryCard";
import { AdminPaymentRequestsModal } from "./admin/AdminPaymentRequestsModal";
import { PageHeroHeader } from "./PageHeroHeader";

interface AccountPageViewProps {
  user: UserProfile;
  isDark: boolean;
  indexedCount: number;
  settings: AppSettings;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
  addToast?: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
  onOpenAuth?: () => void;
  onNavigate?: (view: string) => void;
}

export const AccountPageView: React.FC<AccountPageViewProps> = ({
  user,
  isDark,
  indexedCount,
  settings,
  onUpdateSettings,
  addToast,
  onOpenAuth,
  onNavigate,
}) => {
  const {
    supabaseUser,
    isConfigured,
    entitlement,
    refreshEntitlement,
    updateName,
    updateProfilePicture,
    changeEmail,
    changePassword,
    signOut,
    signOutAllDevices,
    deleteAccount,
  } = useAuth();

  // Full Name Editing State
  const [name, setName] = useState(user.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile Picture Upload State
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change Password State
  const [currentPasswordForPass, setCurrentPasswordForPass] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassModal, setShowPassModal] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Change Email State
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Payment Requests and Authoritative Entitlement State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isRefreshingEntitlement, setIsRefreshingEntitlement] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Fetch Authoritative Entitlement from Supabase & Payment Requests
  const fetchAuthoritativeStatus = async () => {
    try {
      setIsRefreshingEntitlement(true);
      await refreshEntitlement();
      const currentUserId = user?.id || supabaseUser?.id;
      if (currentUserId && currentUserId !== "guest" && !currentUserId.startsWith("local-guest")) {
        const reqs = await ManualPaymentService.getMyPaymentRequests(currentUserId);
        setPaymentRequests(reqs);
      }
    } catch (e) {
      console.warn("[AccountPage] Authoritative sync warning:", e);
    } finally {
      setIsRefreshingEntitlement(false);
    }
  };

  useEffect(() => {
    fetchAuthoritativeStatus();
  }, [user?.id, supabaseUser?.id]);

  // Sign out all devices state
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);

  // Delete Account Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Cloud Sync Engine State
  const [syncState, setSyncState] = useState<SyncState>(() => SyncEngine.getState());

  useEffect(() => {
    return SyncEngine.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  useEffect(() => {
    setName(user.name || "");
  }, [user.name]);

  // Derived Authoritative Entitlement Status
  const isFounder = Boolean(user.entitlement?.isFounder || entitlement?.isFounder || user.plan === "Founder");
  const founderNum = user.entitlement?.founderNumber || entitlement?.founderNumber || (user as any).founderNumber;
  const founderNumStr = founderNum ? `#${String(founderNum).padStart(2, "0")}` : "#01";

  const isLifetimePro = !isFounder && Boolean(
    user.entitlement?.isPro ||
    entitlement?.isPro ||
    user.plan === "Pro" ||
    (user.plan as string) === "Lifetime Pro" ||
    user.entitlement?.plan === "lifetime" ||
    entitlement?.plan === "lifetime"
  );

  const isAdmin =
    user?.email?.toLowerCase().trim() === "ash.mary.2006@gmail.com" ||
    user?.role === "admin" ||
    (user as any)?.user_metadata?.role === "admin" ||
    (user as any)?.app_metadata?.role === "admin" ||
    supabaseUser?.email?.toLowerCase().trim() === "ash.mary.2006@gmail.com";

  const latestPayment = paymentRequests.length > 0 ? paymentRequests[0] : null;
  const isPaymentPending = !isFounder && !isLifetimePro && latestPayment?.status === "pending";
  const isPaymentRejected = !isFounder && !isLifetimePro && latestPayment?.status === "rejected";
  const isFree = !isFounder && !isLifetimePro && !isPaymentPending && !isPaymentRejected;

  // Handle Name Update
  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameMsg({ type: "error", text: "Name cannot be blank." });
      return;
    }
    setNameLoading(true);
    setNameMsg(null);
    const res = await updateName(trimmed);
    setNameLoading(false);
    if (res.error) {
      setNameMsg({ type: "error", text: res.error });
    } else {
      setNameMsg({ type: "success", text: "Full name updated successfully!" });
      setIsEditingName(false);
      if (addToast) {
        addToast({
          title: "Profile Updated",
          description: `Your display name has been saved as "${trimmed}".`,
          type: "success",
        });
      }
    }
  };

  // Handle Avatar Selection from Local File
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      if (addToast) {
        addToast({
          title: "Image Too Large",
          description: "Please choose a profile image smaller than 3MB.",
          type: "error",
        });
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setAvatarLoading(true);
        const res = await updateProfilePicture(base64);
        setAvatarLoading(false);
        if (res.error) {
          if (addToast) {
            addToast({
              title: "Avatar Upload Failed",
              description: res.error,
              type: "error",
            });
          }
        } else {
          setShowAvatarModal(false);
          if (addToast) {
            addToast({
              title: "Avatar Updated",
              description: "Your new profile picture was uploaded and synchronized.",
              type: "success",
            });
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Preset Avatar Selection
  const handlePresetAvatar = async (url: string) => {
    setAvatarLoading(true);
    const res = await updateProfilePicture(url);
    setAvatarLoading(false);
    if (res.error) {
      if (addToast) {
        addToast({ title: "Failed to update avatar", description: res.error, type: "error" });
      }
    } else {
      setShowAvatarModal(false);
      if (addToast) {
        addToast({ title: "Profile Picture Updated", type: "success" });
      }
    }
  };

  // Handle Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPassMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPassLoading(true);
    setPassMsg(null);
    const res = await changePassword(newPassword, currentPasswordForPass);
    setPassLoading(false);
    if (res.error) {
      setPassMsg({ type: "error", text: res.error });
    } else {
      setPassMsg({ type: "success", text: "Password changed successfully!" });
      setTimeout(() => {
        setShowPassModal(false);
        setCurrentPasswordForPass("");
        setNewPassword("");
        setConfirmPassword("");
        setPassMsg(null);
      }, 1500);
      if (addToast) {
        addToast({
          title: "Password Updated",
          description: "Your account credentials have been securely updated.",
          type: "success",
        });
      }
    }
  };

  // Handle Email Change
  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim();
    if (!clean || !clean.includes("@")) {
      setEmailMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    const res = await changeEmail(clean, currentPasswordForEmail);
    setEmailLoading(false);
    if (res.error) {
      setEmailMsg({ type: "error", text: res.error });
    } else {
      setEmailMsg({
        type: "success",
        text: res.requiresVerification
          ? `Confirmation links sent to both your current email and ${clean}. Please verify to complete change.`
          : "Email updated successfully!",
      });
      if (addToast) {
        addToast({
          title: "Email Change Requested",
          description: `Verification link dispatched to ${clean}.`,
          type: "info",
        });
      }
    }
  };

  // Handle Sign Out from All Devices
  const handleSignOutAll = async () => {
    if (!confirm("Are you sure you want to invalidate all active sessions across all devices?")) {
      return;
    }
    setSignOutAllLoading(true);
    const res = await signOutAllDevices();
    setSignOutAllLoading(false);
    if (res.error) {
      if (addToast) addToast({ title: "Global Sign Out Failed", description: res.error, type: "error" });
    } else {
      if (addToast) addToast({ title: "Signed Out from All Devices", type: "info" });
    }
  };

  // Handle Permanent Delete Account
  const handleDeleteAccountSubmit = async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("Please type 'DELETE' exactly to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await deleteAccount(deletePassword);
    setDeleteLoading(false);
    if (res.error) {
      setDeleteError(res.error);
    } else {
      setShowDeleteModal(false);
      if (addToast) {
        addToast({
          title: "Account Purged",
          description: "Your account and all associated cloud data were permanently erased.",
          type: "info",
        });
      }
    }
  };

  // Calculate Computed Metadata
  const accountCreatedDate = useMemo(() => {
    const raw = user.createdAt || supabaseUser?.created_at;
    if (!raw) return "August 2026";
    try {
      return new Date(raw).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  }, [user.createdAt, supabaseUser]);

  const storageUsedMB = (indexedCount * 0.42).toFixed(1);
  const storageLimitMB = user.storageLimitMB || 5000;
  const storageUsagePercent = Math.min(100, Math.max(2, (Number(storageUsedMB) / storageLimitMB) * 100));

  const avatarPresets = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Standard Page Hero Header */}
      <PageHeroHeader
        type="account"
        title="Account & Security"
        description="Manage your personal profile, authenticated credentials, cloud quotas, and device sessions."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Supabase Auth
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                id="account-admin-payments-btn"
                onClick={() => setShowAdminModal(true)}
                className="px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Payments</span>
              </button>
            )}
            <button
              onClick={() => signOut()}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isDark
                  ? "bg-[#18181B] border-white/10 hover:bg-white/10 text-slate-300 hover:text-white"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        }
        isDark={isDark}
      />

      {/* Hero Profile Card (Apple Vision/ChatGPT Inspired) */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden transition-all ${
          isDark
            ? "bg-gradient-to-b from-[#18181F]/90 to-[#121216]/90 border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl"
            : "bg-white border-slate-200 shadow-xl"
        }`}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar with Camera Overlay */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-[#09090B] flex items-center justify-center ring-4 ring-blue-500/20">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-inner">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </div>

            {/* Quick Camera Change Button */}
            <button
              onClick={() => setShowAvatarModal(true)}
              title="Change Profile Picture"
              className="absolute -bottom-1.5 -right-1.5 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/40 border-2 border-[#121216] transition-transform group-hover:scale-110 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Details & In-Place Name Editor */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      className={`px-3.5 py-1.5 rounded-xl text-base font-bold border outline-none ${
                        isDark ? "bg-[#18181B] border-blue-500 text-white" : "bg-white border-blue-500 text-slate-900"
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={nameLoading}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {nameLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setName(user.name || "");
                        setIsEditingName(false);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center md:justify-start gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                      {user.name || "SnapFind User"}
                    </h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 cursor-pointer"
                    >
                      Edit Name
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono text-slate-300">{user.email || "guest@snapfind.ai"}</span>
                  {user.emailConfirmedAt && (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Plan Tier Pill & Action */}
              <div className="flex items-center justify-center gap-2">
                {isFounder ? (
                  <div className="px-4 py-1.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 shadow-sm bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/40 text-amber-300 shadow-amber-500/10">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>👑 Founder {founderNumStr}</span>
                  </div>
                ) : isLifetimePro ? (
                  <div className="px-4 py-1.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 shadow-sm bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/30 text-blue-300 shadow-blue-500/10">
                    <Gem className="w-3.5 h-3.5 text-blue-400" />
                    <span>💎 Lifetime Pro</span>
                  </div>
                ) : isPaymentPending ? (
                  <div className="px-4 py-1.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 shadow-sm bg-amber-500/20 border-amber-400/30 text-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>Payment Pending</span>
                  </div>
                ) : isPaymentRejected ? (
                  <div className="px-4 py-1.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 shadow-sm bg-rose-500/20 border-rose-400/30 text-rose-300">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Payment Rejected</span>
                  </div>
                ) : (
                  <div className="px-4 py-1.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 shadow-sm bg-slate-800/80 border-slate-700 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    <span>Free Plan</span>
                  </div>
                )}

                {isFree ? (
                  <button
                    onClick={() => setShowProModal(true)}
                    className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 text-xs font-bold flex items-center gap-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Upgrade to Lifetime Pro</span>
                  </button>
                ) : isPaymentPending || isPaymentRejected ? (
                  <button
                    onClick={() => setShowManualPaymentModal(true)}
                    className="px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    {isPaymentPending ? "View Payment" : "Re-submit Payment"}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowProModal(true)}
                    className="px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    Manage Benefits
                  </button>
                )}
              </div>
            </div>

            {nameMsg && (
              <p
                className={`text-xs font-medium ${
                  nameMsg.type === "success" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {nameMsg.text}
              </p>
            )}

            {/* Quick Overview Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-400" /> Joined
                </span>
                <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
                  {accountCreatedDate}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Screenshots
                </span>
                <span className="text-xs font-bold text-cyan-300 mt-1 block font-mono">
                  {indexedCount} indexed
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" /> Cloud Usage
                </span>
                <span className="text-xs font-bold text-emerald-300 mt-1 block font-mono">
                  {storageUsedMB} MB / {(storageLimitMB / 1024).toFixed(0)} GB
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-indigo-400" /> Last Sync
                </span>
                <span className="text-xs font-bold text-indigo-300 mt-1 block font-mono">
                  {syncState.lastSyncedAt
                    ? new Date(syncState.lastSyncedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authoritative Entitlement Card */}
      <div
        className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${
          isDark
            ? "bg-gradient-to-b from-[#18181F]/90 to-[#121216]/90 border-white/10 shadow-xl"
            : "bg-white border-slate-200 shadow-md"
        }`}
      >
        {isFounder ? (
          /* ================= FOUNDER STATE ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-md shadow-amber-500/10">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider">Founder VIP Status</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">👑 Founder {founderNumStr}</h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/10 self-start sm:self-auto">
                Lifetime Pro
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-amber-300/80 font-medium">Screenshot Capacity</span>
                <span className="text-lg font-bold font-mono text-amber-300">
                  Unlimited screenshots
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                First 50 users pioneer privilege. Permanent VIP recognition, founder badge, golden crown, and lifetime unlimited AI indexing.
              </p>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <span>Indexed: <strong className="text-white font-mono">{indexedCount}</strong> screenshots</span>
              <button
                onClick={fetchAuthoritativeStatus}
                disabled={isRefreshingEntitlement}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingEntitlement ? "animate-spin" : ""}`} />
                <span>Sync Entitlement</span>
              </button>
            </div>
          </div>
        ) : isLifetimePro ? (
          /* ================= LIFETIME PRO STATE ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-md shadow-blue-500/10">
                  <Gem className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-blue-400/80 uppercase tracking-wider">Authoritative Plan</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">💎 Lifetime Pro</h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/40 self-start sm:self-auto">
                Active
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-blue-300/80 font-medium">Screenshot Capacity</span>
                <span className="text-lg font-bold font-mono text-blue-300">
                  Unlimited screenshots
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                One-time purchase • Permanent lifetime access with neural OCR, advanced semantic search, cloud sync, and priority queue.
              </p>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <span>Indexed: <strong className="text-white font-mono">{indexedCount}</strong> screenshots</span>
              <button
                onClick={fetchAuthoritativeStatus}
                disabled={isRefreshingEntitlement}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingEntitlement ? "animate-spin" : ""}`} />
                <span>Sync Entitlement</span>
              </button>
            </div>
          </div>
        ) : isPaymentPending ? (
          /* ================= PAYMENT PENDING STATE ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Payment Status</span>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Payment verification pending</h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 self-start sm:self-auto">
                <Clock className="w-3 h-3 animate-spin" /> Pending Review
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <p className="text-xs text-amber-200 leading-relaxed">
                Your Lifetime Pro payment confirmation (PKR 7,999) has been submitted and is currently being verified by our team.
              </p>
              {latestPayment && (
                <div className="pt-2 border-t border-amber-500/20 text-[11px] font-mono text-slate-300 space-y-0.5">
                  <div>Transaction ID: <span className="text-white font-bold">{latestPayment.transaction_id || latestPayment.transactionId}</span></div>
                  <div>Payment Method: <span className="text-white font-bold">{latestPayment.payment_method === "easypaisa" ? "Easypaisa" : "Bank Transfer"}</span></div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={fetchAuthoritativeStatus}
                disabled={isRefreshingEntitlement}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingEntitlement ? "animate-spin" : ""}`} />
                <span>Check Verification Status</span>
              </button>
              <button
                onClick={() => setShowManualPaymentModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                View Payment Details
              </button>
            </div>
          </div>
        ) : isPaymentRejected ? (
          /* ================= PAYMENT REJECTED STATE ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/30">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Payment Status</span>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Payment could not be verified</h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30 self-start sm:self-auto">
                Verification Failed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
              <p className="text-xs text-rose-200 leading-relaxed">
                {latestPayment?.rejection_reason || latestPayment?.rejectionReason || "Your transaction reference could not be matched with incoming banking records."}
              </p>
              <p className="text-[11px] text-slate-400">
                Please verify your transaction ID / receipt and submit a new confirmation request.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setShowManualPaymentModal(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Submit New Payment Details</span>
              </button>
              <button
                onClick={fetchAuthoritativeStatus}
                disabled={isRefreshingEntitlement}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingEntitlement ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= FREE STATE ================= */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Tier</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Free Plan</h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
                70 lifetime limit
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Screenshot Quota</span>
                <span className="text-xl font-bold font-mono text-white">
                  {indexedCount} <span className="text-slate-400 text-sm font-normal">/ 70 screenshots</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((indexedCount / 70) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {indexedCount >= 70
                  ? "You've reached your 70 screenshot Free lifetime limit."
                  : `${Math.max(0, 70 - indexedCount)} free screenshots remaining.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setShowProModal(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Upgrade to Lifetime Pro (PKR 7,999)</span>
              </button>
              <button
                onClick={fetchAuthoritativeStatus}
                disabled={isRefreshingEntitlement}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingEntitlement ? "animate-spin" : ""}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        )}

        {/* Usage Card Breakdown */}
        <div className="pt-5 mt-5 border-t border-white/10">
          <YourUsageCard
            user={user}
            isDark={isDark}
            onOpenUpgrade={() => setShowProModal(true)}
            onSyncNow={() => SyncEngine.scheduleSync(0)}
          />
        </div>
      </div>

      {/* Manual Payment History Card */}
      {user && user.id !== "guest" && (
        <PaymentHistoryCard
          user={user}
          isDark={isDark}
          onOpenUpgradeModal={() => setShowProModal(true)}
          addToast={addToast}
        />
      )}

      {/* Administrator Payments Portal Card */}
      {isAdmin && (
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            isDark
              ? "bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/40 border-blue-500/30"
              : "bg-blue-50/70 border-blue-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Admin Payments Management</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    /admin/payments
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Review submitted manual bank & Easypaisa transactions, verify receipts, and activate Lifetime Pro.
                </p>
              </div>
            </div>

            <button
              id="account-page-open-admin-payments-btn"
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate("admin-payments");
                } else {
                  window.location.hash = "#admin/payments";
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Payments Hub
            </button>
          </div>
        </div>
      )}


      {/* Cloud Storage & Synchronization Progress Banner */}
      <div
        className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? "bg-[#121216]/90 border-white/10" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Supabase Cloud Storage & Realtime Sync</h3>
              <p className="text-xs text-slate-400">
                Encrypted backup allocation for OCR vectors, embeddings, and media binaries.
              </p>
            </div>
          </div>
          <button
            onClick={() => SyncEngine.scheduleSync(0)}
            disabled={syncState.isSyncing}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? "animate-spin" : ""}`} />
            <span>Force Sync</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Used: {storageUsedMB} MB</span>
            <span className="text-slate-200 font-mono font-bold">
              {storageUsagePercent.toFixed(1)}% of {(storageLimitMB / 1024).toFixed(0)} GB Quota
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${storageUsagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Local SQLite Vector DB: Active</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> End-to-End Encryption
            </span>
          </div>
        </div>
      </div>

      {/* Account Security Controls (Apple / ChatGPT Settings Card) */}
      <div
        className={`p-6 rounded-3xl border space-y-5 ${
          isDark ? "bg-[#121216]/90 border-white/10" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Security & Authenticated Credentials</h3>
            <p className="text-xs text-slate-400">
              Manage your password, login email address, and global session states.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Change Password Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Account Password</div>
                <div className="text-[11px] text-slate-400">
                  Update your authentication password (requires current password verification)
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowPassModal(true);
                setPassMsg(null);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              Change Password
            </button>
          </div>

          {/* Change Email Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Primary Login Email</div>
                <div className="text-[11px] text-slate-400">
                  Current: <span className="font-mono text-slate-300 font-semibold">{user.email}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowEmailModal(true);
                setEmailMsg(null);
                setNewEmail(user.email || "");
              }}
              className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              Change Email
            </button>
          </div>

          {/* Sign Out from All Devices */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Global Session Management</div>
                <div className="text-[11px] text-slate-400">
                  Revoke all active tokens and sign out from all browser tabs, mobile, and desktop instances
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOutAll}
              disabled={signOutAllLoading}
              className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              {signOutAllLoading ? "Signing out..." : "Sign Out All Devices"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Permanent Account Deletion */}
      <div
        className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? "bg-rose-950/20 border-rose-500/30" : "bg-rose-50 border-rose-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-rose-300">Danger Zone</h3>
            <p className="text-xs text-slate-400">
              Irreversible account erasure and cloud database purging.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#09090B]/60 border border-rose-500/20 gap-3">
          <div>
            <div className="font-bold text-xs text-white">Delete SnapFind Account Permanently</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Permanently purges your Supabase user profile, credentials, indexed screenshots, and SQLite cache.
            </div>
          </div>
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteConfirmText("");
              setDeletePassword("");
              setDeleteError(null);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-lg shadow-rose-600/30"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* ================= MODAL: CHANGE PROFILE PICTURE ================= */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#18181F] border border-white/10 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Update Profile Picture</h3>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Custom Upload Button */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Upload from Device</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{avatarLoading ? "Uploading..." : "Choose Image from Device"}</span>
              </button>
            </div>

            {/* Avatar Presets Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Or Select a Persona Preset</label>
              <div className="grid grid-cols-6 gap-2">
                {avatarPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetAvatar(preset)}
                    disabled={avatarLoading}
                    className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500 hover:scale-105 transition-all cursor-pointer"
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE PASSWORD ================= */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#18181F] border border-white/10 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Change Password</h3>
              </div>
              <button
                onClick={() => setShowPassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
              {/* Current Password Re-Auth */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">Current Password (Re-authentication)</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPasswordForPass}
                    onChange={(e) => setCurrentPasswordForPass(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-indigo-500"
                />
              </div>

              {passMsg && (
                <p
                  className={`text-xs font-medium ${
                    passMsg.type === "success" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {passMsg.text}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {passLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE EMAIL ================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#18181F] border border-white/10 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Change Email Address</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangeEmailSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-slate-300 text-[11px] leading-relaxed">
                Supabase Auth will dispatch a confirmation email to both your old address and your new address for security verification.
              </div>

              {/* New Email */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Re-authenticate with Password */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">Current Password (For Verification)</label>
                <input
                  type="password"
                  value={currentPasswordForEmail}
                  onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-blue-500"
                />
              </div>

              {emailMsg && (
                <p
                  className={`text-xs font-medium ${
                    emailMsg.type === "success" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {emailMsg.text}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {emailLoading ? "Sending Verification..." : "Send Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE ACCOUNT ================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#18181F] border border-rose-500/40 text-white space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Account Permanently</h3>
                <p className="text-xs text-slate-400">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete your user profile, purge all indexed screenshot metadata, delete Supabase storage images, and reset your local database.
            </p>

            <div className="space-y-3 text-xs">
              {/* Current Password Re-Auth */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Confirm Current Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-rose-500"
                />
              </div>

              {/* Type DELETE */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">
                  Type <span className="text-rose-400 font-mono font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121216] border border-white/10 text-white outline-none focus:border-rose-500"
                />
              </div>

              {deleteError && <p className="text-xs text-rose-400 font-medium">{deleteError}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountSubmit}
                disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40 shadow-lg shadow-rose-600/40"
              >
                {deleteLoading ? "Purging Account..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Submission & Verification Modal */}
      <ManualPaymentModal
        isOpen={showManualPaymentModal}
        onClose={() => setShowManualPaymentModal(false)}
        user={user}
        isDark={isDark}
        onOpenAuth={onOpenAuth}
        onPaymentSubmitted={(req) => {
          setPaymentRequests((prev) => [req, ...prev]);
          fetchAuthoritativeStatus();
        }}
        addToast={addToast}
      />

      {/* Admin Payment Requests Review Modal */}
      <AdminPaymentRequestsModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        user={user}
        isDark={isDark}
        addToast={addToast}
        onPaymentApproved={() => {
          fetchAuthoritativeStatus();
          SubscriptionManager.syncEntitlementsFromServer();
        }}
      />
    </div>
  );
};

