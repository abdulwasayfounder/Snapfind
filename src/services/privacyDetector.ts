/**
 * SnapFind AI - Sensitive Information & Privacy Protection Engine
 * 
 * Automatically detects whether an image or OCR extract contains private or sensitive data:
 * - National Identity (CNIC, SSN, Passports, Driving Licenses)
 * - Financial & Payment (Credit/Debit Card numbers, CVV, Bank Account / IBAN)
 * - Passwords, Credentials, API Keys, 2FA/OTP tokens
 * - Medical & Health records
 * - Private messages & personal identity
 * 
 * Provides automated masking, classification (normal / private / highly_sensitive),
 * and zero-exposure protection.
 */

export type PrivacyLevel = "normal" | "private" | "highly_sensitive";

export interface PrivacyAnalysisResult {
  privacyLevel: PrivacyLevel;
  isSensitive: boolean;
  sensitiveCategories: string[];
  privacyReasons: string[];
  maskedOcrText: string;
}

// Common pattern matchers for sensitive data
const PATTERNS = {
  // Pakistani CNIC: 13 digits, often formatted as 12345-1234567-1
  pakistaniCnic: /\b\d{5}[- ]?\d{7}[- ]?\d\b/g,
  
  // US SSN: 9 digits, formatted as 123-45-6789
  usSsn: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g,
  
  // Credit / Debit cards: 13 to 19 digits, standard 16 digits
  creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4})\b/g,
  
  // CVV / Security codes (e.g., CVV: 123, CVC: 1234)
  cardCvv: /\b(?:cvv|cvc|cvn|security code|security digits)[:\s]+(\d{3,4})\b/gi,
  
  // Generic Passwords, API keys, tokens
  apiKey: /\b(?:sk_[a-zA-Z0-9_-]{24,}|AIzaSy[a-zA-Z0-9_-]{33}|ghp_[a-zA-Z0-9]{36}|Bearer\s+[a-zA-Z0-9_.-]{30,})\b/g,
  
  // Password indicators
  passwordIndicator: /\b(?:password|passcode|secret_key|api_secret|access_token|private_key|auth_token|recovery key|seed phrase)[:\s]+([^\s\r\n]{6,})\b/gi,
  
  // OTP / 2FA verification codes
  otpCode: /\b(?:otp|2fa|verification code|security code|login code)[:\s]+(\d{4,8})\b/gi,
  
  // International Bank Account Number (IBAN)
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
};

// Keyword dictionaries for contextual sensitivity detection
const SENSITIVE_KEYWORDS = {
  governmentId: [
    "cnic", "national identity", "identity card", "nadra", "passport no", "passport number",
    "driving license", "driver license", "social security", "ssn", "republic of", "nationality",
    "date of expiry", "issuing authority", "holder's signature", "national id"
  ],
  financial: [
    "card number", "cardholder", "expiry date", "valid thru", "cvv", "cvc", "credit card",
    "debit card", "account number", "routing number", "iban", "swift", "bank statement",
    "account balance", "current balance", "available balance", "payroll", "salary slip", "tax return"
  ],
  credentials: [
    "password", "passcode", "secret key", "api key", "access token", "private key",
    "seed phrase", "secret phrase", "recovery words", "client secret", "master password",
    "verification code", "one time password", "authenticator code"
  ],
  medical: [
    "patient name", "medical report", "diagnostic report", "prescription", "lab test result",
    "blood test", "physician", "hospital discharge", "clinical diagnosis", "health insurance claim"
  ],
  confidential: [
    "strictly confidential", "private and confidential", "nda", "classified", "internal only",
    "trade secret", "confidential document"
  ]
};

/**
 * Mask sensitive strings to prevent inadvertent exposure in UI or logs
 */
export function maskSensitiveOcrText(text: string): string {
  if (!text) return "";
  let masked = text;

  // Mask Pakistani CNIC
  masked = masked.replace(PATTERNS.pakistaniCnic, (match) => {
    return match.replace(/\d/g, (d, idx) => (idx >= 5 && idx <= 12 ? "X" : d));
  });

  // Mask US SSN
  masked = masked.replace(PATTERNS.usSsn, (match) => {
    return "XXX-XX-" + match.slice(-4);
  });

  // Mask Credit Cards (leave only last 4 digits)
  masked = masked.replace(PATTERNS.creditCard, (match) => {
    const cleanDigits = match.replace(/[\s-]/g, "");
    if (cleanDigits.length >= 13) {
      const last4 = cleanDigits.slice(-4);
      return "•••• •••• •••• " + last4;
    }
    return match;
  });

  // Mask CVV
  masked = masked.replace(PATTERNS.cardCvv, (_match, digits) => {
    return _match.replace(digits, "•••");
  });

  // Mask API Keys
  masked = masked.replace(PATTERNS.apiKey, (match) => {
    return match.slice(0, 4) + "••••••••••••••••";
  });

  // Mask Passwords
  masked = masked.replace(PATTERNS.passwordIndicator, (match, pw) => {
    return match.replace(pw, "••••••••");
  });

  // Mask OTPs
  masked = masked.replace(PATTERNS.otpCode, (match, otp) => {
    return match.replace(otp, "••••••");
  });

  // Mask International Bank Account Number (IBAN)
  masked = masked.replace(PATTERNS.iban, (match) => {
    if (match.length > 8) {
      const prefix = match.slice(0, 4);
      const suffix = match.slice(-4);
      return `${prefix}••••••••${suffix}`;
    }
    return match;
  });

  return masked;
}

