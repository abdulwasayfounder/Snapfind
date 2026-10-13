import React, { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";
import { analytics, AnalyticsConsentStatus } from "../services/analytics";

interface PrivacyConsentBannerProps {
  isDark?: boolean;
}

export const PrivacyConsentBanner: React.FC<PrivacyConsentBannerProps> = ({ isDark = true }) => {
  const [consentStatus, setConsentStatus] = useState<AnalyticsConsentStatus>("granted");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if Google Analytics is configured and consent hasn't been set yet
    if (analytics.isConfigured()) {
      const current = analytics.getConsent();
      setConsentStatus(current);
      if (current === "unset") {
        setVisible(true);
      } else if (current === "granted") {
        analytics.init();
      }
    }
  }, []);

  const handleAccept = () => {
    analytics.setConsent("granted");
    setConsentStatus("granted");
    setVisible(false);
  };

  const handleDecline = () => {
    analytics.setConsent("denied");
    setConsentStatus("denied");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Privacy and Cookie Consent"
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          isDark
            ? "bg-[#0D1117]/95 border-slate-800 text-slate-100 shadow-black/60"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#00FF66]/10 text-[#00FF66] shrink-0 border border-[#00FF66]/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold tracking-tight">Privacy & Cookie Preferences</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              SnapFind AI uses privacy-focused, zero-PII telemetry to analyze public site performance. We never track your personal screenshots, search queries, or OCR contents.
            </p>
          </div>
          <button
            onClick={handleDecline}
            aria-label="Dismiss consent notice"
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
          <button
            onClick={handleDecline}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#CCFF00] hover:bg-[#b8e600] text-black shadow-sm transition-all"
          >
            Accept Telemetry
          </button>
        </div>
      </div>
    </div>
  );
};
