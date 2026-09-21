import React from "react";
import { SnapFindLogo } from "./SnapFindLogo";
import { Ai3dCanvas } from "./Ai3dCanvas";
import {
  Sparkles,
  Search,
  ArrowRight,
  Heart,
  Camera,
  Utensils,
  Plane,
  Receipt,
  MessageSquare,
  ShieldCheck,
  Zap,
  Bookmark,
  QrCode,
  CreditCard,
  FileText,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingScreenProps {
  onGetStarted: () => void;
  onTrySearch: (query: string) => void;
  isDark: boolean;
  totalIndexed: number;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onGetStarted,
  onTrySearch,
  isDark,
  totalIndexed,
}) => {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-8 sm:p-14 text-center shadow-2xl transition-all duration-300 ${
          isDark
            ? "bg-gradient-to-b from-blue-950/50 via-slate-900 to-slate-950 border-slate-800"
            : "bg-gradient-to-b from-blue-50/80 via-indigo-50/40 to-white border-slate-200"
        }`}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto space-y-8">
          {/* Big App Name & Logo Badge */}
          <div className="flex flex-col items-center justify-center gap-4">
            <h2 className="text-4xl sm:text-6xl font-black tracking-wider bg-gradient-to-r from-blue-400 via-indigo-200 to-cyan-300 bg-clip-text text-transparent uppercase drop-shadow-lg">
              SNAP FIND
            </h2>

            {/* Interactive 3D AI Neural Animation */}
            <div className="w-full max-w-lg my-2">
              <Ai3dCanvas height="h-64 sm:h-72" />
            </div>

            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md ${
                isDark
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                  : "bg-blue-100/80 border-blue-200 text-blue-700 shadow-sm"
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse" />
              <span>Never lose a screenshot again</span>
            </div>
          </div>

          {/* Main Emotional Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-100 leading-[1.15]">
            Stop Scrolling. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
              Find Any Screenshot in Seconds.
            </span>
          </h1>

          {/* Emotional Subheadline */}
          <p className="text-sm sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed font-normal">
            We snap screenshots to save important things—a family recipe, a ticket, a Wi-Fi password, or a quick idea. SnapFind reads the words inside your photos so you can locate anything instantly without endless scrolling.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onGetStarted}
              id="hero-get-started-btn"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-base shadow-xl shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => onTrySearch("Show the passport screenshot I saved last week")}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl border font-semibold text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer ${
                isDark
                  ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-800 hover:border-blue-400 shadow-sm"
              }`}
            >
              <Search className="w-4 h-4 text-blue-400" />
              <span>Try Demo: "Show the passport screenshot I saved last week"</span>
            </button>
          </div>

          {/* Quick Natural Queries Cloud */}
          <div className="pt-6 border-t border-slate-800/60">
            <p className="text-xs font-semibold text-slate-400 mb-3">
              Tap a quick search example:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: "Show the passport screenshot I saved last week", icon: FileText },
                { label: "Find the pizza recipe I downloaded", icon: Utensils },
                { label: "Show electricity bill due amount", icon: CreditCard },
                { label: "Find flight ticket confirmation", icon: Plane },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => onTrySearch(label)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isDark
                      ? "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-white hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>"{label}"</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relatable / Emotional Story Cards */}
      <div className="space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Your Camera Roll, Reimagined</h2>
          <p className="text-xs text-slate-400">
            Designed for real everyday moments when you need information right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Bills & Receipts */}
          <div
            className={`p-6 rounded-3xl border space-y-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/90"
            }`}
          >
            <div className="text-3xl">📄</div>
            <h3 className="font-bold text-base text-slate-100">Bills & Receipts</h3>
            <p className="text-xs text-slate-300/90 leading-relaxed font-medium">
              Never lose an important payment receipt again.
            </p>
          </div>

          {/* Card 2: Travel */}
          <div
            className={`p-6 rounded-3xl border space-y-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/90"
            }`}
          >
            <div className="text-3xl">✈️</div>
            <h3 className="font-bold text-base text-slate-100">Travel</h3>
            <p className="text-xs text-slate-300/90 leading-relaxed font-medium">
              Find boarding passes and hotel bookings instantly.
            </p>
          </div>

          {/* Card 3: Chats */}
          <div
            className={`p-6 rounded-3xl border space-y-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/90"
            }`}
          >
            <div className="text-3xl">💬</div>
            <h3 className="font-bold text-base text-slate-100">Chats</h3>
            <p className="text-xs text-slate-300/90 leading-relaxed font-medium">
              Locate important conversations without endless scrolling.
            </p>
          </div>

          {/* Card 4: Recipes */}
          <div
            className={`p-6 rounded-3xl border space-y-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200/90"
            }`}
          >
            <div className="text-3xl">🍽️</div>
            <h3 className="font-bold text-base text-slate-100">Recipes</h3>
            <p className="text-xs text-slate-300/90 leading-relaxed font-medium">
              Search for any recipe you saved—even months later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
