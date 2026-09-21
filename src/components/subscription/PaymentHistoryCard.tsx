import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Smartphone,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PaymentRequest, UserProfile } from "../../types";
import { ManualPaymentService } from "../../services/billing/ManualPaymentService";

interface PaymentHistoryCardProps {
  user: UserProfile | null;
  isDark: boolean;
  onOpenUpgradeModal?: () => void;
  addToast?: (toast: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

export const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  user,
  isDark,
  onOpenUpgradeModal,
  addToast,
}) => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!user || user.id === "guest" || user.id.startsWith("local-guest")) {
      setRequests([]);
      return;
    }

    try {
      setLoading(true);
      const list = await ManualPaymentService.getMyPaymentRequests(user.id);
      setRequests(list);
    } catch (e) {
      console.warn("[PaymentHistory] Error fetching:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  if (!user || user.id === "guest" || user.id.startsWith("local-guest") || requests.length === 0) {
    return null;
  }

  return (
    <div
      id="manual-payment-history-card"
      className={`rounded-2xl border p-5 transition-all ${
        isDark ? "bg-[#18181b] border-zinc-800" : "bg-white border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Manual Payment History</h4>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Your Lifetime Pro payment confirmation submissions
            </p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className={`p-2 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
            isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
          }`}
          title="Refresh payment status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        {requests.map((req) => {
          const reqId = req.id;
          const status = req.status;
          const isExpanded = expandedId === reqId;
          const method = req.payment_method || req.paymentMethod || "manual";
          const txId = req.transaction_id || req.transactionId;
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
              className={`rounded-xl border overflow-hidden transition-colors ${
                isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              }`}
            >
              {/* Main Summary Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : reqId)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-90"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-zinc-800 text-zinc-300">
                    {method === "easypaisa" ? <Smartphone className="w-4 h-4 text-emerald-400" /> : <Building2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold">Lifetime Pro (PKR 7,999)</span>
                      <span className="text-[10px] text-zinc-500 capitalize">• {method.replace("_", " ")}</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400">TRX: {txId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Status Badge */}
                  {status === "pending" && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center space-x-1">
                      <Clock className="w-3 h-3 animate-pulse" />
                      <span>Pending Review</span>
                    </span>
                  )}
                  {status === "approved" && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approved</span>
                    </span>
                  )}
                  {status === "rejected" && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center space-x-1">
                      <XCircle className="w-3 h-3" />
                      <span>Rejected</span>
                    </span>
                  )}

                  {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`p-3.5 border-t text-xs space-y-2.5 ${
                      isDark ? "border-zinc-800 bg-zinc-950/40 text-zinc-300" : "border-zinc-200 bg-white text-zinc-700"
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block">Submitted At</span>
                        <span className="font-medium">{dateStr}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Sender Account</span>
                        <span className="font-medium">{req.sender_account || req.senderAccount || "—"}</span>
                      </div>
                      {req.sender_name && (
                        <div>
                          <span className="text-zinc-500 block">Sender Name</span>
                          <span className="font-medium">{req.sender_name}</span>
                        </div>
                      )}
                      {req.verified_at && (
                        <div>
                          <span className="text-zinc-500 block">Verified At</span>
                          <span className="font-medium">{new Date(req.verified_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {status === "rejected" && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        <span className="font-bold block mb-0.5">Rejection Reason:</span>
                        <span>{req.rejection_reason || req.rejectionReason || "Payment could not be verified in bank records."}</span>
                        {onOpenUpgradeModal && (
                          <button
                            onClick={onOpenUpgradeModal}
                            className="mt-2 text-xs font-bold underline block text-amber-400 hover:text-amber-300"
                          >
                            Resubmit with correct Transaction ID →
                          </button>
                        )}
                      </div>
                    )}

                    {status === "approved" && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 flex-shrink-0" />
                        <span>Lifetime Pro is permanently active with unlimited screenshot indexing!</span>
                      </div>
                    )}

                    {status === "pending" && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center space-x-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>Our verification team checks bank & Easypaisa statements regularly. Average turnaround is 15-60 mins.</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
