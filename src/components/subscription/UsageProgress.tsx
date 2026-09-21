import React from "react";
import { Clock, Info } from "lucide-react";
import { getResetDateString } from "./featureUpgradeConfig";

export interface UsageProgressProps {
  used: number;
  limit: number;
  label?: string;
  unit?: string;
  resetDate?: string;
  showResetDate?: boolean;
  compact?: boolean;
  isDark?: boolean;
  className?: string;
}

export const UsageProgress: React.FC<UsageProgressProps> = ({
  used,
  limit,
  label = "Monthly Usage",
  unit = "scans",
  resetDate,
  showResetDate = true,
  compact = false,
  isDark = true,
  className = "",
}) => {
  const safeUsed = Math.max(0, used);
  const safeLimit = Math.max(1, limit);
  const percent = Math.min(100, Math.round((safeUsed / safeLimit) * 100));
  const remaining = Math.max(0, safeLimit - safeUsed);
  const isExceeded = safeUsed >= safeLimit;
  const isHigh = percent >= 80;

  // Determine indicator color
  let barColor = "bg-gradient-to-r from-emerald-500 to-teal-400";
  let textColor = isDark ? "text-emerald-400" : "text-emerald-600";

  if (isExceeded) {
    barColor = "bg-gradient-to-r from-rose-500 to-red-600";
    textColor = isDark ? "text-rose-400" : "text-rose-600";
  } else if (isHigh) {
    barColor = "bg-gradient-to-r from-amber-500 to-orange-500";
    textColor = isDark ? "text-amber-400" : "text-amber-600";
  }

  const effectiveResetDate = resetDate || getResetDateString();

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={isDark ? "text-slate-400" : "text-slate-600 font-medium"}>
            {label}
          </span>
          <span className={`font-mono font-semibold ${textColor}`}>
            {safeUsed.toLocaleString()} / {safeLimit.toLocaleString()} {unit}
          </span>
        </div>
        <div
          className={`h-1.5 w-full rounded-full overflow-hidden ${
            isDark ? "bg-white/10" : "bg-slate-200"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${
        isDark
          ? "bg-white/[0.03] border-white/10 text-slate-200"
          : "bg-slate-50 border-slate-200 text-slate-800"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {label}
          </span>
          <div className="text-lg font-bold mt-0.5 flex items-baseline gap-1.5">
            <span className={textColor}>{safeUsed.toLocaleString()}</span>
            <span className={`text-xs font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              / {safeLimit.toLocaleString()} {unit}
            </span>
          </div>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono shrink-0 ${
            isExceeded
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
              : isHigh
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
          }`}
        >
          {percent}% Used
        </div>
      </div>

      {/* Progress Track */}
      <div
        className={`h-2.5 w-full rounded-full overflow-hidden ${
          isDark ? "bg-white/10" : "bg-slate-200"
        } relative`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Footer / Reset Date */}
      {showResetDate && (
        <div
          className={`flex items-center justify-between text-xs mt-3 pt-2.5 border-t ${
            isDark ? "border-white/5 text-slate-400" : "border-slate-200/80 text-slate-500"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Resets {effectiveResetDate}</span>
          </span>
          <span>
            {isExceeded ? (
              <strong className="text-rose-400">Limit reached</strong>
            ) : (
              <span>{remaining.toLocaleString()} remaining</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
