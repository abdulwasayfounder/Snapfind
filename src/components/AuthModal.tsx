import React, { useState, useEffect } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  X,
  User,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  LogOut,
  AlertCircle,
  ArrowLeft,
  RotateCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  onClose: () => void;
  isDark: boolean;
  addToast?: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
  onSignupSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, isDark: _isDark, addToast, onSignupSuccess }) => {
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
    signInWithGoogle,
    signOut,
    isConfigured,
    resetPassword,
    changePassword,
    isRecoveryMode,
    setIsRecoveryMode,
  } = useAuth();

  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot_password" | "reset_password">(
    isRecoveryMode ? "reset_password" : "login"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUnconfirmedUser, setIsUnconfirmedUser] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    if (isRecoveryMode) {
      setAuthMode("reset_password");
    }
  }, [isRecoveryMode]);

  const validateEmailFormat = (emailStr: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  const handleModeChange = (newMode: "login" | "register" | "forgot_password" | "reset_password") => {
    setAuthMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUnconfirmedUser(false);
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your email address to resend verification.");
      return;
    }
    setResendingVerification(true);
    setErrorMessage(null);
    try {
      const res = await resendVerificationEmail(email);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(`A new verification link has been sent to ${email.trim()}. Please check your inbox.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend verification email.");
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUnconfirmedUser(false);

    // Validation checks
    if (authMode !== "reset_password" && !validateEmailFormat(email)) {
      setErrorMessage("Please enter a valid email address (e.g., name@example.com).");
      return;
    }

    if (authMode === "register" || authMode === "login" || authMode === "reset_password") {
      if (!password) {
        setErrorMessage("Password cannot be empty.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
    }

    if (authMode === "register") {
      if (!name.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match. Please re-enter.");
        return;
      }
    }

    if (authMode === "reset_password") {
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match. Please re-enter.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (authMode === "login") {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setErrorMessage(res.error);
          if (res.isUnconfirmedEmail) {
            setIsUnconfirmedUser(true);
          }
        } else {
          if (addToast) addToast({ title: "Signed In Successfully", type: "success" });
          onClose();
        }
      } else if (authMode === "register") {
        const res = await signUpWithEmail(email, password, name);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.requiresVerification) {
          setSuccessMessage(
            res.message ||
              "Registration successful! A verification email has been sent to your address. Please verify your email before logging in."
          );
          if (addToast) {
            addToast({
              title: "Verification Email Sent",
              description: "Please check your inbox to confirm your account.",
              type: "success",
            });
          }
          // Clear inputs but stay on message
          setPassword("");
          setConfirmPassword("");
        } else {
          if (addToast) addToast({ title: "Account Created & Signed In", type: "success" });
          onClose();
          if (onSignupSuccess) {
            onSignupSuccess();
          }
        }
      } else if (authMode === "forgot_password") {
        const res = await resetPassword(email);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setSuccessMessage(
            `Password reset link sent to ${email.trim()}. Please check your email inbox to proceed.`
          );
          if (addToast) {
            addToast({
              title: "Reset Link Sent",
              description: `Check ${email.trim()} for instructions.`,
              type: "success",
            });
          }
        }
      } else if (authMode === "reset_password") {
        const res = await changePassword(password);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setIsRecoveryMode(false);
          setSuccessMessage("Password successfully updated! You can now sign in with your new password.");
          if (addToast) {
            addToast({
              title: "Password Updated",
              description: "Your new password has been set.",
              type: "success",
            });
          }
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        if (addToast) addToast({ title: "Google OAuth Triggered", type: "success" });
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Google authentication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (addToast) addToast({ title: "Signed Out", type: "info" });
    onClose();
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-[#30363D] bg-[#171A1D] text-[#F5F7FA] p-6 space-y-5 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#A7B0BA] hover:text-[#F5F7FA] hover:bg-[#1E2226] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <SnapFindLogo className="w-10 h-10 rounded-xl object-contain border border-[#30363D] bg-[#101214]" />
          <div>
            <h2 className="text-base font-semibold text-[#F5F7FA]">
              {authMode === "forgot_password"
                ? "Reset Password"
                : authMode === "reset_password"
                ? "Set New Password"
                : authMode === "register"
                ? "Create Account"
                : "Sign In"}
            </h2>
            <p className="text-xs text-[#A7B0BA]">
              {user?.isLoggedIn
                ? `Active account: ${user.email}`
                : authMode === "forgot_password"
                ? "Enter your email to receive a recovery link"
                : authMode === "reset_password"
                ? "Choose a strong password for your vault"
                : authMode === "register"
                ? "Free account with private local storage"
                : isConfigured
                ? "Secure authentication via Supabase"
                : "Local storage mode active"}
            </p>
          </div>
        </div>

        {user?.isLoggedIn && authMode !== "reset_password" ? (
          /* User Logged In Profile Card */
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-xl border border-[#30363D] bg-[#1E2226] flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#171A1D] border border-[#30363D] text-[#00D4FF] font-semibold text-base flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-[#F5F7FA] truncate">{user.name}</h3>
                <p className="text-xs text-[#A7B0BA] truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 text-xs text-[#22C55E] mt-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Session Active ({user.plan || "Free"})</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              type="button"
              className="w-full py-2.5 rounded-xl border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        ) : (
          /* Login / Register / Forgot Password Forms */
          <div className="space-y-4">
            {/* Tab Switcher for login / register */}
            {(authMode === "login" || authMode === "register") && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#1E2226] border border-[#30363D] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleModeChange("login")}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    authMode === "login"
                      ? "bg-[#171A1D] text-[#00D4FF] font-semibold border border-[#30363D]"
                      : "text-[#A7B0BA] hover:text-[#F5F7FA]"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("register")}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    authMode === "register"
                      ? "bg-[#171A1D] text-[#00D4FF] font-semibold border border-[#30363D]"
                      : "text-[#A7B0BA] hover:text-[#F5F7FA]"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}

            {/* Back button if in forgot password mode */}
            {authMode === "forgot_password" && (
              <button
                type="button"
                onClick={() => handleModeChange("login")}
                className="inline-flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00B8D9] transition-colors font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            )}

            {/* Google OAuth Button */}
            {(authMode === "login" || authMode === "register") && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#30363D] bg-[#1E2226] hover:bg-[#262C32] text-[#F5F7FA] font-medium text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-1">
                  <div className="border-t border-[#30363D] w-full" />
                  <span className="bg-[#171A1D] px-2 text-[10px] font-semibold text-[#A7B0BA] uppercase tracking-wider">
                    Or with email
                  </span>
                </div>
              </>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444] text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <p>{errorMessage}</p>
                  {isUnconfirmedUser && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="inline-flex items-center gap-1 text-xs text-[#00D4FF] hover:underline font-medium cursor-pointer"
                    >
                      <RotateCw className={`w-3 h-3 ${resendingVerification ? "animate-spin" : ""}`} />
                      <span>{resendingVerification ? "Sending link..." : "Resend confirmation email"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success banner */}
            {successMessage && (
              <div className="p-3 rounded-xl border border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <p>{successMessage}</p>
                  {authMode === "register" && (
                    <button
                      type="button"
                      onClick={() => handleModeChange("login")}
                      className="text-xs text-[#00D4FF] hover:underline font-semibold cursor-pointer"
                    >
                      Go to Sign In
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name field (register only) */}
              {authMode === "register" && (
                <div className="space-y-1 text-xs">
                  <label className="font-medium text-[#A7B0BA]">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A7B0BA]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      disabled={isSubmitting}
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#30363D] bg-[#1E2226] text-[#F5F7FA] placeholder-[#6B7280] focus:border-[#00D4FF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email field (for login, register, forgot_password) */}
              {authMode !== "reset_password" && (
                <div className="space-y-1 text-xs">
                  <label className="font-medium text-[#A7B0BA]">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A7B0BA]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      disabled={isSubmitting}
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-[#30363D] bg-[#1E2226] text-[#F5F7FA] placeholder-[#6B7280] focus:border-[#00D4FF] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Password field for login and register */}
              {(authMode === "login" || authMode === "register") && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[#A7B0BA]">Password</label>
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => handleModeChange("forgot_password")}
                        className="text-[11px] text-[#00D4FF] hover:text-[#00B8D9] transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A7B0BA]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={isSubmitting}
                      required
                      className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-[#30363D] bg-[#1E2226] text-[#F5F7FA] placeholder-[#6B7280] focus:border-[#00D4FF] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7B0BA] hover:text-[#F5F7FA] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password field (for register and reset_password) */}
              {(authMode === "register" || authMode === "reset_password") && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-[#A7B0BA]">
                      {authMode === "register" ? "Confirm Password" : "Confirm New Password"}
                    </label>
                    {passwordsMatch && (
                      <span className="text-[11px] text-[#22C55E] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Matches
                      </span>
                    )}
                    {passwordsMismatch && (
                      <span className="text-[11px] text-[#EF4444]">
                        Does not match
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A7B0BA]" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      disabled={isSubmitting}
                      required
                      className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border bg-[#1E2226] text-[#F5F7FA] placeholder-[#6B7280] focus:outline-none transition-colors ${
                        passwordsMismatch
                          ? "border-[#EF4444] focus:border-[#EF4444]"
                          : "border-[#30363D] focus:border-[#00D4FF]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7B0BA] hover:text-[#F5F7FA] cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#00D4FF] hover:bg-[#00B8D9] text-[#101214] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-[#101214]/30 border-t-[#101214] rounded-full animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span>
                    {authMode === "login"
                      ? "Sign In"
                      : authMode === "register"
                      ? "Create Free Account"
                      : authMode === "forgot_password"
                      ? "Send Password Reset Link"
                      : "Save New Password"}
                  </span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
