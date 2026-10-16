import React from "react";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  FileText,
  Utensils,
  CreditCard,
  Plane,
} from "lucide-react";
import { Ai3dCanvas } from "./Ai3dCanvas";

interface LandingScreenProps {
  onGetStarted: () => void;
  onTrySearch: (query: string) => void;
  isDark: boolean;
  totalIndexed: number;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onGetStarted,
  onTrySearch,
}) => {
  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <div className="relative rounded-2xl border border-[#30363D] bg-[#171A1D] p-8 sm:p-12 text-center transition-all select-none">
        <div className="relative max-w-3xl mx-auto space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[#30363D] bg-[#1E2226] text-[#A7B0BA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
            <span>AI-Powered Visual Memory &amp; Search Engine</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F5F7FA] leading-tight">
            Stop Scrolling. <br />
            <span className="text-[#00D4FF]">Find Any Screenshot in Seconds.</span>
          </h1>

          {/* Neural Canvas visual */}
          <div className="w-full max-w-md mx-auto my-1">
            <Ai3dCanvas height="h-56 sm:h-64" />
          </div>

          {/* Subheadline */}
          <p className="text-sm sm:text-base text-[#A7B0BA] max-w-2xl mx-auto leading-relaxed">
            SnapFind indexes the words, dates, prices, and objects inside your saved screenshots.
            Search naturally like talking to a human, and retrieve what you need instantly.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={onGetStarted}
              id="hero-get-started-btn"
              type="button"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#00D4FF] hover:bg-[#00B8D9] text-[#101214] font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onTrySearch("Show the passport screenshot I saved last week")}
              type="button"
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#30363D] bg-[#1E2226] hover:bg-[#262C32] text-[#F5F7FA] font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>Try Demo: "Show passport screenshot"</span>
            </button>
          </div>

          {/* Quick Natural Queries */}
          <div className="pt-6 border-t border-[#30363D]">
            <p className="text-xs font-medium text-[#A7B0BA] mb-3">
              Popular natural language queries:
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
                  type="button"
                  onClick={() => onTrySearch(label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363D] bg-[#1E2226] text-[#A7B0BA] hover:text-[#F5F7FA] hover:border-[#00D4FF] text-xs transition-colors cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" />
                  <span>"{label}"</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Relatable Category Highlights */}
      <div className="space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-[#F5F7FA]">
            Intelligent Visual Memory
          </h2>
          <p className="text-xs text-[#A7B0BA]">
            Your screenshots automatically categorized, parsed, and protected locally.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-[#30363D] bg-[#1E2226] space-y-2 hover:border-[#00D4FF] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#171A1D] border border-[#30363D] flex items-center justify-center text-[#00D4FF]">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F7FA]">Bills &amp; Invoices</h3>
            <p className="text-xs text-[#A7B0BA] leading-normal">
              Track due dates, account numbers, and amounts due automatically.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#30363D] bg-[#1E2226] space-y-2 hover:border-[#00D4FF] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#171A1D] border border-[#30363D] flex items-center justify-center text-[#00D4FF]">
              <Plane className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F7FA]">Travel &amp; Passes</h3>
            <p className="text-xs text-[#A7B0BA] leading-normal">
              Locate airline bookings, confirmation codes, and itinerary screenshots.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#30363D] bg-[#1E2226] space-y-2 hover:border-[#00D4FF] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#171A1D] border border-[#30363D] flex items-center justify-center text-[#00D4FF]">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F7FA]">Private Vault</h3>
            <p className="text-xs text-[#A7B0BA] leading-normal">
              Sensitive screenshots are blurred and protected behind PIN or biometrics.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#30363D] bg-[#1E2226] space-y-2 hover:border-[#00D4FF] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#171A1D] border border-[#30363D] flex items-center justify-center text-[#00D4FF]">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm text-[#F5F7FA]">Instant Offline OCR</h3>
            <p className="text-xs text-[#A7B0BA] leading-normal">
              Fast local indexing with zero cloud telemetry required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
