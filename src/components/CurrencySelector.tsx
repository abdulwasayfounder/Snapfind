import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, RefreshCw, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  CurrencyService,
  SupportedCurrencyCode,
  SUPPORTED_CURRENCIES,
  CurrencyMetadata,
} from "../services/billing/CurrencyService";

interface CurrencySelectorProps {
  variant?: "pill" | "dropdown" | "compact";
  showLabel?: boolean;
  className?: string;
  onCurrencyChange?: (currency: SupportedCurrencyCode) => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  variant = "pill",
  showLabel = true,
  className = "",
  onCurrencyChange,
}) => {
  const [currentCurrency, setCurrentCurrency] = useState<SupportedCurrencyCode>(
    CurrencyService.getPreferredCurrency()
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exchangeRates, setExchangeRates] = useState(CurrencyService.getExchangeRates());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = CurrencyService.subscribe((curr) => {
      setCurrentCurrency(curr);
      setExchangeRates(CurrencyService.getExchangeRates());
    });
    return () => unsubscribe();
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: SupportedCurrencyCode) => {
    CurrencyService.setPreferredCurrency(code);
    setCurrentCurrency(code);
    setIsOpen(false);
    onCurrencyChange?.(code);
  };

  const handleRefreshRates = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      const fresh = await CurrencyService.fetchExchangeRates(true);
      setExchangeRates(fresh);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const supportedList = CurrencyService.getSupportedCurrencies();
  const currentMeta = CurrencyService.getCurrencyMetadata(currentCurrency);
  const lastUpdatedDate = exchangeRates?.lastUpdated
    ? new Date(exchangeRates.lastUpdated).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id="currency-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 border cursor-pointer select-none ${
          isOpen
            ? "bg-blue-600/20 border-blue-500/50 text-blue-300 ring-2 ring-blue-500/20"
            : "bg-[#161822] hover:bg-[#1E2130] border-white/10 hover:border-white/20 text-slate-200"
        } ${variant === "compact" ? "text-xs px-2.5 py-1" : "text-xs sm:text-sm"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Change display currency"
      >
        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-base leading-none">{currentMeta.flagEmoji}</span>
        <span className="font-bold text-white tracking-wide">{currentMeta.code}</span>
        <span className="text-slate-400 font-mono text-xs">({currentMeta.symbol})</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 rounded-2xl bg-[#12141F] border border-white/15 shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 p-2 overflow-hidden"
          >
            {/* Header info */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Select Display Currency</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Approximate rates · Canonical in USD
                </p>
              </div>
              <button
                onClick={handleRefreshRates}
                disabled={isRefreshing}
                title="Refresh exchange rates"
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
                />
              </button>
            </div>

            {/* Currency Options */}
            <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 custom-scrollbar">
              {supportedList.map((curr) => {
                const isSelected = curr.code === currentCurrency;
                const sampleMonthly = CurrencyService.convertPrice(2.99, curr.code);

                return (
                  <button
                    key={curr.code}
                    id={`currency-option-${curr.code.toLowerCase()}`}
                    type="button"
                    onClick={() => handleSelect(curr.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30"
                        : "hover:bg-white/5 text-slate-300 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">{curr.flagEmoji}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{curr.code}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {curr.symbol}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[130px]">
                          {curr.name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-medium text-slate-200">
                        {sampleMonthly.formatted}/mo
                      </span>
                      {isSelected && (
                        <div className="flex items-center justify-end text-[10px] text-blue-400 gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer with exchange rate freshness & disclaimer */}
            <div className="px-3 py-2 mt-1 border-t border-white/10 bg-white/[0.02] rounded-xl">
              <div className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-tight">
                <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Updated {lastUpdatedDate}. Final checkout charges are billed in your local Google
                  Play Store regional rate.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
