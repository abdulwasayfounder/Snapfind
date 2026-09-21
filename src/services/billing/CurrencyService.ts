/**
 * SnapFind AI - Multi-Currency Display & Exchange Rate Engine
 *
 * CANONICAL BASE PRICING (USD):
 * - Monthly Pro: USD $2.99
 * - Annual Pro: USD $24.99
 *
 * CRITICAL ARCHITECTURAL DIRECTIVES:
 * 1. The frontend conversion value is strictly for display and localization convenience.
 * 2. It NEVER determines the actual amount charged at checkout.
 * 3. Actual payment verification is processed in the user's localized Google Play Store / provider SKU price.
 * 4. Automatic locale detection with persistent manual override.
 * 5. Multi-tier caching with offline fallbacks to prevent network disruption.
 */

export type SupportedCurrencyCode = "USD" | "PKR" | "INR" | "EUR" | "GBP" | "AED" | "SAR";

export interface CurrencyMetadata {
  code: SupportedCurrencyCode;
  name: string;
  symbol: string;
  flagEmoji: string;
  nativeName: string;
  symbolPosition: "prefix" | "suffix" | "prefix-space" | "suffix-space";
  decimalPlaces: number;
  useSmartRounding?: boolean;
}

export interface ExchangeRatesData {
  base: "USD";
  rates: Record<SupportedCurrencyCode, number>;
  lastUpdated: string;
  source: string;
  isFallback?: boolean;
}

export interface ConvertedPriceResult {
  currency: SupportedCurrencyCode;
  symbol: string;
  originalUsd: number;
  convertedAmount: number;
  formatted: string;
  isApproximate: boolean;
  rate: number;
}

const STORAGE_KEY_CURRENCY = "snapfind_preferred_currency";
const STORAGE_KEY_RATES_CACHE = "snapfind_exchange_rates_cache_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Supported Initial Currencies Catalog
 */
export const SUPPORTED_CURRENCIES: Record<SupportedCurrencyCode, CurrencyMetadata> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    flagEmoji: "🇺🇸",
    nativeName: "US Dollar",
    symbolPosition: "prefix",
    decimalPlaces: 2,
    useSmartRounding: false,
  },
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "Rs",
    flagEmoji: "🇵🇰",
    nativeName: "روپیہ",
    symbolPosition: "prefix-space",
    decimalPlaces: 0,
    useSmartRounding: true,
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    flagEmoji: "🇮🇳",
    nativeName: "भारतीय रुपया",
    symbolPosition: "prefix",
    decimalPlaces: 0,
    useSmartRounding: true,
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    flagEmoji: "🇪🇺",
    nativeName: "Euro",
    symbolPosition: "prefix",
    decimalPlaces: 2,
    useSmartRounding: false,
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    flagEmoji: "🇬🇧",
    nativeName: "Pound Sterling",
    symbolPosition: "prefix",
    decimalPlaces: 2,
    useSmartRounding: false,
  },
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    flagEmoji: "🇦🇪",
    nativeName: "درهم إماراتي",
    symbolPosition: "prefix-space",
    decimalPlaces: 0,
    useSmartRounding: true,
  },
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "ر.س",
    flagEmoji: "🇸🇦",
    nativeName: "ريال سعودي",
    symbolPosition: "prefix-space",
    decimalPlaces: 2,
    useSmartRounding: false,
  },
};

/**
 * Baseline Exchange Rates Relative to 1.0 USD
 * Updated fallback rates ensuring reliable presentation offline
 */
export const BASELINE_EXCHANGE_RATES: Record<SupportedCurrencyCode, number> = {
  USD: 1.0,
  PKR: 280.0,
  INR: 83.3,
  EUR: 0.933,
  GBP: 0.799,
  AED: 3.6725,
  SAR: 3.75,
};

/**
 * Canonical Pricing Constants (PKR & USD)
 */
export const CANONICAL_PRICING_USD = {
  FREE: 0,
  PRO_MONTHLY: 1.07, // Equivalent for 299 PKR
  PRO_YEARLY: 8.93, // Equivalent for 2,499 PKR
  PRO_LIFETIME: 28.57, // Equivalent for 7,999 PKR at 280 rate
  SAVINGS_PERCENT: 30,
} as const;

export const CANONICAL_PRICING_PKR = {
  FREE: 0,
  PRO_MONTHLY: 299,
  PRO_YEARLY: 2499,
  PRO_LIFETIME: 7999,
} as const;

type CurrencyChangeListener = (currency: SupportedCurrencyCode) => void;

