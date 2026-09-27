import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, CheckCircle2, X, ArrowRight, ShieldCheck } from "lucide-react";
import { formatVersionDisplay } from "../../config/version";
import { SnapFindLogo } from "../SnapFindLogo";

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose, version }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl bg-[#0D1117] border border-white/10 shadow-2xl overflow-hidden text-[#F8FAFC]"
        >
          {/* Subtle brand glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#CCFF00] to-[#00FF66]" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#121821] border border-white/10 shrink-0 shadow-md">
                <SnapFindLogo className="w-7 h-7 rounded-xl" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#00FF66] px-2 py-0.5 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20">
                  Update Successful
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  SnapFind updated to {formatVersionDisplay(version)}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121821] border border-white/10 space-y-2.5 text-xs text-slate-200">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#CCFF00]" />
                <span>What's New in this release:</span>
              </div>
              <ul className="space-y-1.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF66] font-bold">•</span>
                  <span>Faster offline indexing and optical character recognition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF66] font-bold">•</span>
                  <span>Enhanced duplicate detection & gallery cache acceleration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF66] font-bold">•</span>
                  <span>In-app free update engine directly via official GitHub Releases</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF66] font-bold">•</span>
                  <span>Full data preservation: all your screenshots, Vault, and Founder status remain safe</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
              <ShieldCheck className="w-4 h-4 text-[#00FF66] shrink-0" />
              <span>All your indexed data, collections, and settings are fully up to date.</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#b8e600] active:scale-[0.98] text-[#07090D] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#CCFF00]/20 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