/**
 * Analyze OCR text, titles, and categories to classify screenshot privacy
 */
export function detectScreenshotPrivacy(
  ocrText: string = "",
  title: string = "",
  category: string = "",
  tags: string[] = []
): PrivacyAnalysisResult {
  const fullCorpus = `${title} ${category} ${tags.join(" ")} ${ocrText}`.toLowerCase();
  
  const sensitiveCategories: string[] = [];
  const privacyReasons: string[] = [];
  let isHighlySensitive = false;
  let isPrivate = false;

  // 1. Check Government ID Patterns
  const hasCnic = PATTERNS.pakistaniCnic.test(ocrText);
  const hasSsn = PATTERNS.usSsn.test(ocrText);
  const hasGovKeywords = SENSITIVE_KEYWORDS.governmentId.some((kw) => fullCorpus.includes(kw));

  if (hasCnic || hasSsn || hasGovKeywords || category === "Passport" || category === "Admission & Certificate") {
    sensitiveCategories.push("government_id");
    privacyReasons.push(hasCnic ? "National ID (CNIC) detected" : hasSsn ? "Social Security Number detected" : "Government ID / Identification document detected");
    isHighlySensitive = true;
  }

  // 2. Check Credit / Debit Card & Banking
  const hasCard = PATTERNS.creditCard.test(ocrText);
  const hasCvv = PATTERNS.cardCvv.test(ocrText);
  const hasIban = PATTERNS.iban.test(ocrText);
  const hasFinKeywords = SENSITIVE_KEYWORDS.financial.some((kw) => fullCorpus.includes(kw));

  if (hasCard || hasCvv) {
    sensitiveCategories.push("payment_information");
    privacyReasons.push("Payment card or security credentials detected");
    isHighlySensitive = true;
  } else if (hasIban || hasFinKeywords || category === "Financial") {
    sensitiveCategories.push("financial_information");
    privacyReasons.push("Financial statements or banking account information detected");
    isPrivate = true;
  }

  // 3. Check Passwords, Keys, Tokens
  const hasApiKey = PATTERNS.apiKey.test(ocrText);
  const hasPassword = PATTERNS.passwordIndicator.test(ocrText);
  const hasOtp = PATTERNS.otpCode.test(ocrText);
  const hasCredKeywords = SENSITIVE_KEYWORDS.credentials.some((kw) => fullCorpus.includes(kw));

  if (hasApiKey || hasPassword || hasOtp || hasCredKeywords) {
    sensitiveCategories.push("passwords_credentials");
    privacyReasons.push("Secret keys, authentication tokens, or password credentials detected");
    isHighlySensitive = true;
  }

  // 4. Check Medical & Health Records
  const hasMedKeywords = SENSITIVE_KEYWORDS.medical.some((kw) => fullCorpus.includes(kw));
  if (hasMedKeywords) {
    sensitiveCategories.push("medical_health");
    privacyReasons.push("Medical reports or personal health records detected");
    isPrivate = true;
  }

  // 5. Check Confidential / Private Communications
  const hasConfidential = SENSITIVE_KEYWORDS.confidential.some((kw) => fullCorpus.includes(kw));
  if (hasConfidential || category === "Chat & Message") {
    sensitiveCategories.push("private_identity");
    privacyReasons.push(hasConfidential ? "Confidential disclosure markers found" : "Private communication/chat records detected");
    isPrivate = true;
  }

  // Determine final privacy level
  let privacyLevel: PrivacyLevel = "normal";
  if (isHighlySensitive) {
    privacyLevel = "highly_sensitive";
  } else if (isPrivate) {
    privacyLevel = "private";
  }

  const isSensitive = privacyLevel !== "normal";
  const maskedOcrText = isSensitive ? maskSensitiveOcrText(ocrText) : ocrText;

  return {
    privacyLevel,
    isSensitive,
    sensitiveCategories,
    privacyReasons,
    maskedOcrText,
  };
}

/**
 * Human-friendly labels for sensitive categories
 */
export function getSensitiveCategoryLabel(categoryKey: string): string {
  switch (categoryKey) {
    case "government_id":
      return "Government Identification (CNIC / Passport / ID)";
    case "payment_information":
      return "Payment Cards & Security CVV";
    case "financial_information":
      return "Banking & Financial Statement";
    case "passwords_credentials":
      return "Passwords, Keys & Authentication Tokens";
    case "medical_health":
      return "Medical & Personal Health Record";
    case "private_identity":
      return "Private Communications & Confidential Data";
    default:
      return "Personal Sensitive Information";
  }
}
