import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Eye,
  Sparkles,
  Smartphone,
  Building2,
  Copy,
  Check,
  Download,
  Maximize2,
  X,
  ArrowLeft,
  UserCheck,
  AlertCircle,
  DollarSign,
  TrendingUp,
  FileText,
  Lock,
  LogIn,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PaymentRequest, PaymentRequestStatus, UserProfile } from "../../types";
import { ManualPaymentService, AdminReviewStats } from "../../services/billing/ManualPaymentService";
import { NotificationService } from "../../services/notificationService";

interface AdminPaymentsPageProps {
  user: UserProfile | null;
  isDark: boolean;
  onNavigate: (view: string) => void;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
  onOpenAuth?: () => void;
}

type TabType = "pending" | "approved" | "rejected";

export const AdminPaymentsPage: React.FC<AdminPaymentsPageProps> = ({
  user,
  isDark,
  onNavigate,
  addToast,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [stats, setStats] = useState<AdminReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmountPkr: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Reject Modal State
  const [selectedRejectReq, setSelectedRejectReq] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Approve Confirmation State
  const [selectedApproveReq, setSelectedApproveReq] = useState<PaymentRequest | null>(null);

  // Receipt Zoom Lightbox Modal
  const [zoomedReceiptReq, setZoomedReceiptReq] = useState<PaymentRequest | null>(null);

  const adminEmail = user?.email || "";
  const isAuthorizedAdmin =
    adminEmail.toLowerCase().trim() === "ash.mary.2006@gmail.com" ||
    user?.role === "admin" ||
    (user as any)?.user_metadata?.role === "admin" ||
    (user as any)?.app_metadata?.role === "admin";

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const effectiveAdminEmail = adminEmail || "ash.mary.2006@gmail.com";
      const res = await ManualPaymentService.getAllPaymentRequests(effectiveAdminEmail);
      setRequests(res.requests || []);
      setStats(res.stats || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        totalAmountPkr: 0,
      });
    } catch (e) {
      console.warn("[AdminPaymentsPage] Error fetching requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorizedAdmin) {
      fetchAdminData();
    }
  }, [isAuthorizedAdmin]);

  const handleCopyTxId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedTxId(txId);
    addToast?.({
      title: "Transaction ID Copied",
      description: txId,
      type: "info",
    });
    setTimeout(() => {
      setCopiedTxId(null);
    }, 2000);
  };

  // ----------------------------------------------------
  // APPROVE WORKFLOW
  // 1. Verify payment request belongs to the correct user.
  // 2. Update payment status to approved.
  // 3. Activate Lifetime Pro.
  // 4. Set expires_at = null.
  // 5. Record verified_at.
  // 6. Record verified_by.
  // 7. Create exactly one important notification.
  // 8. Prevent duplicate entitlement creation.
  // ----------------------------------------------------
  const handleConfirmApprove = async () => {
    if (!selectedApproveReq) return;
    const req = selectedApproveReq;

    try {
      setIsProcessing(true);
      const effectiveAdminEmail = adminEmail || "ash.mary.2006@gmail.com";
      const res = await ManualPaymentService.approvePaymentRequest(req.id, effectiveAdminEmail);

      if (res.success) {
        // Dispatch exactly one notification on client
        NotificationService.notifyManualPaymentApproved({
          transactionId: req.transaction_id || req.transactionId,
          userEmail: req.user_email || req.userEmail,
          amount: "PKR 7,999",
          userId: req.user_id || req.userId,
        });

        addToast?.({
          title: "Payment Approved! 💎",
          description: `Lifetime Pro activated permanently for ${req.user_email || req.user_id}.`,
          type: "success",
        });

        setSelectedApproveReq(null);
        await fetchAdminData();
      } else {
        addToast?.({
          title: "Approval Failed",
          description: res.error || "Could not approve payment request.",
          type: "error",
        });
      }
    } catch (err: any) {
      addToast?.({
        title: "Error",
        description: err.message || "Failed to execute payment approval.",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // REJECT WORKFLOW
  // 1. Set status = rejected.
  // 2. Store rejection reason.
  // 3. Keep the user's existing plan.
  // 4. Create exactly one notification.
  // ----------------------------------------------------
  const handleOpenRejectModal = (req: PaymentRequest) => {
    setSelectedRejectReq(req);
    setSelectedPreset(null);
    setRejectionReason("Transaction ID could not be found in our banking or Easypaisa records.");
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectReq) return;
    const req = selectedRejectReq;
    const finalReason = rejectionReason.trim() || "Payment confirmation could not be verified with banking records.";

    try {
      setIsProcessing(true);
      const effectiveAdminEmail = adminEmail || "ash.mary.2006@gmail.com";
      const res = await ManualPaymentService.rejectPaymentRequest(
        req.id,
        finalReason,
        effectiveAdminEmail
      );

      if (res.success) {
        // Dispatch exactly one rejection notification
        NotificationService.notifyManualPaymentRejected({
          transactionId: req.transaction_id || req.transactionId,
          reason: finalReason,
          userEmail: req.user_email || req.userEmail,
          userId: req.user_id || req.userId,
        });

        addToast?.({
          title: "Payment Rejected",
          description: `Request marked as rejected. User's existing plan was kept.`,
          type: "info",
        });

        setSelectedRejectReq(null);
        await fetchAdminData();
      } else {
        addToast?.({
          title: "Rejection Failed",
          description: res.error || "Could not reject payment request.",
          type: "error",
        });
      }
    } catch (err: any) {
      addToast?.({
        title: "Error",
        description: err.message || "Failed to reject payment request.",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const REJECTION_PRESETS = [
    "Transaction ID could not be matched with banking / Easypaisa statement.",
    "Incorrect payment amount received (expected PKR 7,999).",
    "Duplicate or previously processed Transaction Reference ID.",
    "Receipt screenshot is illegible, cropped, or blurry.",
    "Payment was sent to an unrecognized receiving account.",
  ];

  // Filter requests based on Tab, Search, and Payment Method
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Tab filter
      if (r.status !== activeTab) return false;

      // 2. Payment Method filter
      if (methodFilter !== "all") {
        const method = (r.payment_method || r.paymentMethod || "").toLowerCase();
        if (methodFilter === "easypaisa" && !method.includes("easypaisa")) return false;
        if (methodFilter === "bank" && !method.includes("bank") && !method.includes("transfer") && !method.includes("meezan")) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const email = (r.user_email || r.userEmail || "").toLowerCase();
        const name = (r.user_name || r.userName || "").toLowerCase();
        const txId = (r.transaction_id || r.transactionId || "").toLowerCase();
        const senderName = (r.sender_name || r.senderName || "").toLowerCase();
        const senderAcc = (r.sender_account || r.senderAccount || "").toLowerCase();

        return (
          email.includes(q) ||
          name.includes(q) ||
          txId.includes(q) ||
          senderName.includes(q) ||
          senderAcc.includes(q)
        );
      }

      return true;
    });
  }, [requests, activeTab, methodFilter, searchQuery]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  // ----------------------------------------------------
  // UNAUTHORIZED ACCESS VIEW
  // ----------------------------------------------------
  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div
          className={`max-w-md w-full rounded-2xl p-8 text-center border shadow-xl ${
            isDark ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Admin Authorization Required</h2>
          <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            The route <code className="px-1.5 py-0.5 rounded bg-slate-800/20 text-xs font-mono">/admin/payments</code> is restricted strictly to authorized SnapFind administrators (<code className="text-xs">ash.mary.2006@gmail.com</code>).
          </p>

          <div className="flex flex-col gap-3">
            <button
              id="admin-auth-login-btn"
              type="button"
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Administrator Account
            </button>
            <button
              id="admin-back-dashboard-btn"
              type="button"
              onClick={() => onNavigate("dashboard")}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition cursor-pointer border ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHORIZED ADMIN PAYMENTS VIEW
  // ----------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Manual Payments Management</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Lock className="w-3 h-3" /> Admin Protected
                </span>
              </div>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Authoritative verification hub for PKR 7,999 Lifetime Pro manual payment submissions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="admin-payments-refresh-btn"
            type="button"
            onClick={fetchAdminData}
            disabled={loading}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDark
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-500" : ""}`} />
            {loading ? "Syncing..." : "Refresh Queue"}
          </button>
          <button
            id="admin-payments-back-btn"
            type="button"
            onClick={() => onNavigate("account")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isDark
                ? "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Account Page
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-medium text-slate-400">Pending Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-500">{pendingCount}</span>
            <span className="text-xs text-slate-400">requests</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting admin decision</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-medium text-slate-400">Approved & Active</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-500">{approvedCount}</span>
            <span className="text-xs text-slate-400">upgraded</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Lifetime Pro unlocked</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-medium text-slate-400">Rejected</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-500">{rejectedCount}</span>
            <span className="text-xs text-slate-400">declined</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Reason stored & notified</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <span className="text-xs font-medium text-slate-400">Total Verified PKR</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-500">
              PKR {(approvedCount * 7999).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Lifetime revenue realized</p>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div
        className={`p-4 rounded-2xl border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            id="admin-tab-pending"
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === "pending"
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-xs font-bold"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "pending" ? "bg-amber-500 text-slate-950" : "bg-slate-800/40 text-slate-400"
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            id="admin-tab-approved"
            type="button"
            onClick={() => setActiveTab("approved")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === "approved"
                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 shadow-xs font-bold"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "approved" ? "bg-emerald-500 text-slate-950" : "bg-slate-800/40 text-slate-400"
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            id="admin-tab-rejected"
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === "rejected"
                ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 shadow-xs font-bold"
                : isDark
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "rejected" ? "bg-rose-500 text-white" : "bg-slate-800/40 text-slate-400"
              }`}
            >
              {rejectedCount}
            </span>
          </button>
        </div>

        {/* Search & Method Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Method Filter Dropdown */}
          <select
            id="admin-method-filter-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
              isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <option value="all">All Payment Methods</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="bank">Bank Transfer</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="admin-search-requests-input"
              type="text"
              placeholder="Search User, Email, Tx ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs pl-8 pr-8 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Requests List View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>Loading payment requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div
          className={`py-16 px-4 text-center rounded-2xl border ${
            isDark ? "bg-slate-900/20 border-slate-800" : "bg-slate-50/50 border-slate-200"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold mb-1">No {activeTab} payment requests found</h3>
          <p className={`text-xs max-w-md mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {searchQuery || methodFilter !== "all"
              ? "No payment records match your active search filters."
              : activeTab === "pending"
              ? "All submitted manual payments have been reviewed! New submissions will appear here automatically."
              : `No payment requests are currently marked as ${activeTab}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const txId = req.transaction_id || req.transactionId || "N/A";
            const userEmail = req.user_email || req.userEmail || "Unknown Email";
            const userName = req.user_name || req.userName || userEmail.split("@")[0] || "User";
            const planName = req.plan === "lifetime" ? "Lifetime Pro" : req.plan || "Lifetime Pro";
            const amount = req.amount || 7999;
            const currency = req.currency || "PKR";
            const method = req.payment_method || req.paymentMethod || "Easypaisa";
            const receiptUrl = req.receipt_url || req.receiptUrl;
            const submittedDate = req.submitted_at || req.submittedAt || req.created_at || req.createdAt;
            const formattedDate = submittedDate ? new Date(submittedDate).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }) : "N/A";
            const isEasypaisa = method.toLowerCase().includes("easypaisa");

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-5 transition-all ${
                  isDark ? "bg-slate-900/70 border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:shadow-md"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: User, Plan, Details */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* User Avatar Initials */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-sm uppercase">
                      {userName.slice(0, 2)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Name & Plan Badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm truncate">{userName}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                          💎 {planName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                          {currency} {amount.toLocaleString()}
                        </span>
                      </div>

                      {/* User Email */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Email:</span>
                        <span className={`font-mono ${isDark ? "text-slate-200" : "text-slate-700"}`}>{userEmail}</span>
                      </div>

                      {/* Payment Method & Transaction ID */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                        {/* Method badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50">
                          {isEasypaisa ? (
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span className="font-medium">{method}</span>
                        </div>

                        {/* Transaction ID with 1-click copy */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50">
                          <span className="text-slate-400">Tx ID:</span>
                          <code className="font-mono text-amber-400 font-bold">{txId}</code>
                          <button
                            type="button"
                            onClick={() => handleCopyTxId(txId)}
                            title="Copy Transaction ID"
                            className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                          >
                            {copiedTxId === txId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Sender info if provided */}
                        {(req.sender_name || req.senderName || req.sender_account || req.senderAccount) && (
                          <div className="text-[11px] text-slate-400">
                            Sender: {req.sender_name || req.senderName || ""} (
                            {req.sender_account || req.senderAccount || ""})
                          </div>
                        )}
                      </div>

                      {/* Submission Date & Status Details */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>Submitted: {formattedDate}</span>
                        {req.verified_at && (
                          <span className="text-emerald-400">
                            • Verified: {new Date(req.verified_at).toLocaleDateString()} by {req.verified_by || "Admin"}
                          </span>
                        )}
                        {req.rejection_reason && (
                          <span className="text-rose-400">
                            • Reason: {req.rejection_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Receipt Image Thumbnail */}
                  <div className="flex items-center gap-4 shrink-0">
                    {receiptUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => setZoomedReceiptReq(req)}>
                        <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950/50 flex items-center justify-center relative">
                          <img
                            src={receiptUrl}
                            alt="Payment receipt proof"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="text-[10px] text-center block text-slate-400 group-hover:text-blue-400 mt-0.5">
                          View Receipt
                        </span>
                      </div>
                    ) : (
                      <div className="w-24 h-16 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-500">
                        <FileText className="w-4 h-4 mb-0.5" />
                        No receipt
                      </div>
                    )}

                    {/* Right Column: Status & Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[140px] justify-center">
                      {req.status === "pending" ? (
                        <>
                          <button
                            id={`approve-btn-${req.id}`}
                            type="button"
                            onClick={() => setSelectedApproveReq(req)}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve Pro
                          </button>
                          <button
                            id={`reject-btn-${req.id}`}
                            type="button"
                            onClick={() => handleOpenRejectModal(req)}
                            disabled={isProcessing}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      ) : req.status === "approved" ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approved & Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold justify-center">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===================================================== */}
      {/* APPROVE CONFIRMATION MODAL                            */}
      {/* ===================================================== */}
      <AnimatePresence>
        {selectedApproveReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold">Confirm Payment Approval</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApproveReq(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-xs mb-4 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                You are about to activate permanent <strong>Lifetime Pro</strong> entitlement for:
              </p>

              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 mb-6 ${
                  isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-slate-400">User Email:</span>
                  <span className="font-semibold">{selectedApproveReq.user_email || selectedApproveReq.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <code className="font-mono text-amber-400 font-bold">
                    {selectedApproveReq.transaction_id || selectedApproveReq.transactionId}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan & Amount:</span>
                  <span className="font-semibold text-emerald-400">Lifetime Pro (PKR 7,999)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expiry Policy:</span>
                  <span className="font-medium text-blue-400">Permanent (expires_at = null)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Screenshots:</span>
                  <span className="font-medium text-blue-400">Unlimited capacity</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedApproveReq(null)}
                  disabled={isProcessing}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isDark
                      ? "border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  id="confirm-approve-action-btn"
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {isProcessing ? "Activating..." : "Approve Lifetime Pro"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================== */}
      {/* REJECT MODAL WITH PRESETS                             */}
      {/* ===================================================== */}
      <AnimatePresence>
        {selectedRejectReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold">Reject Payment Request</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRejectReq(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-xs mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Rejecting this request will keep the user's current plan unchanged and dispatch an explanatory notification.
              </p>

              {/* Quick Preset Buttons */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Quick Reason Preset:
                </label>
                <div className="space-y-1.5">
                  {REJECTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(preset);
                        setRejectionReason(preset);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-[11px] transition border cursor-pointer ${
                        selectedPreset === preset
                          ? "bg-rose-500/15 border-rose-500/30 text-rose-300 font-medium"
                          : isDark
                          ? "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason Textarea */}
              <div className="mb-5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Rejection Reason (Sent to User):
                </label>
                <textarea
                  id="rejection-reason-textarea"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter specific rejection reason..."
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none ${
                    isDark
                      ? "bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRejectReq(null)}
                  disabled={isProcessing}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isDark
                      ? "border-slate-800 text-slate-300 hover:bg-slate-800"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  id="confirm-reject-action-btn"
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================== */}
      {/* RECEIPT ZOOM LIGHTBOX MODAL                           */}
      {/* ===================================================== */}
      <AnimatePresence>
        {zoomedReceiptReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Receipt Proof — {zoomedReceiptReq.user_email || zoomedReceiptReq.userEmail}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Transaction ID: {zoomedReceiptReq.transaction_id || zoomedReceiptReq.transactionId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {zoomedReceiptReq.receipt_url && (
                    <a
                      href={zoomedReceiptReq.receipt_url}
                      download={`receipt_${zoomedReceiptReq.transaction_id || "snapfind"}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setZoomedReceiptReq(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/70">
                {zoomedReceiptReq.receipt_url ? (
                  <img
                    src={zoomedReceiptReq.receipt_url}
                    alt="Receipt Screenshot Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[70vh] w-auto object-contain rounded-lg border border-slate-800 shadow-lg"
                  />
                ) : (
                  <p className="text-slate-400 text-sm">No receipt image attached.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
