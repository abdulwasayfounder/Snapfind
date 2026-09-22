import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Unlock,
  Shield,
  KeyRound,
  Grid,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Clock,
  Trash2,
} from "lucide-react";
import {
  collectionSecurity,
  LockType,
  AutoLockDuration,
  VAULT_COLLECTION_NAME,
} from "../services/collectionSecurity";
import { PatternLock } from "./PatternLock";

interface SecurityLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
  mode: "unlock" | "configure";
  onSuccess?: () => void;
  addToast?: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

export const SecurityLockModal: React.FC<SecurityLockModalProps> = ({
  isOpen,
  onClose,
  collectionName,
  mode: initialMode,
  onSuccess,
  addToast,
}) => {
  const isVault = collectionName === VAULT_COLLECTION_NAME;
  const currentLockType = collectionSecurity.getCollectionLockType(collectionName);
  const isAlreadyLocked = collectionSecurity.hasCollectionLock(collectionName);

  // Active sub-mode
  const [modalMode, setModalMode] = useState<"unlock" | "configure">(initialMode);
  const [selectedLockType, setSelectedLockType] = useState<LockType>(currentLockType === "none" ? "pin" : currentLockType);
  const [autoLockDuration, setAutoLockDuration] = useState<AutoLockDuration>(collectionSecurity.getAutoLockDuration());

  // Unlock inputs
  const [enteredPin, setEnteredPin] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Configure inputs
  const [configStep, setConfigStep] = useState<"enter" | "confirm">("enter");
  const [firstSecret, setFirstSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setModalMode(initialMode);
      setSelectedLockType(currentLockType === "none" ? "pin" : currentLockType);
      setAutoLockDuration(collectionSecurity.getAutoLockDuration());
      setEnteredPin("");
      setEnteredPassword("");
      setFirstSecret("");
      setConfirmSecret("");
      setConfigStep("enter");
      setUnlockError(null);
      setConfigError(null);
    }
  }, [isOpen, initialMode, collectionName, currentLockType]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimer((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  if (!isOpen) return null;

  // ----------------------------------------------------
  // UNLOCK LOGIC
  // ----------------------------------------------------
  const handleVerifySecret = async (secret: string) => {
    setUnlockError(null);
    const res = await collectionSecurity.verifyAndUnlock(collectionName, secret);
    if (res.success) {
      addToast?.({
        title: `${collectionName} Unlocked`,
        description: "Unlocked for your active session.",
        type: "success",
      });
      onSuccess?.();
      onClose();
    } else {
      setUnlockError(res.error || "Incorrect credentials");
      if (res.lockoutSeconds) {
        setLockoutTimer(res.lockoutSeconds);
      }
    }
  };

  const handleUnlockPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.length < 4) {
      setUnlockError("PIN must be at least 4 digits");
      return;
    }
    handleVerifySecret(enteredPin);
  };

  const handleUnlockPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPassword) {
      setUnlockError("Please enter your password");
      return;
    }
    handleVerifySecret(enteredPassword);
  };

  // ----------------------------------------------------
  // CONFIGURE LOGIC
  // ----------------------------------------------------
  const handleRemoveLock = () => {
    collectionSecurity.removeCollectionLock(collectionName);
    addToast?.({
      title: "Security Lock Removed",
      description: `${collectionName} is now accessible without a lock.`,
      type: "info",
    });
    onClose();
  };

  const handleConfigurePattern = (pattern: string) => {
    if (configStep === "enter") {
      setFirstSecret(pattern);
      setConfigStep("confirm");
      setConfigError(null);
    } else {
      if (pattern !== firstSecret) {
        setConfigError("Patterns do not match. Please draw again.");
        setConfigStep("enter");
        setFirstSecret("");
        return;
      }
      saveNewLock(pattern);
    }
  };

  const handleConfigureSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);

    if (configStep === "enter") {
      if (selectedLockType === "pin" && firstSecret.length < 4) {
        setConfigError("PIN must be 4 to 8 digits");
        return;
      }
      if (selectedLockType === "password" && firstSecret.length < 4) {
        setConfigError("Password must be at least 4 characters");
        return;
      }
      setConfigStep("confirm");
    } else {
      if (firstSecret !== confirmSecret) {
        setConfigError(selectedLockType === "pin" ? "PINs do not match" : "Passwords do not match");
        return;
      }
      saveNewLock(firstSecret);
    }
  };

  const saveNewLock = async (secret: string) => {
    await collectionSecurity.setCollectionLock(collectionName, selectedLockType, secret);
    collectionSecurity.setAutoLockDuration(autoLockDuration);

    addToast?.({
      title: "Collection Protected",
      description: `${collectionName} is now secured with ${selectedLockType.toUpperCase()} lock.`,
      type: "success",
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-3xl bg-[#0D1117] border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#121821]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#CCFF00]/20 to-[#00FF66]/20 border border-[#CCFF00]/30 flex items-center justify-center text-[#CCFF00]">
              {modalMode === "unlock" ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-base text-[#F8FAFC]">
                {modalMode === "unlock" ? "Collection Locked" : "Collection Security"}
              </h2>
              <p className="text-xs text-[#94A3B8] truncate max-w-[240px]">
                {collectionName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* ======================================================== */}
          {/* UNLOCK MODE */}
          {/* ======================================================== */}
          {modalMode === "unlock" && (
            <div className="space-y-4">
              <p className="text-xs text-[#94A3B8] text-center leading-relaxed">
                This collection is protected. Enter your credentials to view and search its contents.
              </p>

              {lockoutTimer > 0 ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
                  <Clock className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-semibold block">Security Lockout Active</span>
                    <span>Too many attempts. Try again in {lockoutTimer}s.</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Pattern Lock */}
                  {currentLockType === "pattern" && (
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-slate-300 font-medium mb-3">
                        Draw your unlock pattern:
                      </span>
                      <PatternLock
                        onPatternComplete={handleVerifySecret}
                        error={Boolean(unlockError)}
                      />
                    </div>
                  )}

                  {/* Numeric PIN */}
                  {currentLockType === "pin" && (
                    <form onSubmit={handleUnlockPinSubmit} className="space-y-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-slate-300 font-medium">
                          Enter your {collectionName === VAULT_COLLECTION_NAME ? "Vault" : "Collection"} PIN
                        </span>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={8}
                          autoFocus
                          value={enteredPin}
                          onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="••••"
                          className="text-center font-mono tracking-[0.4em] text-2xl w-48 py-3 rounded-2xl bg-[#07090D] border border-white/[0.12] text-white focus:outline-none focus:border-[#CCFF00]"
                        />
                      </div>

                      {/* Number Keypad for quick mobile/tablet touch */}
                      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEnteredPin((prev) => (prev.length < 8 ? prev + n : prev))}
                            className="py-3 rounded-xl bg-[#121821] hover:bg-[#18202B] text-lg font-semibold text-[#F8FAFC] active:scale-95 transition-all"
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEnteredPin("")}
                          className="py-3 rounded-xl bg-[#121821] hover:bg-[#18202B] text-xs font-semibold text-slate-400 active:scale-95 transition-all"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnteredPin((prev) => (prev.length < 8 ? prev + "0" : prev))}
                          className="py-3 rounded-xl bg-[#121821] hover:bg-[#18202B] text-lg font-semibold text-[#F8FAFC] active:scale-95 transition-all"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnteredPin((prev) => prev.slice(0, -1))}
                          className="py-3 rounded-xl bg-[#121821] hover:bg-[#18202B] text-xs font-semibold text-slate-400 active:scale-95 transition-all"
                        >
                          ⌫
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={enteredPin.length < 4}
                        className="w-full py-3 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-[#07090D] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#CCFF00]/20"
                      >
                        Unlock Collection
                      </button>
                    </form>
                  )}

                  {/* Password */}
                  {currentLockType === "password" && (
                    <form onSubmit={handleUnlockPasswordSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-300 font-medium">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={enteredPassword}
                            onChange={(e) => setEnteredPassword(e.target.value)}
                            placeholder="Enter password"
                            autoFocus
                            className="w-full px-4 py-3 rounded-2xl bg-[#07090D] border border-white/[0.12] text-white pr-10 focus:outline-none focus:border-[#CCFF00] text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!enteredPassword}
                        className="w-full py-3 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-[#07090D] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#CCFF00]/20"
                      >
                        Unlock Collection
                      </button>
                    </form>
                  )}
                </>
              )}

              {unlockError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* CONFIGURE MODE */}
          {/* ======================================================== */}
          {modalMode === "configure" && (
            <div className="space-y-4">
              {/* Lock Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#F8FAFC]">
                  Choose Protection Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLockType("pin");
                      setConfigStep("enter");
                      setFirstSecret("");
                      setConfirmSecret("");
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedLockType === "pin"
                        ? "bg-[#18202B] border-[#CCFF00] text-[#CCFF00] shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        : "bg-[#121821] border-white/[0.08] text-slate-400 hover:text-white"
                    }`}
                  >
                    <KeyRound className="w-5 h-5" />
                    <span className="text-xs font-semibold">PIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLockType("pattern");
                      setConfigStep("enter");
                      setFirstSecret("");
                      setConfirmSecret("");
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedLockType === "pattern"
                        ? "bg-[#18202B] border-[#CCFF00] text-[#CCFF00] shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        : "bg-[#121821] border-white/[0.08] text-slate-400 hover:text-white"
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                    <span className="text-xs font-semibold">Pattern</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLockType("password");
                      setConfigStep("enter");
                      setFirstSecret("");
                      setConfirmSecret("");
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedLockType === "password"
                        ? "bg-[#18202B] border-[#CCFF00] text-[#CCFF00] shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        : "bg-[#121821] border-white/[0.08] text-slate-400 hover:text-white"
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                    <span className="text-xs font-semibold">Password</span>
                  </button>
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-3">
                <span>
                  {configStep === "enter"
                    ? `Step 1: Choose ${selectedLockType.toUpperCase()}`
                    : `Step 2: Confirm ${selectedLockType.toUpperCase()}`}
                </span>
                <span className="text-[#CCFF00] font-medium">
                  {configStep === "enter" ? "1 / 2" : "2 / 2"}
                </span>
              </div>

              {/* Configure Pattern */}
              {selectedLockType === "pattern" && (
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs text-slate-300 font-medium">
                    {configStep === "enter"
                      ? "Draw your desired 3x3 pattern"
                      : "Draw the pattern again to confirm"}
                  </span>
                  <PatternLock
                    onPatternComplete={handleConfigurePattern}
                    error={Boolean(configError)}
                  />
                </div>
              )}

              {/* Configure PIN */}
              {selectedLockType === "pin" && (
                <form onSubmit={handleConfigureSecretSubmit} className="space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-300 font-medium">
                      {configStep === "enter" ? "Enter 4 to 8 digit PIN" : "Re-enter PIN to confirm"}
                    </span>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      autoFocus
                      value={configStep === "enter" ? firstSecret : confirmSecret}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (configStep === "enter") setFirstSecret(val);
                        else setConfirmSecret(val);
                      }}
                      placeholder="••••"
                      className="text-center font-mono tracking-[0.4em] text-2xl w-48 py-3 rounded-2xl bg-[#07090D] border border-white/[0.12] text-white focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={configStep === "enter" ? firstSecret.length < 4 : confirmSecret.length < 4}
                    className="w-full py-3 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-[#07090D] font-bold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {configStep === "enter" ? "Continue to Confirm" : "Save Security Lock"}
                  </button>
                </form>
              )}

              {/* Configure Password */}
              {selectedLockType === "password" && (
                <form onSubmit={handleConfigureSecretSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      {configStep === "enter" ? "New Password" : "Confirm Password"}
                    </label>
                    <input
                      type="password"
                      value={configStep === "enter" ? firstSecret : confirmSecret}
                      onChange={(e) => {
                        if (configStep === "enter") setFirstSecret(e.target.value);
                        else setConfirmSecret(e.target.value);
                      }}
                      placeholder={configStep === "enter" ? "At least 4 characters" : "Repeat password"}
                      autoFocus
                      className="w-full px-4 py-3 rounded-2xl bg-[#07090D] border border-white/[0.12] text-white focus:outline-none focus:border-[#CCFF00] text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={configStep === "enter" ? firstSecret.length < 4 : confirmSecret.length < 4}
                    className="w-full py-3 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-[#07090D] font-bold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {configStep === "enter" ? "Continue to Confirm" : "Save Security Lock"}
                  </button>
                </form>
              )}

              {/* Auto-Lock Duration Setting */}
              <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
                <label className="text-xs font-semibold text-[#F8FAFC]">
                  Auto-Lock Timer
                </label>
                <select
                  value={autoLockDuration}
                  onChange={(e) => setAutoLockDuration(e.target.value as AutoLockDuration)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07090D] border border-white/[0.12] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#CCFF00]"
                >
                  <option value="immediately">Immediately on exit</option>
                  <option value="1m">After 1 minute</option>
                  <option value="5m">After 5 minutes (Recommended)</option>
                  <option value="15m">After 15 minutes</option>
                  <option value="session">Until app closes</option>
                </select>
                <p className="text-[11px] text-[#64748B]">
                  Locks collection automatically after inactivity.
                </p>
              </div>

              {configError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{configError}</span>
                </div>
              )}

              {/* Remove Lock Button if already configured */}
              {isAlreadyLocked && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={handleRemoveLock}
                    className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Security Lock</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
