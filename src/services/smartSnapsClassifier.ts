/**
 * SnapFind AI - Smart Snaps Classifier & Financial Intelligence Engine
 * 
 * Accurately classifies screenshots using combined OCR, visual cues, categories,
 * keywords, and entities into Smart Snaps categories:
 * - Banking
 * - Transactions
 * - Payments
 * - Money Transfers
 * - Receipts
 * - Orders
 * - Invoices
 * - IDs/Documents
 * - Personal
 * - Private Messages
 * - Travel
 * - Shopping
 * - Work
 * - Other
 * 
 * Strict Financial Evidence Rule:
 * Requires substantive banking/financial markers (bank names, transaction IDs,
 * debit/credit statements, transfer confirmations, IBAN, UPI/wallet receipts)
 * rather than accidental mentions of words like "pay" or "money".
 */

import { SmartCategoryType, ScreenshotItem } from "../types";
import { detectScreenshotPrivacy, PrivacyLevel } from "./privacyDetector";

export interface SmartSnapsResult {
  smartCategory: SmartCategoryType;
  privacyLevel: PrivacyLevel;
  sensitiveCategories: string[];
  privacyReasons: string[];
  isSensitive: boolean;
  isFinance: boolean;
  detectedBankOrService?: string;
}

// Well-known financial institutions, payment gateways, and wallet providers
const KNOWN_FINANCIAL_PROVIDERS = [
  "chase", "bank of america", "wells fargo", "citibank", "capital one", "pnc bank",
  "us bank", "barclays", "hsbc", "santander", "lloyds", "natwest", "revolut", "monzo",
  "starling", "n26", "wise", "transferwise", "western union", "remitly", "paypal",
  "stripe", "square", "venmo", "cash app", "zelle", "apple pay", "google pay", "samsung pay",
  "paytm", "phonepe", "gpay", "bhim", "easypaisa", "jazzcash", "nayapay", "sadapay",
  "hbl", "meezan", "ubl", "mcb", "bank alfalah", "allied bank", "standard chartered",
  "crypto.com", "binance", "coinbase", "kraken"
];

// Strong markers that indicate genuine banking / transaction / money transfer
const STRONG_FINANCIAL_PATTERNS = [
  /\btransaction\s*(?:id|ref|reference|hash|number|no\.?)\b/i,
  /\b(?:payment|transfer)\s*(?:successful|confirmed|completed|receipt|details|failed|pending)\b/i,
  /\b(?:transferred|sent|paid)\s*(?:to|amount)\b/i,
  /\b(?:received\s*from|credited\s*to|debited\s*from)\b/i,
  /\bbalance\s*(?:after|before|available|current|inquiry)\b/i,
  /\b(?:account|card)\s*(?:ending\s*in|number|balance)\b/i,
  /\b(?:interbank|wire|funds?)\s*transfer\b/i,
  /\b(?:iban|swift|bic|routing\s*number|ifsc\s*code)\b/i,
  /\b(?:statement\s*period|account\s*statement|monthly\s*statement)\b/i,
  /\b(?:fee|charge|total\s*paid|amount\s*paid)\s*[:$€£¥₹Rs\.]\b/i,
  /\b(?:upi\s*ref|upi\s*transaction|rrn\s*no)\b/i
];

