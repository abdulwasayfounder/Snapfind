import { supabase, isSupabaseConfigured } from "../supabase";
import { PaymentRequest, ManualPaymentMethod, PaymentAccountDetails, UserEntitlement } from "../../types";
import { SubscriptionManager } from "./SubscriptionManager";

// Secure placeholders - Sensitive payment credentials are not hardcoded in source code
// and are fetched from server environment variables (/api/payment-requests/accounts)
export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountDetails[] = [
  {
    id: "easypaisa",
    title: "Easypaisa",
    accountTitle: "EASYPAISA_ACCOUNT_NAME", // Account name
    accountNumber: "EASYPAISA_ACCOUNT_NUMBER", // Account number
    instructions: [
      "Open your Easypaisa Mobile App.",
      "Select 'Send Money' -> 'Easypaisa Mobile Account'.",
      "Enter Receiver Mobile Number: EASYPAISA_ACCOUNT_NUMBER (Account Name: EASYPAISA_ACCOUNT_NAME).",
      "Enter exact amount: PKR 7,999.",
      "Save the 11-digit Transaction ID (TID) from the SMS or Receipt.",
      "Submit your Transaction ID and optional receipt screenshot below for admin verification.",
    ],
    badge: "Mobile Wallet",
  },
  {
    id: "bank_transfer",
    title: "Bank Transfer (IBFT / Raast)",
    bankName: "BANK_NAME", // Bank name
    accountTitle: "BANK_ACCOUNT_TITLE", // Account title
    accountNumber: "BANK_IBAN", // Account number / IBAN
    iban: "BANK_IBAN", // IBAN
    instructions: [
      "Open your Bank's Mobile App or Online Banking Portal.",
      "Select 'Transfer Money' -> 'Interbank Funds Transfer (IBFT)' or 'Raast'.",
      "Select Destination Bank: BANK_NAME.",
      "Enter IBAN: BANK_IBAN.",
      "Verify Account Title: BANK_ACCOUNT_TITLE.",
      "Transfer PKR 7,999 and copy the Transaction Reference / UTR Number.",
      "Submit the confirmation form below with your Transaction ID.",
    ],
    badge: "All Pakistani Banks Supported",
  },
];

export interface SubmitPaymentParams {
  userId: string;
  userEmail?: string;
  userName?: string;
  paymentMethod: ManualPaymentMethod;
  transactionId: string;
  receiptUrl?: string | null;
  senderAccount?: string | null;
  senderName?: string | null;
  notes?: string | null;
}

export interface PaymentSubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
  paymentRequest?: PaymentRequest;
}

export interface AdminReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmountPkr: number;
}

class ManualPaymentServiceEngine {
  private localRequests: PaymentRequest[] = [];
  private cachedAccounts: PaymentAccountDetails[] = [...DEFAULT_PAYMENT_ACCOUNTS];
  private isFetchingAccounts = false;

