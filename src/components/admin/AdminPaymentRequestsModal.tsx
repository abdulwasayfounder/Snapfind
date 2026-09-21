import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Building2,
  ExternalLink,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PaymentRequest, PaymentRequestStatus, UserProfile } from "../../types";
import { ManualPaymentService, AdminReviewStats } from "../../services/billing/ManualPaymentService";

interface AdminPaymentRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  isDark: boolean;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
  onPaymentApproved?: () => void;
}

export const AdminPaymentRequestsModal: React.FC<AdminPaymentRequestsModalProps> = ({
  isOpen,
  onClose,
  user,
  isDark,
  addToast,
  onPaymentApproved,
}) => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [stats, setStats] = useState<AdminReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmountPkr: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | PaymentRequestStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Reject Modal State
  const [selectedRejectReq, setSelectedRejectReq] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Zoom Modal
  const [zoomedReceiptUrl, setZoomedReceiptUrl] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await ManualPaymentService.getAllPaymentRequests();
      setRequests(res.requests);
      setStats(res.stats);
    } catch (e) {
      console.warn("[AdminPaymentRequests] Error fetching:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const adminEmail = user?.email || "ash.mary.2006@gmail.com";

  const handleApprove = async (req: PaymentRequest) => {
    if (!window.confirm(`Approve payment request for ${req.user_email || req.user_id}?\n\nTransaction ID: ${req.transaction_id || req.transactionId}\nAmount: PKR 7,999\n\nThis will activate Lifetime Pro for the user immediately.`)) {
      return;
    }

    try {
      setIsProcessing(true);
      const res = await ManualPaymentService.approvePaymentRequest(req.id, adminEmail);

      if (res.success) {
        addToast?.({
          title: "Payment Approved! ✅",
          description: `Lifetime Pro activated for ${req.user_email || req.user_id}.`,
          type: "success",
        });
        await fetchAdminData();
        onPaymentApproved?.();
      } else {
        addToast?.({
          title: "Approval Failed",
          description: res.error || "Could not approve payment.",
          type: "error",
        });
      }
    } catch (err: any) {
      addToast?.({
        title: "Error",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectModal = (req: PaymentRequest) => {
    setSelectedRejectReq(req);
    setRejectionReason("Transaction ID could not be found in our bank/Easypaisa statement.");
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectReq) return;

    try {
      setIsProcessing(true);
      const res = await ManualPaymentService.rejectPaymentRequest(
        selectedRejectReq.id,
        rejectionReason.trim() || "Payment could not be verified.",
        adminEmail
      );

      if (res.success) {
        addToast?.({
          title: "Payment Rejected",
          description: `Payment marked as rejected.`,
          type: "info",
        });
        setSelectedRejectReq(null);
        await fetchAdminData();
      } else {
        addToast?.({
          title: "Rejection Failed",
          description: res.error || "Could not reject payment.",
          type: "error",
        });
      }
    } catch (err: any) {
      addToast?.({
        title: "Error",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered list
  const filteredRequests = requests.filter((r) => {
    const matchesFilter = filterStatus === "all" || r.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFilter;

    const matchesSearch =
      (r.transaction_id || r.transactionId || "").toLowerCase().includes(q) ||
      (r.user_email || r.userEmail || "").toLowerCase().includes(q) ||
      (r.user_name || r.userName || "").toLowerCase().includes(q) ||
      (r.sender_account || r.senderAccount || "").toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div
      id="admin-payment-requests-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`relative w-full max-w-4xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          isDark ? "bg-[#18181b] border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-100 bg-zinc-50"}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold">Admin Manual Payment Review</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Easypaisa & Bank IBFT
                </span>
              </div>
              <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Verify customer transactions and approve Lifetime Pro entitlements (PKR 7,999)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
              }`}
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`p-4 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 ${isDark ? "border-zinc-800 bg-zinc-900/30" : "border-zinc-100 bg-zinc-50/50"}`}>
          <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <span className="text-[11px] text-zinc-400 block">Pending Review</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-bold text-amber-500">{stats.pending}</span>
              <span className="text-xs text-zinc-500">requests</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <span className="text-[11px] text-zinc-400 block">Approved</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-bold text-emerald-400">{stats.approved}</span>
              <span className="text-xs text-zinc-500">pro users</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <span className="text-[11px] text-zinc-400 block">Rejected</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-bold text-red-400">{stats.rejected}</span>
              <span className="text-xs text-zinc-500">requests</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <span className="text-[11px] text-zinc-400 block">Revenue Collected</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-base font-bold text-emerald-400">PKR {stats.totalAmountPkr.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 w-full sm:w-auto">
            {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterStatus === tab
                    ? "bg-amber-500 text-zinc-950 font-bold"
                    : isDark
                    ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {tab}
                {tab === "pending" && stats.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search TID, email, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border transition-colors ${
                isDark ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400"
              }`}
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No payment requests found matching your filter.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const reqId = req.id;
              const method = req.payment_method || req.paymentMethod || "manual";
              const txId = req.transaction_id || req.transactionId;
              const receipt = req.receipt_url || req.receiptUrl;
              const dateStr = new Date(req.submitted_at || req.submittedAt || req.created_at || Date.now()).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={reqId}
                  className={`p-4 rounded-xl border transition-all ${
                    req.status === "pending"
                      ? isDark
                        ? "bg-zinc-900/90 border-amber-500/30 shadow-md shadow-amber-500/5"
                        : "bg-amber-50/40 border-amber-200"
                      : isDark
                      ? "bg-zinc-900/40 border-zinc-800/80"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs bg-zinc-800 text-zinc-300 mt-0.5">
                        {method === "easypaisa" ? <Smartphone className="w-4 h-4 text-emerald-400" /> : <Building2 className="w-4 h-4 text-blue-400" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-amber-400 font-mono">TRX: {txId}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-300">
                            {method.replace("_", " ")}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-500/10">
                            PKR 7,999
                          </span>
                        </div>

                        <div className="text-xs text-zinc-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>User: <strong className="font-semibold text-white">{req.user_email || req.userEmail || req.user_id}</strong></span>
                          {req.sender_account && (
                            <span className="text-zinc-400">Sender: <strong className="font-medium text-zinc-200">{req.sender_account}</strong></span>
                          )}
                          {req.sender_name && (
                            <span className="text-zinc-400">({req.sender_name})</span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-500 flex items-center space-x-3 pt-0.5">
                          <span>Submitted: {dateStr}</span>
                          {req.verified_at && <span>Verified: {new Date(req.verified_at).toLocaleDateString()}</span>}
                          {req.verified_by && <span>By: {req.verified_by}</span>}
                        </div>

                        {req.notes && (
                          <p className="text-[11px] text-zinc-400 italic bg-zinc-800/40 px-2 py-1 rounded inline-block mt-1">
                            Note: "{req.notes}"
                          </p>
                        )}

                        {req.rejection_reason && (
                          <p className="text-[11px] text-red-400 font-medium pt-1">
                            Rejection Reason: {req.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions & Receipt */}
                    <div className="flex items-center space-x-2 sm:self-center">
                      {receipt && (
                        <button
                          onClick={() => setZoomedReceiptUrl(receipt)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      )}

                      {req.status === "pending" && (
                        <>
                          <button
                            id={`approve-payment-btn-${reqId}`}
                            onClick={() => handleApprove(req)}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Pro</span>
                          </button>
                          <button
                            id={`reject-payment-btn-${reqId}`}
                            onClick={() => handleOpenRejectModal(req)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {req.status === "approved" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lifetime Active</span>
                        </span>
                      )}

                      {req.status === "rejected" && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Reject Modal Dialog */}
      <AnimatePresence>
        {selectedRejectReq && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
                isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
              }`}
            >
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-bold text-sm">Reject Payment Request</h4>
              </div>

              <p className="text-xs text-zinc-400">
                Please specify the rejection reason for TRX <strong>{selectedRejectReq.transaction_id || selectedRejectReq.transactionId}</strong>. The user will see this message.
              </p>

              <div>
                <label className="block text-xs font-semibold mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-300 text-zinc-900"
                  }`}
                  placeholder="e.g. Transaction ID not found in bank statement, or payment amount was incorrect."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setSelectedRejectReq(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-white transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoom Receipt Image */}
      <AnimatePresence>
        {zoomedReceiptUrl && (
          <div
            onClick={() => setZoomedReceiptUrl(null)}
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 cursor-pointer"
          >
            <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-zinc-800">
              <img src={zoomedReceiptUrl} alt="Receipt Full" className="w-full h-auto object-contain max-h-[80vh]" />
              <button
                onClick={() => setZoomedReceiptUrl(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