// Context words to weed out false positives (e.g. news articles, casual text)
const FALSE_POSITIVE_PATTERNS = [
  /\bhow\s+to\s+pay\b/i,
  /\bpay\s+attention\b/i,
  /\bpay\s+respects?\b/i,
  /\bmoney\s+(?:can't|cannot)\s+buy\b/i,
  /\bworth\s+the\s+money\b/i,
  /\bsave\s+money\s+by\b/i,
  /\bgiveaway\b/i
];

/**
 * Classifies screenshot into Smart Snaps categories and assigns privacy level
 */
export function classifySmartSnaps(
  ocrText: string = "",
  title: string = "",
  category: string = "",
  tags: string[] = [],
  entities: string[] = [],
  keywords: string[] = []
): SmartSnapsResult {
  const normalizedOcr = ocrText.toLowerCase();
  const fullText = `${title} ${category} ${tags.join(" ")} ${entities.join(" ")} ${keywords.join(" ")} ${ocrText}`.toLowerCase();

  // 1. Run baseline privacy detector
  const privacy = detectScreenshotPrivacy(ocrText, title, category, tags);
  let privacyLevel = privacy.privacyLevel;
  let sensitiveCategories = [...privacy.sensitiveCategories];
  let privacyReasons = [...privacy.privacyReasons];

  // 2. Strict Financial Detection
  let detectedProvider: string | undefined = undefined;
  for (const prov of KNOWN_FINANCIAL_PROVIDERS) {
    if (fullText.includes(prov)) {
      detectedProvider = prov.charAt(0).toUpperCase() + prov.slice(1);
      break;
    }
  }

  let strongFinancialMatches = 0;
  for (const pat of STRONG_FINANCIAL_PATTERNS) {
    if (pat.test(fullText)) {
      strongFinancialMatches++;
    }
  }

  const hasFalsePositive = FALSE_POSITIVE_PATTERNS.some((pat) => pat.test(fullText));
  const hasStrongFinancialEvidence = (strongFinancialMatches >= 2 || (detectedProvider && strongFinancialMatches >= 1)) && !hasFalsePositive;

  // 3. Category Decision Tree
  let smartCategory: SmartCategoryType = "Other";

  // Check IDs / Government Documents
  if (
    category === "Passport" ||
    category === "Admission & Certificate" ||
    privacy.sensitiveCategories.includes("government_id") ||
    /\b(?:passport|national identity|cnic|driving license|driver's license|social security|ssn|visa card|identity card)\b/i.test(fullText)
  ) {
    smartCategory = "IDs/Documents";
    privacyLevel = "highly_sensitive";
    if (!sensitiveCategories.includes("government_id")) {
      sensitiveCategories.push("government_id");
      privacyReasons.push("Government identity or official identification document");
    }
  }
  // Check Money Transfers & Transactions
  else if (
    hasStrongFinancialEvidence &&
    (/\b(?:transfer|transferred|sent to|beneficiary|remittance|wire transfer|zelle|interbank)\b/i.test(fullText))
  ) {
    smartCategory = "Money Transfers";
    privacyLevel = privacyLevel === "highly_sensitive" ? "highly_sensitive" : "private";
    if (!sensitiveCategories.includes("financial_information")) {
      sensitiveCategories.push("financial_information");
      privacyReasons.push("Bank money transfer confirmation detected");
    }
  }
  // Check Banking / Bank statements
  else if (
    hasStrongFinancialEvidence &&
    (/\b(?:bank\s*statement|account\s*statement|available\s*balance|account\s*balance|checking\s*account|savings\s*account|deposit)\b/i.test(fullText) ||
      (detectedProvider && /\b(?:account|statement|deposit|balance)\b/i.test(fullText)))
  ) {
    smartCategory = "Banking";
    privacyLevel = privacyLevel === "highly_sensitive" ? "highly_sensitive" : "private";
    if (!sensitiveCategories.includes("financial_information")) {
      sensitiveCategories.push("financial_information");
      privacyReasons.push("Banking statement or account details detected");
    }
  }
  // Check Transactions & Payments
  else if (
    hasStrongFinancialEvidence &&
    (/\b(?:payment\s*(?:successful|completed|confirmed|receipt)|paid\s*to|total\s*paid|transaction\s*id)\b/i.test(fullText))
  ) {
    smartCategory = "Payments";
    privacyLevel = privacyLevel === "highly_sensitive" ? "highly_sensitive" : "private";
    if (!sensitiveCategories.includes("bank_transaction")) {
      sensitiveCategories.push("bank_transaction");
      privacyReasons.push("Financial transaction or payment confirmation detected");
    }
  }
  // General Financial Transactions
  else if (hasStrongFinancialEvidence || category === "Financial") {
    smartCategory = "Transactions";
    privacyLevel = privacyLevel === "highly_sensitive" ? "highly_sensitive" : "private";
    if (!sensitiveCategories.includes("financial_information")) {
      sensitiveCategories.push("financial_information");
      privacyReasons.push("Financial record detected");
    }
  }
  // Check Invoices & Receipts
  else if (
    category === "Receipt & Invoice" ||
    /\b(?:invoice|receipt|tax invoice|bill to|subtotal|gst\b|vat\b|amount due|sales receipt)\b/i.test(fullText)
  ) {
    if (/\binvoice\b/i.test(fullText)) {
      smartCategory = "Invoices";
    } else {
      smartCategory = "Receipts";
    }
  }
  // Check Orders & Shopping
  else if (
    category === "E-Commerce" ||
    /\b(?:amazon|order #|order confirmed|shipped to|tracking number|package delivered|shopping cart|checkout)\b/i.test(fullText)
  ) {
    if (/\border\s*#|order\s*number|order\s*confirmed\b/i.test(fullText)) {
      smartCategory = "Orders";
    } else {
      smartCategory = "Shopping";
    }
  }
  // Check Private Messages & Chat
  else if (
    category === "Chat & Message" ||
    privacy.sensitiveCategories.includes("private_identity") ||
    /\b(?:whatsapp|telegram|imessage|direct message|dm\b|messenger|slack|discord|signal)\b/i.test(fullText)
  ) {
    smartCategory = "Private Messages";
    privacyLevel = privacyLevel === "highly_sensitive" ? "highly_sensitive" : "private";
    if (!sensitiveCategories.includes("private_messages")) {
      sensitiveCategories.push("private_messages");
      privacyReasons.push("Private chat conversation or personal message log");
    }
  }
  // Check Travel & Tickets
  else if (
    category === "Ticket & Travel" ||
    /\b(?:boarding pass|flight|airline|departure|arrival|gate\b|seat\b|pnr\b|hotel booking|airbnb|itinerary)\b/i.test(fullText)
  ) {
    smartCategory = "Travel";
  }
  // Check Work & Code & Dev
  else if (
    category === "Code & Dev" ||
    /\b(?:github|terminal|bash|powershell|const |function |import |console\.log|npm |docker|kubectl|git commit)\b/i.test(fullText)
  ) {
    smartCategory = "Work";
  }
  // Check Passwords / Credentials -> Personal
  else if (
    privacy.sensitiveCategories.includes("passwords_credentials") ||
    /\b(?:password|recovery phrase|seed phrase|api key|secret key|auth token)\b/i.test(fullText)
  ) {
    smartCategory = "Personal";
    privacyLevel = "highly_sensitive";
  } else {
    smartCategory = "Other";
  }

  // If there's meaningful evidence of sensitive info, default to private rather than exposing
  if (sensitiveCategories.length > 0 && privacyLevel === "normal") {
    privacyLevel = "private";
  }

  const isSensitive = privacyLevel === "private" || privacyLevel === "highly_sensitive";
  const isFinance = ["Banking", "Transactions", "Payments", "Money Transfers"].includes(smartCategory) || hasStrongFinancialEvidence;

  return {
    smartCategory,
    privacyLevel,
    sensitiveCategories: Array.from(new Set(sensitiveCategories)),
    privacyReasons: Array.from(new Set(privacyReasons)),
    isSensitive,
    isFinance,
    detectedBankOrService: detectedProvider,
  };
}

/**
 * Check if a screenshot is genuinely financial / payment related
 */
export function isFinanceOrPaymentScreenshot(item: ScreenshotItem): boolean {
  if (
    item.smart_category === "Banking" ||
    item.smart_category === "Transactions" ||
    item.smart_category === "Payments" ||
    item.smart_category === "Money Transfers" ||
    item.smartCategory === "Banking" ||
    item.smartCategory === "Transactions" ||
    item.smartCategory === "Payments" ||
    item.smartCategory === "Money Transfers" ||
    item.collectionName === "💳 Banking & Payments" ||
    item.collection === "💳 Banking & Payments"
  ) {
    return true;
  }

  const tags = item.tags || [];
  const ocr = item.fullText || item.ocr_text || "";
  const title = item.title || "";
  const cat = item.category || "";

  const analysis = classifySmartSnaps(ocr, title, cat, tags);
  return analysis.isFinance;
}

/**
 * Check if a screenshot should be treated as sensitive / private
 */
export function isSensitiveScreenshot(item: ScreenshotItem): boolean {
  if (
    item.privacy_level === "private" ||
    item.privacy_level === "highly_sensitive" ||
    item.privacyLevel === "private" ||
    item.privacyLevel === "highly_sensitive" ||
    item.is_sensitive === true ||
    item.isSensitive === true ||
    item.collectionName === "🔒 Private & Sensitive" ||
    item.collection === "🔒 Private & Sensitive"
  ) {
    return true;
  }

  // Re-verify if not explicitly marked
  const tags = item.tags || [];
  const ocr = item.fullText || item.ocr_text || "";
  const title = item.title || "";
  const cat = item.category || "";
  const analysis = classifySmartSnaps(ocr, title, cat, tags);
  return analysis.isSensitive;
}

/**
 * Return safe non-revealing label or summary for sensitive items
 */
export function getSafePreviewSummary(item: ScreenshotItem): string {
  const smartCat = item.smart_category || item.smartCategory;
  if (smartCat === "Banking" || smartCat === "Transactions" || smartCat === "Payments" || smartCat === "Money Transfers") {
    return "Sensitive financial screenshot (Protected)";
  }
  if (smartCat === "IDs/Documents") {
    return "Protected identity document";
  }
  if (smartCat === "Private Messages") {
    return "Private conversation log (Protected)";
  }
  return "Protected sensitive content";
}
