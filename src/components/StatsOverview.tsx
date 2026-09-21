import React from "react";
import { Sparkles, ShieldCheck, Tag, FileText, Bookmark, CreditCard, Utensils, QrCode } from "lucide-react";
import { ScreenshotItem, CategoryType } from "../types";

interface StatsOverviewProps {
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onSelectCategory: (cat: CategoryType) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  screenshots,
  isDark,
  onSelectCategory,
}) => {
  const totalCount = screenshots.length;
  const passportCount = screenshots.filter((s) => s.category === "Passport").length;
  const billCount = screenshots.filter((s) => s.category === "Electricity Bill").length;
  const recipeCount = screenshots.filter((s) => s.category === "Recipe").length;
  const qrCount = screenshots.filter((s) => s.category === "QR Code").length;
  const admissionCount = screenshots.filter((s) => s.category === "Admission & Certificate").length;

  const totalEntities = screenshots.reduce((acc, curr) => acc + (curr.keyEntities?.length || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Total Index */}
      <div
        onClick={() => onSelectCategory("All")}
        className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:border-blue-500/50 ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Indexed Snaps</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-extrabold font-mono tracking-tight">{totalCount}</div>
        <span className="text-[10px] text-emerald-500 font-medium">100% OCR Processed</span>
      </div>

      {/* Extracted Entities */}
      <div
        className={`p-3.5 rounded-2xl border ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Key Entities</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-extrabold font-mono tracking-tight">{totalEntities}</div>
        <span className="text-[10px] opacity-60">Dates, Amounts, Numbers</span>
      </div>

      {/* Passports & Bills count */}
      <div
        onClick={() => onSelectCategory("Passport")}
        className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:border-blue-500/50 ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Passports</span>
          <Bookmark className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-xl font-extrabold font-mono tracking-tight">{passportCount}</div>
        <span className="text-[10px] text-blue-400 font-medium">Auto-Categorized</span>
      </div>

      {/* Electricity Bills count */}
      <div
        onClick={() => onSelectCategory("Electricity Bill")}
        className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:border-blue-500/50 ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Bills & Invoices</span>
          <CreditCard className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-xl font-extrabold font-mono tracking-tight">{billCount}</div>
        <span className="text-[10px] opacity-60">Amount & Due Dates</span>
      </div>
    </div>
  );
};
