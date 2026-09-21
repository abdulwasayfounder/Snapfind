import React, { useState, useEffect } from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import {
  X,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  LogOut,
  AlertCircle,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserProfile } from "../types";

interface AuthModalProps {
  onClose: () => void;
  isDark: boolean;
  addToast?: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
  onSignupSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, isDark, addToast, onSignupSuccess }) => {
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
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

  useEffect(() => {
    if (isRecoveryMode) {
      setAuthMode("reset_password");
    }
  }, [isRecoveryMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (authMode === "login") {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          if (addToast) addToast({ title: "Signed In Successfully", type: "success" });
          onClose();
        }
      } else if (authMode === "register") {
        const res = await signUpWithEmail(email, password, name);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          if (addToast) addToast({ title: "Account Created & Signed In", type: "success" });
          onClose();
          if (onSignupSuccess) {
            onSignupSuccess();
          }
        }
      } else if (authMode === "forgot_password") {
        if (!email.trim()) {
          setErrorMessage("Please enter your account email address.");
          setIsSubmitting(false);
          return;
        }
        const res = await resetPassword(email);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setSuccessMessage(
            `Password reset link sent to ${email.trim()}. Please check your email inbox to reset your password.`
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
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters long.");
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage("Passwords do not match. Please re-enter.");
          setIsSubmitting(false);
          return;
        }
        const res = await changePassword(password);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setIsRecoveryMode(false);
          setSuccessMessage("Password successfully updated! You can now access your vault.");
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
      setErrorMessage(err.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
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
      setErrorMessage(err.message || "Google auth error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (addToast) addToast({ title: "Signed Out of Vault", type: "info" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-md rounded-3xl border p-6 space-y-6 shadow-2xl transition-all ${
          isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <SnapFindLogo className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20 bg-slate-900" />
          <div>
            <h2 className="text-lg font-bold">
              {authMode === "forgot_password"
                ? "Reset Password"
                : authMode === "reset_password"
                ? "Set New Password"
                : "SnapFind Account"}
            </h2>
            <p className="text-xs opacity-70">
              {user?.isLoggedIn
                ? `Logged in as ${user.email}`
                : authMode === "forgot_password"
                ? "We will email you a secure recovery link"
                : authMode === "reset_password"
                ? "Enter your new account password"
                : isConfigured
                ? "Live Supabase Cloud Auth Active"
                : "Demo Persistent Auth Mode"}
            </p>
          </div>
        </div>

        {user?.isLoggedIn && authMode !== "reset_password" ? (
          /* User Logged In Profile Card */
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl border bg-slate-900/60 border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-lg flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-slate-100 truncate">{user.name}</h3>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pro Vault Session Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl border border-rose-800/40 text-rose-400 hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Session</span>
            </button>
          </div>
        ) : (
          /* Login / Register / Forgot Password Forms */
          <div className="space-y-4">
            {/* Tab Switcher for login / register */}
            {(authMode === "login" || authMode === "register") && (
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    authMode === "login"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    authMode === "register"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-200"
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
                onClick={() => {
                  setAuthMode("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            )}

            {/* Google OAuth Button (only in login/register) */}
            {(authMode === "login" || authMode === "register") && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
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
                  <span>Continue with Google Account</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-950 px-2 text-[10px] font-bold text-slate-500 uppercase">
                    Or With Email
                  </span>
                </div>
              </>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl border border-rose-800/40 bg-rose-950/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success banner */}
            {successMessage && (
              <div className="p-3 rounded-xl border border-emerald-800/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {authMode === "register" && (
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-slate-400">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      required
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none ${
                        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-slate-100 border-slate-200"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Email field (for login, register, forgot_password) */}
              {authMode !== "reset_password" && (
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none ${
                        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-slate-100 border-slate-200"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Password field for login and register */}
              {(authMode === "login" || authMode === "register") && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-400">Password</label>
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("forgot_password");
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border outline-none ${
                        isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-slate-100 border-slate-200"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password fields for reset_password */}
              {authMode === "reset_password" && (
                <>
                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-slate-400">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-slate-100 border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-slate-400">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-slate-100 border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span>
                    {authMode === "login"
                      ? "Sign In to Vault"
                      : authMode === "register"
                      ? "Register Free Account"
                      : authMode === "forgot_password"
                      ? "Send Password Reset Link"
                      : "Update Account Password"}
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

