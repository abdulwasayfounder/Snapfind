import React, { useState } from "react";
import { Sparkles, Check, Lock, ArrowRight, Layers, Cloud, Search, Zap, HardDrive } from "lucide-react";
import { getFeatureUpgradeDetails, UpgradeFeatureKey } from "./featureUpgradeConfig";
import { ProBadge } from "./ProBadge";
import { UpgradeModal } from "./UpgradeModal";
import { useAuth } from "../../context/AuthContext";

export interface FeatureLockedCardProps {
  feature: UpgradeFeatureKey | string;
  customTitle?: string;
  customSubtitle?: string;
  isDark?: boolean;
  onUnlock?: () => void;
  className?: string;
}

const ICON_MAP = {
  Layers,
  Cloud,
  Search,
  Zap,
  HardDrive,
  Sparkles,
};

export const FeatureLockedCard: React.FC<FeatureLockedCardProps> = ({
  feature,
  customTitle,
  customSubtitle,
  isDark = true,
  onUnlock,
  className = "",
}) => {
  const { isPro, entitlement } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isFounder = Boolean(entitlement?.isFounder);
  if (isPro || isFounder) return null;

  const details = getFeatureUpgradeDetails(feature);
  const title = customTitle || details.title;
  const subtitle = customSubtitle || details.subtitle;
  const IconComponent = ICON_MAP[details.iconName] || Sparkles;

  const handleOpenModal = () => {
    if (onUnlock) {
      onUnlock();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div
        className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden transition-all text-center max-w-xl mx-auto ${
          isDark
            ? "bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-blue-500/20 text-white shadow-xl shadow-blue-500/5"
            : "bg-gradient-to-b from-white to-slate-50 border-blue-200 text-slate-900 shadow-lg shadow-blue-500/5"
        } ${className}`}
      >
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4">
          {/* Icon with lock overlay */}
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${
                isDark
                  ? "bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-400/30 text-blue-400 shadow-blue-500/15"
                  : "bg-blue-50 border-blue-200 text-blue-600 shadow-blue-500/10"
              }`}
            >
              <IconComponent className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border border-blue-400/50 flex items-center justify-center text-blue-400 shadow">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <div className="flex justify-center">
              <ProBadge size="sm" variant="pill" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">{title}</h3>
            <p className={`text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              {subtitle}
            </p>
          </div>

          {/* Key Benefits */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
            {details.benefits.map((benefit, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold ${
                  isDark
                    ? "bg-white/[0.03] border-white/5 text-slate-200"
                    : "bg-slate-100/70 border-slate-200/80 text-slate-800"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span className="truncate">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Unlock Button */}
          <div className="pt-3 w-full flex justify-center">
            <button
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Unlock with Pro ($2.99/mo)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Modal fallback if not handled by parent */}
      <UpgradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        feature={feature}
        customTitle={customTitle}
        customSubtitle={customSubtitle}
        isDark={isDark}
      />
    </>
  );
};