class CurrencyServiceClass {
  private currentCurrency: SupportedCurrencyCode = "PKR";
  private ratesData: ExchangeRatesData = {
    base: "USD",
    rates: { ...BASELINE_EXCHANGE_RATES },
    lastUpdated: new Date().toISOString(),
    source: "SnapFind Fallback Exchange Engine",
    isFallback: true,
  };
  private listeners: Set<CurrencyChangeListener> = new Set();
  private isFetchingRates = false;
  private hasInitialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initialize();
    }
  }

  private initialize(): void {
    if (this.hasInitialized) return;
    this.hasInitialized = true;

    // 1. Detect or load saved preferred currency
    this.currentCurrency = this.detectPreferredCurrency();

    // 2. Load cached exchange rates from localStorage if valid
    this.loadCachedRates();

    // 3. Trigger fresh exchange rates query asynchronously
    this.fetchExchangeRates().catch((err) => {
      console.warn("[CurrencyService] Background rate refresh failed, using cached baseline:", err);
    });
  }

  /**
   * Returns list of all supported currencies with metadata
   */
  public getSupportedCurrencies(): CurrencyMetadata[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  /**
   * Returns metadata for a specific currency
   */
  public getCurrencyMetadata(code: SupportedCurrencyCode): CurrencyMetadata {
    return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.USD;
  }

  /**
   * Detects the user's best preferred currency based on stored preference or browser locale
   */
  public getPreferredCurrency(): SupportedCurrencyCode {
    return this.currentCurrency;
  }

  /**
   * Set user preferred currency, persist to localStorage, and notify all subscribers
   */
  public setPreferredCurrency(code: SupportedCurrencyCode): void {
    if (!SUPPORTED_CURRENCIES[code]) {
      console.warn(`[CurrencyService] Unsupported currency "${code}". Falling back to USD.`);
      code = "USD";
    }

    this.currentCurrency = code;
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, code);
    } catch (e) {
      console.warn("[CurrencyService] Could not persist preferred currency:", e);
    }

    this.notifyListeners(code);
  }

  /**
   * Detect preferred currency from browser locale / time zone / region
   */
  private detectPreferredCurrency(): SupportedCurrencyCode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENCY) as SupportedCurrencyCode;
      if (saved && SUPPORTED_CURRENCIES[saved]) {
        return saved;
      }

      // Check browser locale and timezone
      const browserLocale = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
      const timezone = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").toLowerCase();

      // Region matchers
      if (browserLocale.includes("pk") || timezone.includes("karachi")) {
        return "PKR";
      }
      if (browserLocale.includes("in") || timezone.includes("kolkata") || timezone.includes("calcutta")) {
        return "INR";
      }
      if (browserLocale.includes("ae") || timezone.includes("dubai")) {
        return "AED";
      }
      if (browserLocale.includes("sa") || timezone.includes("riyadh")) {
        return "SAR";
      }
      if (browserLocale.includes("gb") || timezone.includes("london")) {
        return "GBP";
      }
      if (
        browserLocale.includes("de") ||
        browserLocale.includes("fr") ||
        browserLocale.includes("es") ||
        browserLocale.includes("it") ||
        browserLocale.includes("nl") ||
        timezone.includes("paris") ||
        timezone.includes("berlin") ||
        timezone.includes("rome") ||
        timezone.includes("madrid") ||
        timezone.includes("amsterdam")
      ) {
        return "EUR";
      }
    } catch (e) {
      console.warn("[CurrencyService] Error auto-detecting currency:", e);
    }

    return "PKR";
  }

  /**
   * Load cached rates from localStorage
   */
  private loadCachedRates(): void {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_RATES_CACHE);
      if (cached) {
        const parsed: ExchangeRatesData = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.lastUpdated).getTime();
        if (age < CACHE_TTL_MS && parsed.rates) {
          this.ratesData = parsed;
        }
      }
    } catch (e) {
      console.warn("[CurrencyService] Could not parse cached exchange rates:", e);
    }
  }

  /**
   * Fetch current exchange rates from backend or external reliable source
   */
  public async fetchExchangeRates(forceRefresh = false): Promise<ExchangeRatesData> {
    if (this.isFetchingRates && !forceRefresh) {
      return this.ratesData;
    }

    this.isFetchingRates = true;
    try {
      const res = await fetch("/api/billing/exchange-rates", {
        headers: { "Cache-Control": forceRefresh ? "no-cache" : "default" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rates) {
          this.ratesData = {
            base: "USD",
            rates: {
              ...BASELINE_EXCHANGE_RATES,
              ...data.rates,
            },
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            source: data.source || "Live Financial FX Rates",
            isFallback: false,
          };

          try {
            localStorage.setItem(STORAGE_KEY_RATES_CACHE, JSON.stringify(this.ratesData));
          } catch (err) {
            console.warn("[CurrencyService] Failed to cache exchange rates to localStorage:", err);
          }

          this.notifyListeners(this.currentCurrency);
          return this.ratesData;
        }
      }
    } catch (err) {
      console.warn("[CurrencyService] Failed to fetch live exchange rates from server, retaining baseline:", err);
    } finally {
      this.isFetchingRates = false;
    }

    return this.ratesData;
  }

  /**
   * Returns current active exchange rates
   */
  public getExchangeRates(): ExchangeRatesData {
    return this.ratesData;
  }

  /**
   * Converts a USD amount to the given currency or currently selected currency
   */
  public convertPrice(
    usdAmount: number,
    targetCurrency?: SupportedCurrencyCode,
    options?: { roundForDisplay?: boolean }
  ): ConvertedPriceResult {
    const currency = targetCurrency || this.currentCurrency;
    const meta = this.getCurrencyMetadata(currency);
    const rate = this.ratesData.rates[currency] || BASELINE_EXCHANGE_RATES[currency] || 1.0;
    const isApproximate = currency !== "USD";

    if (usdAmount === 0) {
      return {
        currency,
        symbol: meta.symbol,
        originalUsd: 0,
        convertedAmount: 0,
        formatted: this.formatCurrency(0, currency),
        isApproximate: false,
        rate: 1.0,
      };
    }

    const rawConverted = usdAmount * rate;
    let finalAmount = rawConverted;

    // Apply smart consumer display pricing if applicable
    if (options?.roundForDisplay !== false && meta.useSmartRounding) {
      if (currency === "PKR") {
        // e.g. 2.99 * 284 = ~849 PKR, 24.99 * 284 = ~7,097 -> round to nearest 49 / 99 or clean integer
        finalAmount = Math.round(rawConverted);
      } else if (currency === "INR") {
        // e.g. 2.99 * 83.3 = ~249 INR
        finalAmount = Math.round(rawConverted);
      } else if (currency === "AED") {
        finalAmount = Math.round(rawConverted);
      }
    }

    const formatted = this.formatCurrency(finalAmount, currency);

    return {
      currency,
      symbol: meta.symbol,
      originalUsd: usdAmount,
      convertedAmount: finalAmount,
      formatted,
      isApproximate,
      rate,
    };
  }

  /**
   * Formats a numerical amount into a localized currency string
   */
  public formatCurrency(
    amount: number,
    currencyCode?: SupportedCurrencyCode,
    options?: { showCode?: boolean; precision?: number }
  ): string {
    const code = currencyCode || this.currentCurrency;
    const meta = this.getCurrencyMetadata(code);
    const precision = options?.precision ?? meta.decimalPlaces;

    let formattedNumber: string;

    if (precision === 0) {
      formattedNumber = Math.round(amount).toLocaleString("en-US");
    } else {
      formattedNumber = amount.toLocaleString("en-US", {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
    }

    let result = "";
    switch (meta.symbolPosition) {
      case "prefix":
        result = `${meta.symbol}${formattedNumber}`;
        break;
      case "prefix-space":
        result = `${meta.symbol} ${formattedNumber}`;
        break;
      case "suffix":
        result = `${formattedNumber}${meta.symbol}`;
        break;
      case "suffix-space":
        result = `${formattedNumber} ${meta.symbol}`;
        break;
    }

    if (options?.showCode && code !== "USD") {
      result += ` ${code}`;
    }

    return result;
  }

  /**
   * Helper: Get formatted Pro Monthly and Pro Yearly display objects
   */
  public getPlanPricing(targetCurrency?: SupportedCurrencyCode) {
    const currency = targetCurrency || this.currentCurrency;
    const monthly = this.convertPrice(CANONICAL_PRICING_USD.PRO_MONTHLY, currency);
    const yearly = this.convertPrice(CANONICAL_PRICING_USD.PRO_YEARLY, currency);
    const yearlyMonthlyEquiv = this.convertPrice(
      CANONICAL_PRICING_USD.PRO_YEARLY / 12,
      currency
    );

    return {
      currency,
      monthly,
      yearly,
      yearlyMonthlyEquiv,
      savingsPercent: CANONICAL_PRICING_USD.SAVINGS_PERCENT,
      isApproximate: currency !== "USD",
      lastUpdated: this.ratesData.lastUpdated,
      isFallbackRates: Boolean(this.ratesData.isFallback),
    };
  }

  /**
   * Subscribe to currency change events
   */
  public subscribe(listener: CurrencyChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(currency: SupportedCurrencyCode): void {
    for (const listener of this.listeners) {
      try {
        listener(currency);
      } catch (err) {
        console.error("[CurrencyService] Error executing listener:", err);
      }
    }
  }
}

export const CurrencyService = new CurrencyServiceClass();
