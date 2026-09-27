import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Settings,
} from "lucide-react";
import { ReleaseInfo, UpdateState, UpdateService } from "../../services/updateService";
import { formatVersionDisplay } from "../../config/version";
import { SnapFindLogo } from "../SnapFindLogo";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateState: UpdateState;
  isDark?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateState,
  isDark = true,
}) => {
  const [isOpeningSettings, setIsOpeningSettings] = useState(false);
  const release = updateState.latestRelease;

  if (!isOpen || !release) return null;

  const isDownloading = updateState.status === "downloading";
  const isDownloaded = updateState.status === "downloaded";
  const isPermissionRequired = updateState.status === "permission_required";
  const isError = updateState.status === "error";

  const handleUpdateNow = async () => {
    try {
      await UpdateService.downloadAndInstall(release);
    } catch (e) {
      // Error handled in state
    }
  };

  const handleLater = () => {
    UpdateService.dismissCurrentUpdate();
    onClose();
  };

  const handleOpenSettings = async () => {
    setIsOpeningSettings(true);
    await UpdateService.openPermissionSettings();
    setTimeout(() => setIsOpeningSettings(false), 1500);
  };

  const handleCancelDownload = async () => {
    await UpdateService.cancelDownload();
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl bg-[#0D1117] border border-white/10 shadow-2xl overflow-hidden text-[#F8FAFC]"
        >
          {/* Top Header Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#CCFF00] via-[#00FF66] to-[#CCFF00]" />

          {/* Close button (only when not downloading) */}
          {!isDownloading && (
            <button
              onClick={handleLater}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="p-6 sm:p-7 space-y-6">
            {/* Header / Brand Icon */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-[#121821] border border-white/10 shrink-0 shadow-lg shadow-black/40">
                <SnapFindLogo className="w-8 h-8 rounded-xl" />
              </div>
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#CCFF00] px-2 py-0.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/20">
                    Official Release
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    {new Date(release.publishedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>🚀 New SnapFind update available</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
                  <span>Current: v{updateState.currentVersion}</span>
                  <span>→</span>
                  <span className="text-[#00FF66] font-bold">{release.versionName}</span>
                  {release.apkAsset?.size ? (
                    <span className="text-slate-400">({formatFileSize(release.apkAsset.size)})</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Changes / Changelog Box */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
                <span>What's New in {release.versionName}:</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#121821] border border-white/10 space-y-2 max-h-48 overflow-y-auto">
                {release.bulletChanges.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
                    <span className="text-[#00FF66] font-bold mt-0.5">•</span>
                    <span>{change}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permission Guidance Banner (If Android Unknown Sources Not Enabled) */}
            {isPermissionRequired && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-3"
              >
                <div className="flex items-start gap-2.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-300">Android Install Permission Required</div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Android requires permission to install APK updates directly from SnapFind AI. Tap below to enable "Install unknown apps" for SnapFind AI.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleOpenSettings}
                    disabled={isOpeningSettings}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isOpeningSettings ? "Opening Settings..." : "Enable in Settings"}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {isError && updateState.errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Update Failed</div>
                  <div className="text-[11px] text-slate-300">{updateState.errorMessage}</div>
                </div>
              </div>
            )}

            {/* Downloading State View */}
            {isDownloading && (
              <div className="space-y-3 p-4 rounded-2xl bg-[#121821] border border-[#00FF66]/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#00FF66] animate-spin" />
                    <span>Downloading update...</span>
                  </span>
                  <span className="font-bold font-mono text-[#00FF66]">
                    {updateState.downloadProgress >= 0 ? `${updateState.downloadProgress}%` : "Connecting..."}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#CCFF00] to-[#00FF66]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(4, updateState.downloadProgress)}%` }}
                    transition={{ ease: "easeOut", duration: 0.2 }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    {formatFileSize(updateState.bytesDownloaded)}
                    {updateState.totalBytes > 0 ? ` / ${formatFileSize(updateState.totalBytes)}` : ""}
                  </span>
                  <button
                    onClick={handleCancelDownload}
                    className="text-rose-400 hover:text-rose-300 font-sans cursor-pointer underline text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Downloaded State View */}
            {isDownloaded && (
              <div className="p-4 rounded-2xl bg-[#00FF66]/10 border border-[#00FF66]/40 text-[#00FF66] flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-white">Downloaded ✓</div>
                  <div className="text-slate-300 text-[11px] mt-0.5">
                    Launching Android package installer... Confirm on screen to complete update.
                  </div>
                </div>
              </div>
            )}

            {/* Safety & Persistence Assurance Note */}
            <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
              <ShieldCheck className="w-4 h-4 text-[#00FF66] shrink-0" />
              <span>Safe update: All screenshots, Vault, collections & Founder status remain intact.</span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              {!isDownloading ? (
                <>
                  <button
                    onClick={handleLater}
                    className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-slate-300 cursor-pointer transition-colors"
                  >
                    Later
                  </button>
                  <button
                    onClick={handleUpdateNow}
                    disabled={isDownloaded}
                    className="px-6 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] active:scale-[0.98] text-[#07090D] text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-[#CCFF00]/20 transition-all disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>{isDownloaded ? "Installing..." : "Update Now"}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCancelDownload}
                  className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-slate-400 cursor-pointer"
                >
                  Cancel Download
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