  /**
   * Fetch payment accounts dynamically from secure server endpoint
   */
  public async fetchPaymentAccounts(): Promise<PaymentAccountDetails[]> {
    if (this.isFetchingAccounts) return this.cachedAccounts;
    try {
      this.isFetchingAccounts = true;
      const res = await fetch("/api/payment-requests/accounts");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts) && data.accounts.length > 0) {
          this.cachedAccounts = data.accounts;
        }
      }
    } catch (e) {
      console.warn("[ManualPaymentService] Could not fetch server payment config, using placeholders:", e);
    } finally {
      this.isFetchingAccounts = false;
    }
    return this.cachedAccounts;
  }

  /**
   * Get available payment accounts & step-by-step instructions
   */
  public getPaymentAccounts(): PaymentAccountDetails[] {
    return this.cachedAccounts;
  }

  /**
   * Submit a manual payment confirmation request
   * Status becomes 'pending'. User does NOT receive Pro until admin approves.
   */
  public async submitPaymentRequest(params: SubmitPaymentParams): Promise<PaymentSubmissionResult> {
    if (!params.userId || params.userId === "guest" || params.userId.startsWith("local-guest")) {
      return {
        success: false,
        error: "Please sign in or create an account before submitting a payment confirmation.",
      };
    }

    const trimmedTxId = params.transactionId?.trim();
    if (!trimmedTxId || trimmedTxId.length < 4) {
      return {
        success: false,
        error: "Please enter a valid Transaction ID or Reference Number (at least 4 characters).",
      };
    }

    try {
      // 1. Call server endpoint to record and validate
      const response = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: params.userId,
          userEmail: params.userEmail || "",
          userName: params.userName || "",
          paymentMethod: params.paymentMethod,
          transactionId: trimmedTxId,
          receiptUrl: params.receiptUrl || null,
          senderAccount: params.senderAccount || null,
          senderName: params.senderName || null,
          notes: params.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to submit payment confirmation. Please verify your details.",
        };
      }

      if (data.paymentRequest) {
        this.cacheRequest(data.paymentRequest);
      }

      return {
        success: true,
        message: data.message || "Payment request submitted successfully. Status: Pending Admin Verification.",
        paymentRequest: data.paymentRequest,
      };
    } catch (err: any) {
      console.warn("[ManualPaymentService] Server submission error, trying Supabase direct:", err);

      // Fallback direct Supabase insert if server is unreachable
      if (isSupabaseConfigured) {
        try {
          const nowIso = new Date().toISOString();
          const { data, error } = await supabase
            .from("payment_requests")
            .insert({
              user_id: params.userId,
              user_email: params.userEmail,
              user_name: params.userName,
              plan: "lifetime",
              amount: 7999,
              currency: "PKR",
              payment_method: params.paymentMethod,
              transaction_id: trimmedTxId,
              receipt_url: params.receiptUrl,
              sender_account: params.senderAccount,
              sender_name: params.senderName,
              notes: params.notes,
              status: "pending",
              submitted_at: nowIso,
            })
            .select()
            .single();

          if (error) {
            return {
              success: false,
              error: error.message || "Failed to submit payment request via Supabase.",
            };
          }

          if (data) {
            this.cacheRequest(data);
          }

          return {
            success: true,
            message: "Payment request submitted successfully. Status: Pending Admin Verification.",
            paymentRequest: data,
          };
        } catch (supErr: any) {
          return {
            success: false,
            error: supErr.message || "Could not submit payment request.",
          };
        }
      }

      return {
        success: false,
        error: err.message || "Network error submitting payment request.",
      };
    }
  }

  /**
   * Get user's own payment requests
   */
  public async getMyPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    if (!userId || userId === "guest") return [];

    try {
      const res = await fetch(`/api/payment-requests/my`, {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.paymentRequests)) {
          return data.paymentRequests;
        }
      }
    } catch (e) {
      console.warn("[ManualPaymentService] Error fetching user payment requests from server:", e);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("payment_requests")
          .select("*")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          return data as PaymentRequest[];
        }
      } catch (e) {
        console.warn("[ManualPaymentService] Error fetching user payment requests from Supabase:", e);
      }
    }

    return this.localRequests.filter((r) => r.user_id === userId || r.userId === userId);
  }

  /**
   * Admin: Get all payment requests
   */
  public async getAllPaymentRequests(adminEmail: string = "ash.mary.2006@gmail.com"): Promise<{ requests: PaymentRequest[]; stats: AdminReviewStats }> {
    try {
      const headers: Record<string, string> = {
        "x-admin-email": adminEmail,
      };
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.access_token) {
            headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
          }
        } catch {}
      }

      const res = await fetch("/api/admin/payment-requests", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            requests: data.paymentRequests || [],
            stats: data.stats || {
              total: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              totalAmountPkr: 0,
            },
          };
        }
      }
    } catch (e) {
      console.warn("[ManualPaymentService] Admin fetch error from server:", e);
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("payment_requests")
          .select("*")
          .order("submitted_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          const reqs = data as PaymentRequest[];
          const pending = reqs.filter((r) => r.status === "pending").length;
          const approved = reqs.filter((r) => r.status === "approved").length;
          const rejected = reqs.filter((r) => r.status === "rejected").length;
          return {
            requests: reqs,
            stats: {
              total: reqs.length,
              pending,
              approved,
              rejected,
              totalAmountPkr: approved * 7999,
            },
          };
        }
      } catch (e) {
        console.warn("[ManualPaymentService] Admin fetch error from Supabase:", e);
      }
    }

    const pending = this.localRequests.filter((r) => r.status === "pending").length;
    const approved = this.localRequests.filter((r) => r.status === "approved").length;
    const rejected = this.localRequests.filter((r) => r.status === "rejected").length;

    return {
      requests: this.localRequests,
      stats: {
        total: this.localRequests.length,
        pending,
        approved,
        rejected,
        totalAmountPkr: approved * 7999,
      },
    };
  }

  /**
   * Admin: Approve Payment Request
   * Sets status to approved, activates Lifetime Pro in database & server
   */
  public async approvePaymentRequest(
    requestId: string,
    adminEmail: string = "ash.mary.2006@gmail.com"
  ): Promise<{ success: boolean; message?: string; error?: string; entitlement?: UserEntitlement }> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-email": adminEmail,
      };
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.access_token) {
            headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
          }
        } catch {}
      }

      const res = await fetch(`/api/admin/payment-requests/${requestId}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ adminEmail, adminIdentifier: adminEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to approve payment request.",
        };
      }

      // Refresh current user's entitlement in case admin approved self
      await SubscriptionManager.syncEntitlementsFromServer();

      return {
        success: true,
        message: data.message || "Payment request approved and Lifetime Pro activated.",
        entitlement: data.entitlement,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to approve payment request.",
      };
    }
  }

  /**
   * Admin: Reject Payment Request
   */
  public async rejectPaymentRequest(
    requestId: string,
    rejectionReason: string,
    adminEmail: string = "ash.mary.2006@gmail.com"
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-email": adminEmail,
      };
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.access_token) {
            headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
          }
        } catch {}
      }

      const res = await fetch(`/api/admin/payment-requests/${requestId}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          rejectionReason,
          adminEmail,
          adminIdentifier: adminEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to reject payment request.",
        };
      }

      return {
        success: true,
        message: data.message || "Payment request rejected.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to reject payment request.",
      };
    }
  }

  private cacheRequest(req: PaymentRequest) {
    const idx = this.localRequests.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      this.localRequests[idx] = req;
    } else {
      this.localRequests.unshift(req);
    }
  }
}

export const ManualPaymentService = new ManualPaymentServiceEngine();
