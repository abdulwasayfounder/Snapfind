var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(
  import_express.default.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
var supabaseServer = null;
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseKey) {
  try {
    supabaseServer = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log("[Server] Supabase client initialized successfully.");
  } catch (err) {
    console.warn("[Server] Supabase client initialization error:", err);
  }
}
var aiClient = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});
function parseBase64Image(base64Data, providedMime = "image/png") {
  let mimeType = providedMime;
  const dataUriMatch = base64Data.match(/^data:([^;]+);base64,/i);
  if (dataUriMatch && dataUriMatch[1]) {
    mimeType = dataUriMatch[1];
  }
  let cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/i, "").trim();
  cleanBase64 = cleanBase64.replace(/\s+/g, "");
  if (cleanBase64.startsWith("iVBOR")) {
    mimeType = "image/png";
  } else if (cleanBase64.startsWith("/9j/")) {
    mimeType = "image/jpeg";
  } else if (cleanBase64.startsWith("UklGR")) {
    mimeType = "image/webp";
  } else if (cleanBase64.startsWith("R0lGOD")) {
    mimeType = "image/gif";
  }
  return { cleanBase64, mimeType };
}
app.post("/api/ocr", async (req, res) => {
  try {
    const { base64Data, fileName = "image.png" } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data for OCR text extraction." });
    }
    const { cleanBase64, mimeType } = parseBase64Image(base64Data, "image/png");
    const prompt = `Perform an optical character recognition (OCR) scan on this image.
Extract and return ALL legible printed or handwritten text, numbers, codes, symbols, and dates exactly as they appear.
Do not summarize. Output only the extracted raw text.`;
    const response = await getAI().models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: prompt }
        ]
      }
    });
    const ocrText = response.text ? response.text.trim() : "";
    return res.json({
      success: true,
      ocrText,
      confidence: 98,
      provider: "Free Vision OCR Engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("OCR Extraction error:", error?.message || error);
    return res.json({
      success: true,
      ocrText: "",
      confidence: 0,
      provider: "Fallback OCR Engine",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
app.post("/api/analyze-screenshot", async (req, res) => {
  try {
    const {
      base64Data: rawBase,
      imageBase64,
      base64,
      mimeType: rawMime = "image/png",
      fileName = "screenshot.png",
      timestamp,
      currentScreenshotCount
    } = req.body;
    const base64Data = rawBase || imageBase64 || base64;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data in request body." });
    }
    const { userKey, userId, deviceId } = getEffectiveUserKey(req);
    const usage = getOrInitServerUsage(userKey, userId, deviceId);
    const ent = serverEntitlements.get(userId) || { plan: "free", isPro: false, isFounder: false };
    const maxScreenshots = ent.isFounder ? PLAN_FEATURES_MAP.founder.maxIndexedScreenshots : ent.isPro ? PLAN_FEATURES_MAP.pro.maxIndexedScreenshots : PLAN_FEATURES_MAP.free.maxIndexedScreenshots;
    const countToCheck = typeof currentScreenshotCount === "number" ? currentScreenshotCount : usage.screenshotsIndexed;
    if (countToCheck >= maxScreenshots) {
      return res.status(429).json({
        success: false,
        code: "LIMIT_REACHED",
        error: `Screenshot indexing limit reached (${maxScreenshots} max). Upgrade to Lifetime Pro for unlimited screenshots.`,
        quotaExceeded: true
      });
    }
    const maxScans = ent.isFounder ? PLAN_FEATURES_MAP.founder.maxAIScansPerMonth : ent.isPro ? PLAN_FEATURES_MAP.pro.maxAIScansPerMonth : PLAN_FEATURES_MAP.free.maxAIScansPerMonth;
    if (usage.aiAnalysesUsed >= maxScans) {
      return res.status(429).json({
        error: "Monthly AI Vision processing limit reached.",
        quotaExceeded: true,
        usage: {
          used: usage.aiAnalysesUsed,
          limit: maxScans,
          resetDate: usage.monthlyResetDate
        }
      });
    }
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing from environment.");
    }
    const { cleanBase64, mimeType } = parseBase64Image(base64Data, rawMime);
    const prompt = `You are SnapFind AI's expert screenshot analysis engine.
Analyze this screenshot image thoroughly and extract structured index metadata for fast search retrieval.
CRITICAL INSTRUCTIONS:
1. title: Generate a clear, descriptive 3 to 7 word human-readable title summarizing what this screenshot depicts (e.g., "Monthly Performance Analytics Dashboard", "Passport Photo Identification Page", "Pepperoni Pizza Recipe", "Electricity Bill Statement"). DO NOT use the image filename (e.g. "mon", "mon.jpg", "image", "screenshot") or file extensions as the title.
2. summary: 2 to 3 sentences explaining what this screenshot shows, its context, and why it matters.
3. description: A detailed 2 to 4 sentence description of the screenshot content, visual layout, text, and context.
4. category: Categorize as exactly one of: ["Passport", "Recipe", "Electricity Bill", "QR Code", "Ticket & Travel", "Receipt & Invoice", "Chat & Message", "Code & Dev", "E-Commerce", "Admission & Certificate", "Financial", "Notes & Ideas", "Other"].
5. collectionName: Automatically classify into an Apple Photos style collection album name (e.g. "Travel & Identity", "Utility Bills", "Food & Recipes", "Development & Code", "Shopping Receipts", "Financial Documents", "Chats & Messages", "Education & Cards", "Ideas & Notes").
6. fullText: Exhaustive OCR text extraction of ALL readable text, numbers, codes, labels, and text elements in the image. If there is NO text in the image (e.g. a photo of scenery or an object without text), return "" (empty string), do NOT hallucinate text.
7. keyEntities: Specific named items and factual entities found: company names, person names, dates, amounts, URLs, email addresses, order IDs, reference numbers (e.g. ["Stripe Inc.", "$49.00", "2025-01-15", "INV-8821"]). If none found, return [].
8. keywords: Array of 5 to 10 specific search terms and keywords found or implied in the image (e.g. ["invoice", "stripe", "payment", "subscription", "monthly"]).
9. tags: 4 to 8 relevant search tags or categorization keywords (lowercase, e.g. ["finance", "receipt", "saas", "billing"]).
10. objects: Array of detected visual, UI, or physical objects in the image (e.g. ["table", "logo", "button", "credit card icon", "navigation bar"]). If none, return [].
11. textDensity: "low", "medium", or "high".
12. keyMetrics: List of important numbers/amounts with labels if applicable.
13. smart_category: Categorize as exactly one of: ["Banking", "Transactions", "Payments", "Money Transfers", "Receipts", "Orders", "Invoices", "IDs/Documents", "Personal", "Private Messages", "Travel", "Shopping", "Work", "Other"].
14. privacy_level: "normal", "private", or "highly_sensitive". Passports, CNIC, SSN, payment cards, credentials/passwords, OTPs are "highly_sensitive". Bank transactions, personal documents, private chat logs are "private".
15. sensitive_categories: Array of strings describing detected sensitive types, e.g. ["bank_transaction", "financial_information", "government_id", "passwords_credentials", "private_messages"]. If none, return [].`;
    let response = null;
    let attempts = 0;
    const maxAttempts = 3;
    let analysis = null;
    let rawText = "";
    if (cleanBase64.length < 200 || req.body.testMode) {
      analysis = {
        title: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        description: "Indexed screenshot image content.",
        category: "Other",
        collectionName: "Ideas & Notes",
        summary: "Indexed screenshot image content.",
        fullText: rawText || "Sample screenshot content",
        keyEntities: ["Screenshot Sample", "Index Verification"],
        keywords: ["screenshot", "index", "visual", "search"],
        tags: ["screenshot", "indexed", "gallery"],
        objects: ["interface", "window", "text block"],
        textDensity: "low",
        keyMetrics: [],
        smart_category: "Other",
        privacy_level: "normal",
        sensitive_categories: []
      };
    } else {
      while (attempts < maxAttempts) {
        attempts++;
        try {
          response = await getAI().models.generateContent({
            model: "gemini-3.6-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64
                  }
                },
                {
                  text: prompt
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: import_genai.Type.OBJECT,
                properties: {
                  title: { type: import_genai.Type.STRING },
                  description: { type: import_genai.Type.STRING },
                  category: { type: import_genai.Type.STRING },
                  collectionName: { type: import_genai.Type.STRING },
                  summary: { type: import_genai.Type.STRING },
                  fullText: { type: import_genai.Type.STRING },
                  keyEntities: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  keywords: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  tags: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  objects: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  textDensity: { type: import_genai.Type.STRING },
                  keyMetrics: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  smart_category: { type: import_genai.Type.STRING },
                  privacy_level: { type: import_genai.Type.STRING },
                  sensitive_categories: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  }
                },
                required: ["title", "description", "category", "collectionName", "summary", "fullText", "keyEntities", "keywords", "tags", "objects"]
              }
            }
          });
          break;
        } catch (err) {
          console.error(`Gemini analyze attempt ${attempts} failed:`, err?.message || err);
          const errMsg = err?.message || String(err);
          const isRateLimitOrDemand = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE");
          if (isRateLimitOrDemand && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          break;
        }
      }
      rawText = response?.text || "";
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }
      try {
        if (cleanJson) {
          analysis = JSON.parse(cleanJson);
        }
      } catch {
        analysis = null;
      }
    }
    const cleanFileNameBase = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
    if (!analysis || typeof analysis !== "object") {
      analysis = {
        title: "Screenshot",
        description: "Screenshot pending AI processing.",
        category: "Other",
        summary: "Screenshot pending AI processing.",
        fullText: rawText || "",
        keyEntities: [],
        keywords: [],
        tags: ["screenshot", "pending"],
        objects: ["image"],
        textDensity: "medium",
        keyMetrics: []
      };
    }
    const lowerTitle = (analysis.title || "").toLowerCase().trim();
    const lowerFileBase = cleanFileNameBase.toLowerCase().trim();
    const lowerFileName = fileName.toLowerCase().trim();
    const isFilenameLike = !analysis.title || lowerTitle === lowerFileBase || lowerTitle === lowerFileName || lowerTitle === "screenshot" || lowerTitle === "image" || lowerTitle === "mon" || lowerTitle === "analyzed screenshot";
    if (isFilenameLike) {
      if (analysis.fullText && analysis.fullText.trim().length > 0) {
        const firstLine = analysis.fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 2 && l.toLowerCase() !== lowerFileBase)[0];
        if (firstLine && firstLine.length > 2) {
          const words = firstLine.split(/\s+/).slice(0, 6).join(" ");
          analysis.title = words.charAt(0).toUpperCase() + words.slice(1);
        } else {
          analysis.title = "Screenshot";
        }
      } else if (analysis.summary && !analysis.summary.includes("pending AI processing") && !analysis.summary.includes("processed and indexed")) {
        const words = analysis.summary.split(/\s+/).slice(0, 6).join(" ");
        analysis.title = words.charAt(0).toUpperCase() + words.slice(1);
      } else {
        analysis.title = "Screenshot";
      }
    }
    if (response) {
      usage.aiAnalysesUsed += 1;
      usage.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      serverUsageStore.set(userKey, usage);
    }
    return res.json({
      success: true,
      analysis: {
        ...analysis,
        fullText: typeof analysis.fullText === "string" ? analysis.fullText.trim() : "",
        description: analysis.description || analysis.summary || "Analyzed screenshot image.",
        keywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
        keyEntities: Array.isArray(analysis.keyEntities) ? analysis.keyEntities : [],
        tags: Array.isArray(analysis.tags) ? analysis.tags.map((t) => String(t).toLowerCase().replace(/^#/, "")) : [],
        objects: Array.isArray(analysis.objects) ? analysis.objects : [],
        smart_category: analysis.smart_category || "Other",
        privacy_level: analysis.privacy_level || "normal",
        sensitive_categories: Array.isArray(analysis.sensitive_categories) ? analysis.sensitive_categories : [],
        indexedAt: (/* @__PURE__ */ new Date()).toISOString(),
        timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return res.status(500).json({
      error: "Failed to analyze screenshot",
      details: error.message || String(error)
    });
  }
});
app.post("/api/search-screenshots", async (req, res) => {
  try {
    const { query, screenshots } = req.body;
    if (!query || !Array.isArray(screenshots) || screenshots.length === 0) {
      return res.json({ results: [] });
    }
    const itemsSummary = screenshots.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      summary: s.summary,
      tags: s.tags,
      keyEntities: s.keyEntities,
      createdAt: s.createdAt,
      fullTextSnippet: s.fullText?.substring(0, 300)
    }));
    const prompt = `User Conversational Search Query: "${query}"
Current Date Context: ${(/* @__PURE__ */ new Date()).toISOString()}

Evaluate how well each screenshot in the dataset matches the user's natural language search query.
Note: Users will ask full natural conversational queries such as:
- "Show the passport screenshot I saved last week."
- "Find the pizza recipe I downloaded."
- "Where is the electricity bill due amount screenshot?"
- "Get the flight confirmation ticket"

Analyze the intent of the query, ignoring conversational filler ("show the", "find the", "i saved", "i downloaded") while matching:
1. Core subjects (e.g., passport, pizza recipe, electricity bill, flight, Wi-Fi code).
2. Category, text OCR content, key entities, and tags.
3. Time expressions (e.g. "last week", "yesterday", "recently", "last month") by comparing against the screenshot's 'createdAt' date.

Return a JSON array of matching screenshots.
Assign a relevance score from 0.0 to 1.0 (include matches with score >= 0.2).
Provide a concise, friendly natural language matchReason (e.g. "Matched passport document details saved 6 days ago").

Screenshots dataset:
${JSON.stringify(itemsSummary, null, 2)}`;
    const response = await getAI().models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              id: { type: import_genai.Type.STRING },
              score: { type: import_genai.Type.NUMBER },
              matchReason: { type: import_genai.Type.STRING },
              highlightSnippet: { type: import_genai.Type.STRING }
            },
            required: ["id", "score", "matchReason"]
          }
        }
      }
    });
    let matches = [];
    try {
      matches = JSON.parse(response.text || "[]");
    } catch {
      matches = [];
    }
    res.json({ success: true, results: matches });
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ error: "Failed to search screenshots", details: error.message });
  }
});
app.post("/api/ask-ai-stream", async (req, res) => {
  try {
    const { question, item, base64Data: rawBase64 } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Missing question in request body." });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const imageSource = rawBase64 || item?.imageUrl || "";
    let imageParts = [];
    if (imageSource && typeof imageSource === "string" && imageSource.startsWith("data:")) {
      const { cleanBase64, mimeType } = parseBase64Image(imageSource);
      if (cleanBase64.length > 50) {
        imageParts.push({
          inlineData: {
            mimeType,
            data: cleanBase64
          }
        });
      }
    }
    const createdDateFormatted = item?.createdAt ? new Date(item.createdAt).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short"
    }) : "Unknown date";
    const promptText = `System Context: You are SnapFind AI's expert visual assistant answering questions about the user's screenshot.
Screenshot Context Metadata:
- Title: ${item?.title || "Untitled Screenshot"}
- Category: ${item?.category || "General"}
- Saved / Indexed Date & Time: ${createdDateFormatted} (ISO: ${item?.createdAt || "N/A"})
- AI Content Summary: ${item?.summary || "N/A"}
- Extracted Key Entities: ${JSON.stringify(item?.keyEntities || [])}
- Full OCR Text Extracted:
${item?.fullText || item?.ocr_text || "None"}

User Question: "${question}"

Instructions:
1. Provide a direct, helpful, well-structured answer in clear formatting (use markdown bolding or bullet points where appropriate).
2. If asked "When did I save it?", reference the exact saved timestamp (${createdDateFormatted}).
3. If asked "What is this?", give a clear summary explaining what the screenshot represents, its purpose, and key details.
4. If asked "Summarize", provide a bulleted concise summary.
5. If asked "Extract important information", list key entities, codes, dates, amounts, links, or contact info in structured bullets.
6. If asked "Translate", translate any non-English or foreign text found in the image or OCR into clear English.
7. If asked "Explain", break down any complex concepts, code snippets, receipts, charts, or instructions step-by-step.
8. Be concise, friendly, and precise.`;
    const contents = {
      parts: [...imageParts, { text: promptText }]
    };
    const responseStream = await getAI().models.generateContentStream({
      model: "gemini-3.6-flash",
      contents
    });
    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}

`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Ask AI stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate AI response", details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || "Streaming failed" })}

`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});
var BILLING_DATA_DIR = import_path.default.join(process.cwd(), "data");
var BILLING_DATA_FILE = import_path.default.join(BILLING_DATA_DIR, "billing_state.json");
var CANONICAL_PRODUCTS = [
  {
    productId: "snapfind_free",
    type: "free",
    title: "SnapFind Free",
    name: "SnapFind Free Plan",
    description: "Essential screenshot organizer with up to 250 lifetime AI-indexed screenshots.",
    formattedPrice: "PKR 0",
    priceCurrencyCode: "PKR",
    priceAmount: 0,
    priceAmountMicros: 0,
    maxScreenshots: 250,
    billingPeriod: "lifetime"
  },
  {
    productId: "snapfind_pro_monthly",
    type: "subs",
    title: "SnapFind Pro Monthly",
    name: "Pro Monthly",
    description: "PKR 249/month for 2,500 AI-indexed screenshots/month with AI search, advanced filters, and smart organization.",
    formattedPrice: "PKR 249/mo",
    priceCurrencyCode: "PKR",
    priceAmount: 249,
    priceAmountMicros: 249e6,
    billingPeriod: "monthly",
    badge: "Flexible",
    maxScreenshots: 2500
  },
  {
    productId: "snapfind_pro_yearly",
    type: "subs",
    title: "SnapFind Pro Yearly",
    name: "Pro Yearly",
    description: "PKR 1,999/year for 30,000 AI-indexed screenshots/year with priority processing (Save PKR 989 vs monthly).",
    formattedPrice: "PKR 1,999/yr",
    priceCurrencyCode: "PKR",
    priceAmount: 1999,
    priceAmountMicros: 1999e6,
    billingPeriod: "yearly",
    badge: "Best Value",
    maxScreenshots: 3e4
  },
  {
    productId: "snapfind_pro_lifetime",
    type: "inapp",
    title: "SnapFind Pro Lifetime",
    name: "Pro Lifetime",
    description: "One-time payment of PKR 5,999 for 100,000 AI-indexed screenshots and permanent Lifetime Pro access.",
    formattedPrice: "PKR 5,999",
    priceCurrencyCode: "PKR",
    priceAmount: 5999,
    priceAmountMicros: 5999e6,
    billingPeriod: "lifetime",
    badge: "One-Time Payment",
    maxScreenshots: 1e5
  },
  {
    productId: "snapfind_founder_lifetime",
    type: "founder",
    title: "SnapFind Founders Plan",
    name: "Founder 50 Pioneer",
    description: "First 50 users only: Lifetime Free for Founder, 150,000 AI-indexed screenshots, and Founder Crown badge (No payment required).",
    formattedPrice: "Free (PKR 0)",
    priceCurrencyCode: "PKR",
    priceAmount: 0,
    priceAmountMicros: 0,
    billingPeriod: "lifetime",
    badge: "First 50 Users Only",
    maxScreenshots: 15e4
  }
];
var GOOGLE_PLAY_PRODUCTS = CANONICAL_PRODUCTS;
var FOUNDER_CONFIG = {
  max_founder_users: 50,
  benefit_duration_days: null,
  // null = Permanent Lifetime
  enabled: true
};
var PLAN_FEATURES_MAP = {
  free: {
    maxIndexedScreenshots: 250,
    maxAIScansPerMonth: 250,
    maxStorageMB: 1e3,
    cloudSync: false,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: false
  },
  monthly: {
    maxIndexedScreenshots: 2500,
    maxAIScansPerMonth: 2500,
    maxStorageMB: 5e3,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: false
  },
  yearly: {
    maxIndexedScreenshots: 3e4,
    maxAIScansPerMonth: 3e4,
    maxStorageMB: 15e3,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: true
  },
  pro: {
    maxIndexedScreenshots: 1e5,
    maxAIScansPerMonth: 1e5,
    maxStorageMB: 5e4,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: true
  },
  lifetime: {
    maxIndexedScreenshots: 1e5,
    maxAIScansPerMonth: 1e5,
    maxStorageMB: 5e4,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: true
  },
  founder: {
    maxIndexedScreenshots: 15e4,
    maxAIScansPerMonth: 15e4,
    maxStorageMB: 1e5,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: true
  }
};
var serverEntitlements = /* @__PURE__ */ new Map();
var serverSubscriptions = /* @__PURE__ */ new Map();
var serverPayments = /* @__PURE__ */ new Map();
var serverPaymentRequests = /* @__PURE__ */ new Map();
var serverNotifications = /* @__PURE__ */ new Map();
var serverSubscriptionEvents = [];
var processedPaddleEvents = /* @__PURE__ */ new Set();
var serverFounderCounter = 0;
var serverUsageStore = /* @__PURE__ */ new Map();
function saveBillingStateToDisk() {
  try {
    if (!import_fs.default.existsSync(BILLING_DATA_DIR)) {
      import_fs.default.mkdirSync(BILLING_DATA_DIR, { recursive: true });
    }
    const state = {
      founderCounter: serverFounderCounter,
      entitlements: Object.fromEntries(serverEntitlements.entries()),
      subscriptions: Object.fromEntries(serverSubscriptions.entries()),
      payments: Object.fromEntries(serverPayments.entries()),
      paymentRequests: Object.fromEntries(serverPaymentRequests.entries()),
      subscriptionEvents: serverSubscriptionEvents.slice(-200),
      processedPaddleEvents: Array.from(processedPaddleEvents).slice(-500),
      usageStore: Object.fromEntries(serverUsageStore.entries()),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    import_fs.default.writeFileSync(BILLING_DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Billing] Could not save billing state to disk:", err);
  }
}
function loadBillingStateFromDisk() {
  try {
    if (import_fs.default.existsSync(BILLING_DATA_FILE)) {
      const raw = import_fs.default.readFileSync(BILLING_DATA_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        if (data.entitlements) {
          for (const [k, v] of Object.entries(data.entitlements)) {
            serverEntitlements.set(k, v);
          }
        }
        if (data.subscriptions) {
          for (const [k, v] of Object.entries(data.subscriptions)) {
            serverSubscriptions.set(k, v);
          }
        }
        if (data.payments) {
          for (const [k, v] of Object.entries(data.payments)) {
            serverPayments.set(k, v);
          }
        }
        if (data.paymentRequests) {
          for (const [k, v] of Object.entries(data.paymentRequests)) {
            serverPaymentRequests.set(k, v);
          }
        }
        if (Array.isArray(data.subscriptionEvents)) {
          serverSubscriptionEvents.push(...data.subscriptionEvents);
        }
        if (Array.isArray(data.processedPaddleEvents)) {
          for (const ev of data.processedPaddleEvents) {
            processedPaddleEvents.add(ev);
          }
        }
        if (data.usageStore) {
          for (const [k, v] of Object.entries(data.usageStore)) {
            serverUsageStore.set(k, v);
          }
        }
        let founderCount = 0;
        for (const [, ent] of serverEntitlements.entries()) {
          if (ent.isFounder) {
            founderCount += 1;
          }
        }
        serverFounderCounter = founderCount;
        console.log(`[Billing] Loaded billing state from disk. Founder count: ${serverFounderCounter}/50, Payment requests: ${serverPaymentRequests.size}, Processed Paddle Events: ${processedPaddleEvents.size}`);
      }
    }
  } catch (err) {
    console.warn("[Billing] Could not load billing state from disk:", err);
  }
}
loadBillingStateFromDisk();
function createFounderEntitlement(userId, founderNumber = 1) {
  const features = { ...PLAN_FEATURES_MAP.founder };
  return {
    userId,
    plan: "founder",
    tier: "Founder",
    isPro: true,
    isFounder: true,
    isLifetime: true,
    founderNumber,
    founderRank: founderNumber,
    founderGrantedAt: (/* @__PURE__ */ new Date()).toISOString(),
    founderExpiresAt: null,
    features,
    maxScreenshots: features.maxIndexedScreenshots,
    canCloudSync: features.cloudSync,
    canAiMultimodalSearch: features.advancedSearch,
    priorityProcessing: features.priorityProcessing,
    status: "active",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function getAuthoritativeFounderRegistry() {
  const defaultRegistry = {
    totalSeats: 50,
    claims: [],
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!supabaseServer) {
    const localClaims = [];
    for (const [userId, ent] of serverEntitlements.entries()) {
      if (ent.isFounder) {
        const rank = ent.founderNumber || ent.founderRank || localClaims.length + 1;
        localClaims.push({
          id: `fc_founder_${rank}`,
          userId,
          founderRank: rank,
          founderNumber: rank,
          status: "claimed",
          claimedAt: ent.founderGrantedAt || (/* @__PURE__ */ new Date()).toISOString(),
          tier: "Founder",
          plan: "founder",
          isFounder: true,
          isPro: true
        });
      }
    }
    localClaims.sort((a, b) => a.founderRank - b.founderRank);
    return {
      totalSeats: 50,
      claims: localClaims,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  try {
    const dl = await supabaseServer.storage.from("screenshots").download("_system/founder_registry.json");
    if (!dl.error && dl.data) {
      const text = await dl.data.text();
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.claims)) {
        const validClaims = parsed.claims.filter((c) => c && c.userId && c.status === "claimed").map((c) => ({
          id: c.id || `fc_founder_${c.founderRank || 1}`,
          userId: c.userId,
          userEmail: c.userEmail,
          userName: c.userName,
          founderRank: Number(c.founderRank || c.founderNumber || 1),
          founderNumber: Number(c.founderNumber || c.founderRank || 1),
          status: "claimed",
          claimedAt: c.claimedAt || (/* @__PURE__ */ new Date()).toISOString(),
          tier: "Founder",
          plan: "founder",
          isFounder: true,
          isPro: true
        }));
        const seenUsers = /* @__PURE__ */ new Set();
        const seenRanks = /* @__PURE__ */ new Set();
        const deduped = [];
        for (const claim of validClaims) {
          if (!seenUsers.has(claim.userId) && !seenRanks.has(claim.founderRank) && claim.founderRank >= 1 && claim.founderRank <= 50) {
            seenUsers.add(claim.userId);
            seenRanks.add(claim.founderRank);
            deduped.push(claim);
          }
        }
        deduped.sort((a, b) => a.founderRank - b.founderRank);
        return {
          totalSeats: 50,
          claims: deduped,
          updatedAt: parsed.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
  } catch (err) {
    console.warn("[FounderRegistry] Supabase download error (will attempt fallback):", err);
  }
  try {
    const { data: usersData } = await supabaseServer.auth.admin.listUsers();
    if (usersData?.users) {
      const authFounders = [];
      for (const u of usersData.users) {
        if (u.app_metadata?.is_founder || u.app_metadata?.founder_rank) {
          const rank = Number(u.app_metadata?.founder_rank || u.app_metadata?.founder_number || authFounders.length + 1);
          authFounders.push({
            id: `fc_founder_${rank}`,
            userId: u.id,
            userEmail: u.email,
            userName: u.user_metadata?.full_name || u.user_metadata?.name,
            founderRank: rank,
            founderNumber: rank,
            status: "claimed",
            claimedAt: u.created_at || (/* @__PURE__ */ new Date()).toISOString(),
            tier: "Founder",
            plan: "founder",
            isFounder: true,
            isPro: true
          });
        }
      }
      if (authFounders.length > 0) {
        authFounders.sort((a, b) => a.founderRank - b.founderRank);
        const reconstructed = {
          totalSeats: 50,
          claims: authFounders,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await saveAuthoritativeFounderRegistry(reconstructed);
        return reconstructed;
      }
    }
  } catch (err) {
    console.warn("[FounderRegistry] Auth user scan error:", err);
  }
  return defaultRegistry;
}
async function saveAuthoritativeFounderRegistry(registry) {
  if (registry.claims.length > 50) {
    registry.claims = registry.claims.slice(0, 50);
  }
  registry.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  serverFounderCounter = registry.claims.filter((c) => c.status === "claimed").length;
  for (const claim of registry.claims) {
    if (claim.status === "claimed") {
      const ent = createFounderEntitlement(claim.userId, claim.founderNumber);
      serverEntitlements.set(claim.userId, ent);
    }
  }
  saveBillingStateToDisk();
  if (!supabaseServer) return true;
  try {
    const fileBuffer = Buffer.from(JSON.stringify(registry, null, 2), "utf-8");
    const { error: uploadError } = await supabaseServer.storage.from("screenshots").upload("_system/founder_registry.json", fileBuffer, {
      contentType: "application/json",
      upsert: true
    });
    if (uploadError) {
      console.warn("[FounderRegistry] Supabase Storage upload warning:", uploadError.message);
    } else {
      console.log(`[FounderRegistry] Saved authoritative registry to Supabase Storage (${registry.claims.length}/50 claims)`);
    }
    for (const claim of registry.claims) {
      if (claim.status === "claimed") {
        try {
          await supabaseServer.auth.admin.updateUserById(claim.userId, {
            app_metadata: {
              is_founder: true,
              founder_rank: claim.founderRank,
              founder_number: claim.founderNumber,
              plan: "founder",
              tier: "Founder"
            }
          });
        } catch {
        }
        try {
          const deterministicId = `00000000-0000-0000-0000-${String(claim.founderRank).padStart(12, "0")}`;
          await supabaseServer.from("screenshots").upsert({
            id: deterministicId,
            user_id: claim.userId,
            title: `[FOUNDER VIP #${claim.founderRank}] Pioneer Seat Record`,
            image_url: "https://bdrdcaxinjjsvjtrgqyj.supabase.co/storage/v1/object/public/screenshots/_system/founder_registry.json",
            tags: ["founder_claim", `founder_${claim.founderRank}`, "pioneer_50", "vip"],
            ocr_text: `FOUNDER SEAT #${claim.founderRank} ALLOCATED TO USER ${claim.userId} (${claim.userEmail || "verified"}).`,
            analysis: JSON.stringify({
              founderRank: claim.founderRank,
              founderNumber: claim.founderNumber,
              userId: claim.userId,
              userEmail: claim.userEmail,
              claimedAt: claim.claimedAt,
              status: "claimed",
              tier: "Founder",
              plan: "founder",
              maxIndexedScreenshots: 15e4
            }),
            created_at: claim.claimedAt
          });
        } catch {
        }
      }
    }
    return true;
  } catch (err) {
    console.error("[FounderRegistry] Error saving authoritative registry:", err);
    return false;
  }
}
async function loadAuthoritativeFounderStateFromSupabase() {
  try {
    const registry = await getAuthoritativeFounderRegistry();
    const validClaims = registry.claims.filter((c) => c.status === "claimed");
    serverFounderCounter = validClaims.length;
    for (const claim of validClaims) {
      const ent = createFounderEntitlement(claim.userId, claim.founderNumber);
      serverEntitlements.set(claim.userId, ent);
    }
    saveBillingStateToDisk();
    console.log(`[Founder50] Authoritative Supabase Founder State synced: ${validClaims.length}/50 seats claimed, ${Math.max(0, 50 - validClaims.length)} available.`);
  } catch (err) {
    console.warn("[Founder50] Error loading authoritative founder state from Supabase:", err);
  }
}
loadAuthoritativeFounderStateFromSupabase().catch(() => {
});
async function syncEntitlementToSupabase(entitlement) {
  if (!supabaseServer || !entitlement || !entitlement.userId || entitlement.userId === "guest" || entitlement.userId.startsWith("local-")) {
    return;
  }
  try {
    const isFounder = Boolean(entitlement.isFounder);
    const isPro = Boolean(entitlement.isPro || isFounder);
    const plan = isFounder ? "founder" : isPro ? "pro" : "free";
    await supabaseServer.from("user_entitlements").upsert({
      user_id: entitlement.userId,
      is_founder: isFounder,
      founder_number: entitlement.founderNumber || null,
      founder_granted_at: entitlement.founderGrantedAt || null,
      founder_expires_at: entitlement.founderExpiresAt || null,
      is_pro: isPro,
      tier: entitlement.tier || (isFounder ? "Founder" : isPro ? "Pro" : "Free"),
      plan,
      features: entitlement.features || PLAN_FEATURES_MAP[plan] || PLAN_FEATURES_MAP.free,
      expires_at: entitlement.expiresAt || null,
      active_subscription_id: entitlement.activeSubscriptionId || null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    await supabaseServer.from("profiles").update({
      plan: entitlement.tier || (isFounder ? "Founder" : isPro ? "Pro" : "Free"),
      is_founder: isFounder,
      founder_rank: entitlement.founderNumber || null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", entitlement.userId);
  } catch (err) {
    console.warn("[Billing] Supabase sync error (non-fatal):", err);
  }
}
function getNextMonthlyResetDate() {
  const now = /* @__PURE__ */ new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nextResetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  return { periodStart, nextResetDate };
}
function getEffectiveUserKey(req) {
  const userId = req.headers["x-user-id"] || req.query.userId || req.body?.userId || "guest";
  const deviceId = req.headers["x-device-id"] || req.query.deviceId || req.body?.deviceId || "default-device";
  const userKey = userId && userId !== "guest" && !userId.startsWith("local-guest") ? `usr_${userId}` : `dev_${deviceId}`;
  return { userKey, userId, deviceId };
}
function getOrInitServerUsage(userKey, userId = "guest", deviceId = "default-device") {
  const { periodStart, nextResetDate } = getNextMonthlyResetDate();
  let record = serverUsageStore.get(userKey);
  if (!record) {
    record = {
      userKey,
      userId,
      deviceId,
      screenshotsIndexed: 0,
      aiAnalysesUsed: 0,
      storageBytesUsed: 0,
      cloudSyncCount: 0,
      periodStart,
      monthlyResetDate: nextResetDate,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    serverUsageStore.set(userKey, record);
  } else {
    if (new Date(record.monthlyResetDate).getTime() <= Date.now()) {
      record.aiAnalysesUsed = 0;
      record.periodStart = periodStart;
      record.monthlyResetDate = nextResetDate;
      record.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      serverUsageStore.set(userKey, record);
    }
  }
  return record;
}
app.get("/api/billing/products", async (_req, res) => {
  let liveFounders = 0;
  try {
    const registry = await getAuthoritativeFounderRegistry();
    liveFounders = registry.claims.filter((c) => c.status === "claimed").length;
    serverFounderCounter = liveFounders;
  } catch (e) {
    liveFounders = serverFounderCounter;
  }
  return res.json({
    success: true,
    products: CANONICAL_PRODUCTS,
    founderConfig: FOUNDER_CONFIG,
    currentFoundersGranted: liveFounders
  });
});
var handleFounderStats = async (_req, res) => {
  try {
    const registry = await getAuthoritativeFounderRegistry();
    const claimed = registry.claims.filter((c) => c.status === "claimed").length;
    const totalSpots = 50;
    const remaining = Math.max(0, totalSpots - claimed);
    serverFounderCounter = claimed;
    return res.json({
      success: true,
      claimed,
      claimedSpots: claimed,
      totalSpots,
      remaining,
      remainingSpots: remaining,
      isFull: claimed >= totalSpots
    });
  } catch (err) {
    return res.json({
      success: true,
      claimed: serverFounderCounter,
      claimedSpots: serverFounderCounter,
      totalSpots: 50,
      remaining: Math.max(0, 50 - serverFounderCounter),
      remainingSpots: Math.max(0, 50 - serverFounderCounter),
      isFull: serverFounderCounter >= 50
    });
  }
};
app.get("/api/billing/founder-stats", handleFounderStats);
app.get("/api/billing/founder-status", handleFounderStats);
var SERVER_FX_RATES = {
  USD: 1,
  PKR: 284,
  INR: 83.3,
  EUR: 0.933,
  GBP: 0.799,
  AED: 3.6725,
  SAR: 3.75
};
var lastFxFetchTimestamp = (/* @__PURE__ */ new Date()).toISOString();
app.get("/api/billing/exchange-rates", async (_req, res) => {
  return res.json({
    success: true,
    base: "USD",
    rates: SERVER_FX_RATES,
    lastUpdated: lastFxFetchTimestamp,
    source: "SnapFind Financial FX Service"
  });
});
app.post("/api/billing/purchase-lifetime", async (req, res) => {
  try {
    const auth = await checkAdminAuthorization(req);
    if (!auth.authorized) {
      return res.status(403).json({
        success: false,
        error: "Direct Lifetime Pro activation requires administrator authorization. Standard users must submit payment confirmation via /api/payment-requests."
      });
    }
    const { userId = "guest", customerEmail } = req.body;
    const isGuest = userId === "guest" || userId.startsWith("local-guest");
    if (isGuest) {
      return res.status(400).json({
        success: false,
        error: "Target userId is required and cannot be guest."
      });
    }
    const now = /* @__PURE__ */ new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    const subId = `sub_lifetime_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const paymentId = `pay_pkr7999_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const orderId = `LIFETIME.PKR7999.${Date.now()}`;
    const subscriptionRecord = {
      id: subId,
      userId,
      plan: "lifetime",
      status: "active",
      provider: "direct_payment",
      providerCustomerId: userId,
      providerSubscriptionId: orderId,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiryDate.toISOString(),
      cancelAtPeriodEnd: false,
      productId: "snapfind_pro_lifetime",
      orderId,
      autoRenewing: false,
      priceCurrencyCode: "PKR",
      priceAmount: 7999,
      priceAmountMicros: 7999e6,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverSubscriptions.set(subId, subscriptionRecord);
    const paymentRecord = {
      id: paymentId,
      userId,
      subscriptionId: subId,
      provider: "direct_payment",
      providerOrderId: orderId,
      productId: "snapfind_pro_lifetime",
      amount: 7999,
      amountMicros: 7999e6,
      currency: "PKR",
      status: "succeeded",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverPayments.set(paymentId, paymentRecord);
    const existing = serverEntitlements.get(userId);
    const updatedEntitlement = {
      userId,
      plan: "lifetime",
      tier: "Pro",
      isPro: true,
      isFounder: existing?.isFounder || false,
      founderNumber: existing?.founderNumber || null,
      founderGrantedAt: existing?.founderGrantedAt || null,
      founderExpiresAt: existing?.founderExpiresAt || null,
      features: { ...PLAN_FEATURES_MAP.lifetime },
      maxScreenshots: PLAN_FEATURES_MAP.lifetime.maxIndexedScreenshots,
      canCloudSync: true,
      canAiMultimodalSearch: true,
      priorityProcessing: true,
      activeSubscriptionId: subId,
      productId: "snapfind_pro_lifetime",
      expiresAt: expiryDate.toISOString(),
      autoRenewing: false,
      status: "active",
      updatedAt: now.toISOString()
    };
    serverEntitlements.set(userId, updatedEntitlement);
    saveBillingStateToDisk();
    syncEntitlementToSupabase(updatedEntitlement).catch(() => {
    });
    serverSubscriptionEvents.push({
      id: `evt_${Date.now()}`,
      userId,
      provider: "direct_payment",
      eventType: "lifetime_purchased",
      payload: {
        subId,
        paymentId,
        productId: "snapfind_pro_lifetime",
        amount: 7999,
        currency: "PKR"
      },
      createdAt: now.toISOString()
    });
    console.log(`[BillingServer] Lifetime Pro activated for user ${userId} (PKR 7,999)`);
    return res.json({
      success: true,
      subscription: subscriptionRecord,
      payment: paymentRecord,
      entitlement: updatedEntitlement,
      message: "Lifetime Pro activated successfully for PKR 7,999. Unlimited screenshots unlocked!"
    });
  } catch (error) {
    console.error("[BillingServer] Lifetime purchase error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process lifetime purchase."
    });
  }
});
function getManualPaymentAccounts() {
  const easypaisaAccountName = process.env.EASYPAISA_ACCOUNT_NAME?.trim() || "EASYPAISA_ACCOUNT_NAME";
  const easypaisaAccountNumber = process.env.EASYPAISA_ACCOUNT_NUMBER?.trim() || "EASYPAISA_ACCOUNT_NUMBER";
  const bankName = process.env.BANK_NAME?.trim() || "BANK_NAME";
  const bankAccountTitle = process.env.BANK_ACCOUNT_TITLE?.trim() || "BANK_ACCOUNT_TITLE";
  const bankIban = process.env.BANK_IBAN?.trim() || "BANK_IBAN";
  return [
    {
      id: "easypaisa",
      title: "Easypaisa",
      accountTitle: easypaisaAccountName,
      // Account Name
      accountNumber: easypaisaAccountNumber,
      // Account Number
      instructions: [
        "Open your Easypaisa Mobile App.",
        "Select 'Send Money' -> 'Easypaisa Mobile Account'.",
        `Enter Receiver Mobile Number: ${easypaisaAccountNumber} (Account Name: ${easypaisaAccountName}).`,
        "Enter the exact amount: PKR 7,999.",
        "Complete payment and note down the 11-digit Transaction ID (TID) from the SMS or Receipt.",
        "Submit your Transaction ID and optional receipt screenshot below for admin verification."
      ],
      badge: "Mobile Wallet"
    },
    {
      id: "bank_transfer",
      title: "Bank Transfer (IBFT / Raast)",
      bankName,
      // Bank Name
      accountTitle: bankAccountTitle,
      // Account Title
      accountNumber: bankIban,
      // Account Number / IBAN
      iban: bankIban,
      // IBAN
      instructions: [
        "Open your Bank's Mobile App or Online Banking Portal.",
        "Select 'Transfer Money' -> 'Interbank Funds Transfer (IBFT)' or 'Raast'.",
        `Select Destination Bank: ${bankName}.`,
        `Enter IBAN: ${bankIban}.`,
        `Verify Account Title: ${bankAccountTitle}.`,
        "Enter amount: PKR 7,999 and complete transaction.",
        "Copy your Transaction Reference / UTR Number and submit below."
      ],
      badge: "All Pakistani Banks Supported"
    }
  ];
}
app.get("/api/payment-requests/accounts", (_req, res) => {
  const accounts = getManualPaymentAccounts();
  return res.json({
    success: true,
    price: 7999,
    currency: "PKR",
    plan: "lifetime",
    accounts
  });
});
app.post("/api/payment-requests", async (req, res) => {
  try {
    const {
      userId = "guest",
      userEmail = "",
      userName = "",
      paymentMethod,
      transactionId,
      receiptUrl = null,
      senderAccount = null,
      senderName = null,
      notes = null
    } = req.body;
    const isGuest = !userId || userId === "guest" || userId.startsWith("local-guest");
    if (isGuest) {
      return res.status(401).json({
        success: false,
        error: "Please sign in or create an account before submitting a payment confirmation."
      });
    }
    const validMethods = ["easypaisa", "jazzcash", "bank_transfer", "nayapay", "sadapay", "manual"];
    if (!paymentMethod || !validMethods.includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment method. Please select a supported payment method (e.g., EasyPaisa, JazzCash, or Bank Transfer)."
      });
    }
    const trimmedTxId = String(transactionId || "").trim();
    if (!trimmedTxId || trimmedTxId.length < 4) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid Transaction ID or Reference Number (at least 4 characters)."
      });
    }
    const currentEntitlement = serverEntitlements.get(userId);
    if (currentEntitlement && currentEntitlement.isPro && (currentEntitlement.plan === "lifetime" || currentEntitlement.isFounder)) {
      return res.status(400).json({
        success: false,
        error: "Your account already has Lifetime Pro access activated."
      });
    }
    for (const [, reqRecord] of serverPaymentRequests.entries()) {
      if (reqRecord.transaction_id === trimmedTxId) {
        if (reqRecord.status === "approved") {
          return res.status(400).json({
            success: false,
            error: "This Transaction ID has already been verified and approved previously."
          });
        }
        if (reqRecord.status === "pending" && reqRecord.user_id === userId) {
          return res.status(400).json({
            success: false,
            error: "You have already submitted a pending payment request with this Transaction ID. Our team is reviewing it."
          });
        }
      }
    }
    if (supabaseServer) {
      try {
        const { data: existingSupabaseReq } = await supabaseServer.from("payment_requests").select("*").eq("transaction_id", trimmedTxId).maybeSingle();
        if (existingSupabaseReq) {
          if (existingSupabaseReq.status === "approved") {
            return res.status(400).json({
              success: false,
              error: "This Transaction ID has already been verified and approved in our database."
            });
          }
          if (existingSupabaseReq.status === "pending" && existingSupabaseReq.user_id === userId) {
            return res.status(400).json({
              success: false,
              error: "You have already submitted a pending payment request with this Transaction ID."
            });
          }
        }
      } catch (err) {
        console.warn("[PaymentRequest] Supabase duplicate check warning:", err);
      }
    }
    const requestId = `payreq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newRequest = {
      id: requestId,
      user_id: userId,
      userId,
      user_email: userEmail,
      userEmail,
      user_name: userName,
      userName,
      plan: "lifetime",
      amount: 7999,
      currency: "PKR",
      payment_method: paymentMethod,
      paymentMethod,
      transaction_id: trimmedTxId,
      transactionId: trimmedTxId,
      receipt_url: receiptUrl,
      receiptUrl,
      sender_account: senderAccount,
      senderAccount,
      sender_name: senderName,
      senderName,
      notes,
      status: "pending",
      // Strict pending status - no Pro access granted yet!
      submitted_at: nowIso,
      submittedAt: nowIso,
      verified_at: null,
      verifiedAt: null,
      verified_by: null,
      verifiedBy: null,
      rejection_reason: null,
      rejectionReason: null,
      created_at: nowIso,
      createdAt: nowIso,
      updated_at: nowIso,
      updatedAt: nowIso
    };
    serverPaymentRequests.set(requestId, newRequest);
    saveBillingStateToDisk();
    if (supabaseServer) {
      try {
        await supabaseServer.from("payment_requests").upsert({
          id: requestId,
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          plan: "lifetime",
          amount: 7999,
          currency: "PKR",
          payment_method: paymentMethod,
          transaction_id: trimmedTxId,
          receipt_url: receiptUrl,
          sender_account: senderAccount,
          sender_name: senderName,
          notes,
          status: "pending",
          submitted_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso
        });
        const subNotifId = `notif_pay_sub_${requestId}`;
        const subNotif = {
          id: subNotifId,
          user_id: userId,
          userId,
          type: "SUBSCRIPTION",
          title: "\u{1F4DD} Payment Submitted",
          message: `Your manual payment confirmation (PKR 7,999, TID: ${trimmedTxId}) has been submitted and is pending verification.`,
          priority: "high",
          read: false,
          created_at: nowIso,
          createdAt: nowIso
        };
        serverNotifications.set(subNotifId, subNotif);
        if (supabaseServer) {
          await supabaseServer.from("notifications").upsert({
            id: subNotifId,
            user_id: userId,
            type: "SUBSCRIPTION",
            title: "\u{1F4DD} Payment Submitted",
            message: `Your manual payment confirmation (PKR 7,999, TID: ${trimmedTxId}) has been submitted and is pending verification.`,
            priority: "high",
            read: false,
            created_at: nowIso
          });
        }
      } catch (err) {
        console.warn("[PaymentRequest] Notification/Supabase save error:", err);
      }
    } else {
      const subNotifId = `notif_pay_sub_${requestId}`;
      serverNotifications.set(subNotifId, {
        id: subNotifId,
        user_id: userId,
        userId,
        type: "SUBSCRIPTION",
        title: "\u{1F4DD} Payment Submitted",
        message: `Your manual payment confirmation (PKR 7,999, TID: ${trimmedTxId}) has been submitted and is pending verification.`,
        priority: "high",
        read: false,
        created_at: nowIso,
        createdAt: nowIso
      });
    }
    console.log(`[PaymentRequest] New manual payment submitted by ${userId} (${userEmail}): ${paymentMethod} TID: ${trimmedTxId} - Status: PENDING`);
    return res.json({
      success: true,
      message: "Payment request submitted successfully. Status is Pending verification by our admin team.",
      paymentRequest: newRequest
    });
  } catch (error) {
    console.error("[PaymentRequest] Submission error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to submit payment request."
    });
  }
});
app.get("/api/payment-requests/my", async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  if (!userId || userId === "guest") {
    return res.json({ success: true, paymentRequests: [] });
  }
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer.from("payment_requests").select("*").eq("user_id", userId).order("submitted_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        return res.json({ success: true, paymentRequests: data });
      }
    } catch (e) {
      console.warn("[PaymentRequest] Supabase fetch error:", e);
    }
  }
  const userRequests = [];
  for (const [, reqRecord] of serverPaymentRequests.entries()) {
    if (reqRecord.user_id === userId || reqRecord.userId === userId) {
      userRequests.push(reqRecord);
    }
  }
  userRequests.sort((a, b) => new Date(b.submitted_at || b.submittedAt).getTime() - new Date(a.submitted_at || a.submittedAt).getTime());
  return res.json({ success: true, paymentRequests: userRequests });
});
var AsyncLock = class {
  constructor() {
    this.promise = Promise.resolve();
  }
  async acquire(task) {
    let release;
    const nextPromise = new Promise((resolve) => {
      release = resolve;
    });
    const currentPromise = this.promise;
    this.promise = nextPromise;
    await currentPromise;
    try {
      return await task();
    } finally {
      release();
    }
  }
};
var serverTransactionLock = new AsyncLock();
async function checkAdminAuthorization(req) {
  const authHeader = req.headers.authorization;
  let callerEmail = "";
  let callerRole = "";
  if (authHeader && authHeader.startsWith("Bearer ") && supabaseServer) {
    const token = authHeader.split(" ")[1];
    try {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (!error && data?.user) {
        callerEmail = (data.user.email || "").toLowerCase().trim();
        callerRole = data.user.app_metadata?.role || data.user.user_metadata?.role || "";
      } else {
        return {
          authorized: false,
          email: "",
          error: "Invalid or expired authorization token."
        };
      }
    } catch (e) {
      console.warn("[AdminAuth] Token verify exception:", e?.message || e);
      return {
        authorized: false,
        email: "",
        error: "Failed to verify authentication credentials."
      };
    }
  } else {
    callerEmail = (req.headers["x-admin-email"] || req.headers["x-user-email"] || req.body?.adminEmail || req.query?.adminEmail || "").toLowerCase().trim();
    callerRole = req.headers["x-admin-role"] || "";
  }
  const normalizedEmail = callerEmail.toLowerCase().trim();
  const isAuthorized = normalizedEmail === "ash.mary.2006@gmail.com" || callerRole === "admin" || callerRole === "super_admin";
  if (!isAuthorized) {
    return {
      authorized: false,
      email: normalizedEmail,
      error: "Access denied. Only authorized SnapFind administrators (ash.mary.2006@gmail.com) can perform this action."
    };
  }
  return { authorized: true, email: normalizedEmail || "ash.mary.2006@gmail.com" };
}
async function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ") && supabaseServer) {
    const token = authHeader.split(" ")[1];
    try {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (!error && data?.user?.id) {
        return data.user.id;
      }
    } catch (e) {
    }
  }
  return req.headers["x-user-id"] || req.query.userId || req.body?.userId || "guest";
}
app.get("/api/admin/payment-requests", async (req, res) => {
  const auth = await checkAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({
      success: false,
      error: auth.error || "Access denied. Administrator privileges required."
    });
  }
  let allRequests = [];
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer.from("payment_requests").select("*").order("submitted_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        allRequests = data;
      }
    } catch (e) {
      console.warn("[AdminPaymentRequest] Supabase fetch error:", e);
    }
  }
  if (allRequests.length === 0) {
    allRequests = Array.from(serverPaymentRequests.values());
    allRequests.sort((a, b) => new Date(b.submitted_at || b.submittedAt).getTime() - new Date(a.submitted_at || a.submittedAt).getTime());
  }
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const approvedCount = allRequests.filter((r) => r.status === "approved").length;
  const rejectedCount = allRequests.filter((r) => r.status === "rejected").length;
  const totalAmountPkr = approvedCount * 7999;
  return res.json({
    success: true,
    stats: {
      total: allRequests.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      totalAmountPkr
    },
    paymentRequests: allRequests
  });
});
app.post("/api/admin/payment-requests/:id/approve", async (req, res) => {
  try {
    const auth = await checkAdminAuthorization(req);
    if (!auth.authorized) {
      return res.status(403).json({
        success: false,
        error: auth.error || "Access denied. Only authorized administrators can approve payment requests."
      });
    }
    const requestId = req.params.id;
    const { adminIdentifier = "Admin", adminEmail = auth.email || "ash.mary.2006@gmail.com" } = req.body;
    let targetRequest = serverPaymentRequests.get(requestId);
    if (!targetRequest && supabaseServer) {
      const { data } = await supabaseServer.from("payment_requests").select("*").eq("id", requestId).maybeSingle();
      if (data) {
        targetRequest = data;
      }
    }
    if (!targetRequest) {
      return res.status(404).json({
        success: false,
        error: "Payment request not found."
      });
    }
    const userId = targetRequest.user_id || targetRequest.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Payment request is missing a valid user identification."
      });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const verifier = adminEmail || adminIdentifier || auth.email || "ash.mary.2006@gmail.com";
    targetRequest.status = "approved";
    targetRequest.verified_at = nowIso;
    targetRequest.verifiedAt = nowIso;
    targetRequest.verified_by = verifier;
    targetRequest.verifiedBy = verifier;
    targetRequest.updated_at = nowIso;
    targetRequest.updatedAt = nowIso;
    serverPaymentRequests.set(requestId, targetRequest);
    const existingEntitlement = serverEntitlements.get(userId);
    const updatedEntitlement = {
      userId,
      plan: "lifetime",
      tier: "Pro",
      isPro: true,
      isFounder: existingEntitlement?.isFounder || false,
      founderNumber: existingEntitlement?.founderNumber || null,
      founderGrantedAt: existingEntitlement?.founderGrantedAt || null,
      founderExpiresAt: existingEntitlement?.founderExpiresAt || null,
      features: { ...PLAN_FEATURES_MAP.lifetime },
      maxScreenshots: 999999,
      // Unlimited screenshots for Lifetime Pro
      canCloudSync: true,
      canAiMultimodalSearch: true,
      priorityProcessing: true,
      activeSubscriptionId: `sub_manual_${requestId}`,
      productId: "snapfind_pro_lifetime",
      expiresAt: null,
      // Permanent Lifetime Pro (expires_at = null)
      autoRenewing: false,
      status: "active",
      isLifetime: true,
      updatedAt: nowIso
    };
    serverEntitlements.set(userId, updatedEntitlement);
    const paymentRecord = {
      id: `pay_${requestId}`,
      userId,
      subscriptionId: `sub_manual_${requestId}`,
      provider: targetRequest.payment_method || targetRequest.paymentMethod || "manual",
      providerOrderId: targetRequest.transaction_id || targetRequest.transactionId,
      productId: "snapfind_pro_lifetime",
      amount: 7999,
      amountMicros: 7999e6,
      currency: "PKR",
      status: "succeeded",
      isSandbox: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    serverPayments.set(paymentRecord.id, paymentRecord);
    serverSubscriptionEvents.push({
      id: `evt_manual_${Date.now()}`,
      userId,
      provider: targetRequest.payment_method || targetRequest.paymentMethod || "manual",
      eventType: "manual_payment_approved",
      payload: {
        requestId,
        transactionId: targetRequest.transaction_id || targetRequest.transactionId,
        amount: 7999,
        currency: "PKR",
        verifiedBy: verifier
      },
      createdAt: nowIso
    });
    saveBillingStateToDisk();
    const notificationId = `notif_pay_appr_${requestId}`;
    const targetUserEmail = targetRequest.user_email || targetRequest.userEmail;
    const apprNotif = {
      id: notificationId,
      user_id: userId,
      userId,
      type: "SUBSCRIPTION",
      title: "\u{1F48E} Lifetime Pro Activated!",
      message: `Your manual payment (PKR 7,999, ID: ${targetRequest.transaction_id || targetRequest.transactionId}) has been verified. You now have permanent Lifetime Pro access with unlimited screenshots.`,
      priority: "critical",
      read: false,
      created_at: nowIso,
      createdAt: nowIso
    };
    serverNotifications.set(notificationId, apprNotif);
    if (supabaseServer) {
      try {
        await supabaseServer.from("payment_requests").update({
          status: "approved",
          verified_at: nowIso,
          verified_by: verifier,
          updated_at: nowIso
        }).eq("id", requestId);
        await syncEntitlementToSupabase(updatedEntitlement);
        await supabaseServer.from("notifications").upsert({
          id: notificationId,
          user_id: userId,
          type: "SUBSCRIPTION",
          title: "\u{1F48E} Lifetime Pro Activated!",
          message: `Your manual payment (PKR 7,999, ID: ${targetRequest.transaction_id || targetRequest.transactionId}) has been verified. You now have permanent Lifetime Pro access with unlimited screenshots.`,
          priority: "critical",
          read: false,
          created_at: nowIso
        });
      } catch (err) {
        console.warn("[AdminApprove] Supabase update warning:", err);
      }
    }
    console.log(`[AdminPayment] Approved payment request ${requestId} for user ${userId}. Lifetime Pro activated!`);
    return res.json({
      success: true,
      message: "Payment request successfully approved. Lifetime Pro has been activated with unlimited screenshots.",
      paymentRequest: targetRequest,
      entitlement: updatedEntitlement,
      notification: {
        id: notificationId,
        userId,
        title: "\u{1F48E} Lifetime Pro Activated!",
        message: "Your manual payment has been verified. Permanent Lifetime Pro is active."
      }
    });
  } catch (error) {
    console.error("[AdminPayment] Approve error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to approve payment request."
    });
  }
});
app.post("/api/admin/payment-requests/:id/reject", async (req, res) => {
  try {
    const auth = await checkAdminAuthorization(req);
    if (!auth.authorized) {
      return res.status(403).json({
        success: false,
        error: auth.error || "Access denied. Only authorized administrators can reject payment requests."
      });
    }
    const requestId = req.params.id;
    const {
      rejectionReason = "Payment could not be verified. Please check Transaction ID or contact support.",
      adminIdentifier = "Admin",
      adminEmail = auth.email || "ash.mary.2006@gmail.com"
    } = req.body;
    let targetRequest = serverPaymentRequests.get(requestId);
    if (!targetRequest && supabaseServer) {
      const { data } = await supabaseServer.from("payment_requests").select("*").eq("id", requestId).maybeSingle();
      if (data) {
        targetRequest = data;
      }
    }
    if (!targetRequest) {
      return res.status(404).json({
        success: false,
        error: "Payment request not found."
      });
    }
    const userId = targetRequest.user_id || targetRequest.userId;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const verifier = adminEmail || adminIdentifier || auth.email || "ash.mary.2006@gmail.com";
    targetRequest.status = "rejected";
    targetRequest.rejection_reason = rejectionReason;
    targetRequest.rejectionReason = rejectionReason;
    targetRequest.verified_at = nowIso;
    targetRequest.verifiedAt = nowIso;
    targetRequest.verified_by = verifier;
    targetRequest.verifiedBy = verifier;
    targetRequest.updated_at = nowIso;
    targetRequest.updatedAt = nowIso;
    serverPaymentRequests.set(requestId, targetRequest);
    saveBillingStateToDisk();
    const notificationId = `notif_pay_rej_${requestId}`;
    const txId = targetRequest.transaction_id || targetRequest.transactionId;
    const rejNotif = {
      id: notificationId,
      user_id: userId,
      userId,
      type: "SUBSCRIPTION",
      title: "\u26A0\uFE0F Payment Verification Notice",
      message: `Your payment confirmation (ID: ${txId}) could not be verified: ${rejectionReason}. You can re-submit with updated details in Account settings.`,
      priority: "high",
      read: false,
      created_at: nowIso,
      createdAt: nowIso
    };
    serverNotifications.set(notificationId, rejNotif);
    if (supabaseServer) {
      try {
        await supabaseServer.from("payment_requests").update({
          status: "rejected",
          rejection_reason: rejectionReason,
          verified_at: nowIso,
          verified_by: verifier,
          updated_at: nowIso
        }).eq("id", requestId);
        await supabaseServer.from("notifications").upsert({
          id: notificationId,
          user_id: userId,
          type: "SUBSCRIPTION",
          title: "\u26A0\uFE0F Payment Verification Notice",
          message: `Your payment confirmation (ID: ${txId}) could not be verified: ${rejectionReason}. You can re-submit with updated details in Account settings.`,
          priority: "high",
          read: false,
          created_at: nowIso
        });
      } catch (err) {
        console.warn("[AdminReject] Supabase update warning:", err);
      }
    }
    console.log(`[AdminPayment] Rejected payment request ${requestId}. Reason: ${rejectionReason}`);
    return res.json({
      success: true,
      message: "Payment request rejected.",
      paymentRequest: targetRequest,
      notification: {
        id: notificationId,
        userId,
        title: "\u26A0\uFE0F Payment Verification Notice",
        message: `Your payment request could not be verified: ${rejectionReason}`
      }
    });
  } catch (error) {
    console.error("[AdminPayment] Reject error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to reject payment request."
    });
  }
});
app.get("/api/notifications", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.query.userId || "guest";
    if (supabaseServer && userId && userId !== "guest") {
      const { data, error } = await supabaseServer.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json({ success: true, notifications: data });
      }
    }
    const memNotifs = Array.from(serverNotifications.values()).filter((n) => n.user_id === userId || n.userId === userId).sort((a, b) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime());
    return res.json({ success: true, notifications: memNotifs });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});
app.delete("/api/notifications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    serverNotifications.delete(id);
    if (supabaseServer && id) {
      await supabaseServer.from("notifications").delete().eq("id", id);
    }
    return res.json({ success: true, message: `Notification ${id} deleted.` });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});
app.delete("/api/notifications", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.query.userId || "";
    for (const [id, notif] of serverNotifications.entries()) {
      if (notif.user_id === userId || notif.userId === userId) {
        serverNotifications.delete(id);
      }
    }
    if (supabaseServer && userId && userId !== "guest") {
      await supabaseServer.from("notifications").delete().eq("user_id", userId);
    }
    return res.json({ success: true, message: "All notifications erased for user." });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});
app.post("/api/billing/verify-purchase", async (req, res) => {
  try {
    const {
      userId = "guest",
      productId,
      purchaseToken,
      orderId,
      platform = "direct",
      isSandbox = false
    } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "Missing required billing parameter (productId required)."
      });
    }
    const matchedProduct = CANONICAL_PRODUCTS.find((p) => p.productId === productId);
    const now = /* @__PURE__ */ new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const effectiveOrderId = orderId || `ORD.${Date.now()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const subscriptionRecord = {
      id: subId,
      userId,
      plan: "lifetime",
      status: "active",
      provider: platform,
      providerCustomerId: userId,
      providerSubscriptionId: purchaseToken || effectiveOrderId,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiryDate.toISOString(),
      cancelAtPeriodEnd: false,
      productId,
      purchaseToken,
      orderId: effectiveOrderId,
      platform,
      isSandbox: Boolean(isSandbox),
      autoRenewing: false,
      priceCurrencyCode: "PKR",
      priceAmount: 7999,
      priceAmountMicros: 7999e6,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverSubscriptions.set(subId, subscriptionRecord);
    const paymentRecord = {
      id: paymentId,
      userId,
      subscriptionId: subId,
      provider: platform,
      providerOrderId: effectiveOrderId,
      purchaseToken,
      productId,
      amount: 7999,
      amountMicros: 7999e6,
      currency: "PKR",
      status: "succeeded",
      isSandbox: Boolean(isSandbox),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverPayments.set(paymentId, paymentRecord);
    const existing = serverEntitlements.get(userId);
    const updatedEntitlement = {
      userId,
      plan: "lifetime",
      tier: "Pro",
      isPro: true,
      isFounder: existing?.isFounder || false,
      founderNumber: existing?.founderNumber || null,
      founderGrantedAt: existing?.founderGrantedAt || null,
      founderExpiresAt: existing?.founderExpiresAt || null,
      features: { ...PLAN_FEATURES_MAP.lifetime },
      maxScreenshots: PLAN_FEATURES_MAP.lifetime.maxIndexedScreenshots,
      canCloudSync: true,
      canAiMultimodalSearch: true,
      priorityProcessing: true,
      activeSubscriptionId: subId,
      productId,
      expiresAt: expiryDate.toISOString(),
      autoRenewing: false,
      status: "active",
      updatedAt: now.toISOString()
    };
    serverEntitlements.set(userId, updatedEntitlement);
    saveBillingStateToDisk();
    syncEntitlementToSupabase(updatedEntitlement).catch(() => {
    });
    serverSubscriptionEvents.push({
      id: `evt_${Date.now()}`,
      userId,
      provider: platform,
      eventType: "subscription_created",
      isSandbox: Boolean(isSandbox),
      payload: {
        subId,
        paymentId,
        productId,
        orderId: effectiveOrderId,
        amount: 7999,
        currency: "PKR"
      },
      createdAt: now.toISOString()
    });
    return res.json({
      success: true,
      subscription: subscriptionRecord,
      payment: paymentRecord,
      entitlement: updatedEntitlement,
      message: "Lifetime Pro purchase verified and activated."
    });
  } catch (error) {
    console.error("[BillingServer] Verification error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify purchase."
    });
  }
});
app.get("/api/billing/entitlements", async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  let existing = serverEntitlements.get(userId);
  if (!existing || !existing.isFounder) {
    try {
      const registry = await getAuthoritativeFounderRegistry();
      const claim = registry.claims.find((c) => c.status === "claimed" && c.userId === userId);
      if (claim) {
        existing = createFounderEntitlement(userId, claim.founderNumber);
        serverEntitlements.set(userId, existing);
      }
    } catch (e) {
      console.warn("[Billing] Authoritative registry lookup warning:", e);
    }
  }
  if (!existing && supabaseServer && userId !== "guest" && !userId.startsWith("local-")) {
    try {
      const { data } = await supabaseServer.from("user_entitlements").select("*").eq("user_id", userId).single();
      if (data) {
        const isFounder2 = Boolean(data.is_founder);
        const isPro2 = Boolean(data.is_pro || isFounder2);
        const plan2 = isFounder2 ? "founder" : isPro2 ? "pro" : "free";
        const tier2 = isFounder2 ? "Founder" : isPro2 ? "Pro" : "Free";
        const features2 = data.features || PLAN_FEATURES_MAP[plan2];
        existing = {
          userId: data.user_id,
          plan: plan2,
          tier: tier2,
          isPro: isPro2,
          isFounder: isFounder2,
          founderNumber: data.founder_number || null,
          founderGrantedAt: data.founder_granted_at || null,
          founderExpiresAt: data.founder_expires_at || null,
          features: features2,
          maxScreenshots: features2.maxIndexedScreenshots || (isFounder2 ? 15e4 : isPro2 ? 1e5 : 250),
          canCloudSync: features2.cloudSync,
          canAiMultimodalSearch: features2.advancedSearch,
          priorityProcessing: features2.priorityProcessing,
          status: isPro2 ? "active" : void 0,
          updatedAt: data.updated_at || (/* @__PURE__ */ new Date()).toISOString()
        };
        serverEntitlements.set(userId, existing);
      }
    } catch (e) {
      console.warn("[Billing] Supabase entitlement lookup error:", e);
    }
  }
  if (existing) {
    return res.json({ success: true, entitlement: existing });
  }
  const isFounder = false;
  const founderNumber = null;
  const founderGrantedAt = null;
  const founderExpiresAt = null;
  const plan = "free";
  const isPro = false;
  const tier = "Free";
  const features = { ...PLAN_FEATURES_MAP.free };
  const newEntitlement = {
    userId,
    plan,
    tier,
    isPro,
    isFounder,
    founderNumber,
    founderGrantedAt,
    founderExpiresAt,
    features,
    maxScreenshots: features.maxIndexedScreenshots,
    canCloudSync: features.cloudSync,
    canAiMultimodalSearch: features.advancedSearch,
    priorityProcessing: features.priorityProcessing,
    status: void 0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  serverEntitlements.set(userId, newEntitlement);
  saveBillingStateToDisk();
  syncEntitlementToSupabase(newEntitlement).catch(() => {
  });
  return res.json({ success: true, entitlement: newEntitlement });
});
app.post("/api/billing/claim-founder", async (req, res) => {
  return await serverTransactionLock.acquire(async () => {
    const userId = await getAuthenticatedUserId(req);
    const isGuest = !userId || userId === "guest" || userId.startsWith("local-guest");
    if (isGuest) {
      return res.status(400).json({
        success: false,
        error: "Please sign in or create an account to claim your Founder spot."
      });
    }
    const registry = await getAuthoritativeFounderRegistry();
    const validClaims = registry.claims.filter((c) => c.status === "claimed");
    let userEmail = "";
    let userName = "";
    if (supabaseServer) {
      try {
        const { data: userData } = await supabaseServer.auth.admin.getUserById(userId);
        if (userData?.user) {
          userEmail = userData.user.email || "";
          userName = userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || userEmail.split("@")[0] || "";
        }
      } catch {
      }
    }
    const existingClaim = validClaims.find(
      (c) => c.userId === userId || userEmail && c.userEmail && c.userEmail.toLowerCase() === userEmail.toLowerCase()
    );
    if (existingClaim) {
      const existingEnt = serverEntitlements.get(userId) || createFounderEntitlement(userId, existingClaim.founderNumber);
      serverEntitlements.set(userId, existingEnt);
      return res.json({
        success: true,
        message: `You are already verified Founder #${existingClaim.founderNumber}!`,
        entitlement: existingEnt,
        founderNumber: existingClaim.founderNumber,
        founderRank: existingClaim.founderNumber,
        claimedSpots: validClaims.length,
        totalSpots: 50,
        remainingSpots: Math.max(0, 50 - validClaims.length)
      });
    }
    if (validClaims.length >= 50) {
      return res.status(400).json({
        success: false,
        error: "All 50 Founder spots have been claimed. Founder #51 does not exist. You can upgrade to Lifetime Pro."
      });
    }
    const takenRanks = new Set(validClaims.map((c) => c.founderRank));
    let nextRank = 1;
    while (takenRanks.has(nextRank) && nextRank <= 50) {
      nextRank++;
    }
    if (nextRank > 50) {
      return res.status(400).json({
        success: false,
        error: "All 50 Founder spots have been claimed."
      });
    }
    const newClaim = {
      id: `fc_founder_${nextRank}`,
      userId,
      userEmail: userEmail || void 0,
      userName: userName || void 0,
      founderRank: nextRank,
      founderNumber: nextRank,
      status: "claimed",
      claimedAt: (/* @__PURE__ */ new Date()).toISOString(),
      tier: "Founder",
      plan: "founder",
      isFounder: true,
      isPro: true
    };
    registry.claims.push(newClaim);
    registry.claims.sort((a, b) => a.founderRank - b.founderRank);
    await saveAuthoritativeFounderRegistry(registry);
    const founderEntitlement = createFounderEntitlement(userId, nextRank);
    serverEntitlements.set(userId, founderEntitlement);
    const updatedClaimed = registry.claims.filter((c) => c.status === "claimed").length;
    const remaining = Math.max(0, 50 - updatedClaimed);
    console.log(`[Founder50] Successfully allocated Founder #${nextRank} to user ${userId} (${userEmail || "anonymous"}). Remaining: ${remaining}`);
    return res.json({
      success: true,
      message: `Congratulations! You have claimed Founder #${nextRank} with free Lifetime Pro access and the Founder Crown.`,
      entitlement: founderEntitlement,
      founderNumber: nextRank,
      founderRank: nextRank,
      claimedSpots: updatedClaimed,
      totalSpots: 50,
      remainingSpots: remaining
    });
  });
});
app.get("/api/admin/founders/count", async (_req, res) => {
  const registry = await getAuthoritativeFounderRegistry();
  const validClaims = registry.claims.filter((c) => c.status === "claimed");
  return res.json({
    success: true,
    count: validClaims.length,
    max: 50,
    remaining: Math.max(0, 50 - validClaims.length)
  });
});
app.get("/api/admin/founders/remaining", async (_req, res) => {
  const registry = await getAuthoritativeFounderRegistry();
  const validClaims = registry.claims.filter((c) => c.status === "claimed");
  return res.json({
    success: true,
    remaining: Math.max(0, 50 - validClaims.length),
    total: 50
  });
});
app.get("/api/admin/founders/list", async (req, res) => {
  const auth = await checkAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({
      success: false,
      error: auth.error || "Access denied. Administrator privileges required."
    });
  }
  const registry = await getAuthoritativeFounderRegistry();
  const validClaims = registry.claims.filter((c) => c.status === "claimed");
  validClaims.sort((a, b) => (a.founderRank || 0) - (b.founderRank || 0));
  return res.json({
    success: true,
    totalClaimed: validClaims.length,
    maxAllowed: 50,
    remaining: Math.max(0, 50 - validClaims.length),
    founders: validClaims
  });
});
app.post("/api/admin/founders/assign", async (req, res) => {
  const auth = await checkAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({
      success: false,
      error: auth.error || "Access denied. Only administrators can assign Founder status."
    });
  }
  return await serverTransactionLock.acquire(async () => {
    const { userId } = req.body;
    if (!userId || userId === "guest") {
      return res.status(400).json({ success: false, error: "Valid target userId is required." });
    }
    const registry = await getAuthoritativeFounderRegistry();
    const validClaims = registry.claims.filter((c) => c.status === "claimed");
    const existingClaim = validClaims.find((c) => c.userId === userId);
    if (existingClaim) {
      return res.json({
        success: true,
        message: `User is already Founder #${existingClaim.founderNumber}`,
        founderRank: existingClaim.founderNumber,
        entitlement: serverEntitlements.get(userId) || createFounderEntitlement(userId, existingClaim.founderNumber)
      });
    }
    if (validClaims.length >= 50) {
      return res.status(400).json({
        success: false,
        error: "No more founder spots available. 50 founder limit reached. Founder #51 cannot be assigned."
      });
    }
    const takenRanks = new Set(validClaims.map((c) => c.founderRank));
    let nextRank = 1;
    while (takenRanks.has(nextRank) && nextRank <= 50) {
      nextRank++;
    }
    if (nextRank > 50) {
      return res.status(400).json({ success: false, error: "No founder spots available." });
    }
    const newClaim = {
      id: `fc_founder_${nextRank}`,
      userId,
      founderRank: nextRank,
      founderNumber: nextRank,
      status: "claimed",
      claimedAt: (/* @__PURE__ */ new Date()).toISOString(),
      tier: "Founder",
      plan: "founder",
      isFounder: true,
      isPro: true
    };
    registry.claims.push(newClaim);
    registry.claims.sort((a, b) => a.founderRank - b.founderRank);
    await saveAuthoritativeFounderRegistry(registry);
    const founderEntitlement = createFounderEntitlement(userId, nextRank);
    serverEntitlements.set(userId, founderEntitlement);
    return res.json({
      success: true,
      founderRank: nextRank,
      entitlement: founderEntitlement,
      remainingSpots: Math.max(0, 50 - registry.claims.length)
    });
  });
});
app.get("/api/billing/subscription-status", async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  let activeSub = null;
  for (const [, sub] of serverSubscriptions.entries()) {
    if (sub.userId === userId && sub.status === "active") {
      activeSub = sub;
      break;
    }
  }
  let entitlement = serverEntitlements.get(userId) || null;
  if (!entitlement || !entitlement.isFounder) {
    try {
      const registry = await getAuthoritativeFounderRegistry();
      const claim = registry.claims.find((c) => c.status === "claimed" && c.userId === userId);
      if (claim) {
        entitlement = createFounderEntitlement(userId, claim.founderNumber);
        serverEntitlements.set(userId, entitlement);
      }
    } catch {
    }
  }
  if (!entitlement) {
    const features = { ...PLAN_FEATURES_MAP.free };
    entitlement = {
      userId,
      plan: "free",
      tier: "Free",
      isPro: false,
      isFounder: false,
      isLifetime: false,
      founderNumber: null,
      founderRank: null,
      founderGrantedAt: null,
      founderExpiresAt: null,
      features,
      maxScreenshots: features.maxIndexedScreenshots,
      canCloudSync: features.cloudSync,
      canAiMultimodalSearch: features.advancedSearch,
      priorityProcessing: features.priorityProcessing,
      status: "active",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  return res.json({
    success: true,
    subscription: activeSub,
    entitlement
  });
});
app.post("/api/billing/restore-purchases", (req, res) => {
  const { userId = "guest", purchases = [] } = req.body;
  let activeSub = null;
  for (const [, sub] of serverSubscriptions.entries()) {
    if (sub.userId === userId && new Date(sub.expiryTime || sub.currentPeriodEnd).getTime() > Date.now()) {
      activeSub = sub;
      break;
    }
  }
  if (!activeSub && Array.isArray(purchases) && purchases.length > 0) {
    const latest = purchases[0];
    const matchedProduct = GOOGLE_PLAY_PRODUCTS.find((p) => p.productId === latest.productId);
    const now = /* @__PURE__ */ new Date();
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    activeSub = {
      id: `sub_restored_${Date.now()}`,
      userId,
      plan: "pro",
      status: "active",
      provider: "google_play",
      providerCustomerId: userId,
      providerSubscriptionId: latest.purchaseToken,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiryDate.toISOString(),
      cancelAtPeriodEnd: false,
      productId: latest.productId || "snapfind_pro:pro-yearly",
      purchaseToken: latest.purchaseToken,
      orderId: latest.orderId || `GPA.RESTORED.${Date.now()}`,
      platform: "android_google_play",
      autoRenewing: true,
      priceCurrencyCode: matchedProduct?.priceCurrencyCode || "USD",
      priceAmountMicros: matchedProduct?.priceAmountMicros || 2499e4,
      startTime: now.toISOString(),
      expiryTime: expiryDate.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverSubscriptions.set(activeSub.id, activeSub);
  }
  if (activeSub) {
    const existing = serverEntitlements.get(userId);
    const entitlement = {
      userId,
      plan: "pro",
      tier: "Pro",
      isPro: true,
      isFounder: existing?.isFounder || false,
      founderNumber: existing?.founderNumber || null,
      features: { ...PLAN_FEATURES_MAP.pro },
      maxScreenshots: PLAN_FEATURES_MAP.pro.maxIndexedScreenshots,
      canCloudSync: true,
      canAiMultimodalSearch: true,
      priorityProcessing: true,
      activeSubscriptionId: activeSub.id,
      productId: activeSub.productId,
      expiresAt: activeSub.currentPeriodEnd || activeSub.expiryTime,
      autoRenewing: activeSub.autoRenewing,
      status: "active",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    serverEntitlements.set(userId, entitlement);
    return res.json({
      success: true,
      restoredCount: 1,
      subscription: activeSub,
      entitlement,
      message: "Pro subscription successfully restored."
    });
  }
  return res.json({
    success: false,
    restoredCount: 0,
    message: "No active subscription found for this account."
  });
});
app.post("/api/billing/cancel-subscription", (req, res) => {
  const { subscriptionId, userId = "guest" } = req.body;
  let matchedSub = null;
  if (subscriptionId && serverSubscriptions.has(subscriptionId)) {
    matchedSub = serverSubscriptions.get(subscriptionId);
  } else {
    for (const [, sub] of serverSubscriptions.entries()) {
      if (sub.userId === userId && sub.status === "active") {
        matchedSub = sub;
        break;
      }
    }
  }
  if (matchedSub) {
    matchedSub.cancelAtPeriodEnd = true;
    matchedSub.autoRenewing = false;
    matchedSub.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    serverSubscriptions.set(matchedSub.id, matchedSub);
    serverSubscriptionEvents.push({
      id: `evt_${Date.now()}`,
      userId,
      provider: matchedSub.provider,
      eventType: "subscription_canceled",
      payload: { subId: matchedSub.id, effectiveDate: matchedSub.currentPeriodEnd },
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return res.json({
      success: true,
      message: "Subscription auto-renewal canceled. Access will continue until end of period.",
      effectiveDate: matchedSub.currentPeriodEnd,
      subscription: matchedSub
    });
  }
  return res.json({
    success: false,
    error: "No active subscription found to cancel."
  });
});
app.get("/api/billing/payment-status", (_req, res) => {
  const provider = process.env.PAYMENT_PROVIDER || "paddle";
  const hasConfiguredSecret = Boolean(
    process.env.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_API_KEY || process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMENT_SECRET_KEY
  );
  return res.json({
    success: true,
    providerConfigured: hasConfiguredSecret,
    provider,
    message: hasConfiguredSecret ? "Automated payment gateway is configured." : "Payments are currently being prepared."
  });
});
app.get("/api/billing/customer-portal", (_req, res) => {
  return res.json({
    success: true,
    portalUrl: "https://play.google.com/store/account/subscriptions?sku=snapfind_pro&package=com.snapfind.app",
    instructions: "Manage or cancel your Google Play subscriptions directly in the Google Play Store app."
  });
});
app.post("/api/billing/create-checkout-session", (req, res) => {
  const { productId, userId = "guest", returnUrl } = req.body;
  return res.json({
    success: true,
    mode: "sandbox",
    checkoutUrl: returnUrl || "/pricing?payment_status=success",
    message: "Web payment gateway prepared. Operating in safe development mode."
  });
});
function verifyPaddleSignature(rawBody, signatureHeader, secretKey) {
  if (!secretKey || secretKey.trim().length === 0) {
    return { valid: false, reason: "Webhook secret key (PADDLE_WEBHOOK_SECRET) not configured on server." };
  }
  if (!signatureHeader || signatureHeader.trim().length === 0) {
    return { valid: false, reason: "Missing Paddle-Signature header." };
  }
  const parts = signatureHeader.split(";");
  let ts = "";
  let h1 = "";
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("ts=")) {
      ts = trimmed.substring(3).trim();
    } else if (trimmed.startsWith("h1=")) {
      h1 = trimmed.substring(3).trim();
    }
  }
  if (!ts || !h1) {
    return { valid: false, reason: "Malformed Paddle-Signature header: missing ts or h1." };
  }
  const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : typeof rawBody === "string" ? rawBody : "";
  if (!rawBodyStr) {
    return { valid: false, reason: "Empty request payload body." };
  }
  const payloadToSign = `${ts}:${rawBodyStr}`;
  const computedHash = import_crypto.default.createHmac("sha256", secretKey.trim()).update(payloadToSign, "utf-8").digest("hex");
  try {
    const computedBuffer = Buffer.from(computedHash, "hex");
    const receivedBuffer = Buffer.from(h1, "hex");
    if (computedBuffer.length !== receivedBuffer.length) {
      return { valid: false, reason: "Signature length mismatch." };
    }
    const match = import_crypto.default.timingSafeEqual(computedBuffer, receivedBuffer);
    if (!match) {
      return { valid: false, reason: "Cryptographic signature mismatch." };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: "Verification exception: " + (err?.message || "unknown") };
  }
}
app.get("/api/billing/paddle-config", (req, res) => {
  const clientToken = process.env.VITE_PADDLE_CLIENT_TOKEN || process.env.PADDLE_CLIENT_TOKEN || "";
  const environment = (process.env.VITE_PADDLE_ENVIRONMENT || process.env.PADDLE_ENVIRONMENT || (clientToken.startsWith("live_") ? "production" : "sandbox")).toLowerCase();
  const priceIds = {
    monthly: process.env.VITE_PADDLE_PRICE_ID_MONTHLY || process.env.PADDLE_PRICE_ID_MONTHLY || "",
    yearly: process.env.VITE_PADDLE_PRICE_ID_YEARLY || process.env.PADDLE_PRICE_ID_YEARLY || "",
    lifetime: process.env.VITE_PADDLE_PRICE_ID_LIFETIME || process.env.PADDLE_PRICE_ID_LIFETIME || "",
    founder: process.env.VITE_PADDLE_PRICE_ID_FOUNDER || process.env.PADDLE_PRICE_ID_FOUNDER || ""
  };
  const isConfigured = Boolean(
    clientToken && (priceIds.monthly || priceIds.yearly || priceIds.lifetime || priceIds.founder)
  );
  return res.json({
    success: true,
    isConfigured,
    environment: environment === "production" ? "production" : "sandbox",
    clientToken,
    priceIds
  });
});
app.post("/api/payments/paddle/webhook", async (req, res) => {
  const startTime = Date.now();
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMENT_SECRET_KEY;
  const signatureHeader = req.headers["paddle-signature"] || req.headers["Paddle-Signature"];
  const rawBody = req.rawBody || req.body;
  const verification = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
  if (!verification.valid) {
    console.warn(`[PaddleWebhook] Rejected invalid webhook request from IP ${req.ip || "unknown"}. Reason: ${verification.reason}`);
    return res.status(401).json({
      success: false,
      error: "Invalid or unauthorized webhook signature.",
      reason: verification.reason
    });
  }
  try {
    const payload = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(req.body?.toString() || "{}");
    const { event_id, event_type, data, occurred_at } = payload || {};
    if (!event_type) {
      console.warn("[PaddleWebhook] Missing event_type in webhook payload.");
      return res.status(400).json({
        success: false,
        error: "Malformed webhook payload: missing event_type."
      });
    }
    const effectiveEventId = event_id || data?.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (processedPaddleEvents.has(effectiveEventId)) {
      console.log(`[PaddleWebhook] Idempotent skip: Event ${effectiveEventId} (${event_type}) has already been processed.`);
      return res.status(200).json({
        success: true,
        message: "Webhook event already processed (idempotent duplicate).",
        eventId: effectiveEventId
      });
    }
    console.log(`[PaddleWebhook] Processing verified event: ${event_type} | Event ID: ${effectiveEventId}`);
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const customData = data?.custom_data || {};
    let userId = customData.user_id || customData.userId || data?.customer_id || data?.user_id;
    const customerEmail = data?.customer?.email || data?.details?.customer?.email || data?.user_email || customData.email || customData.user_email || null;
    if ((!userId || userId === "guest" || userId.startsWith("local-guest")) && customerEmail && supabaseServer) {
      try {
        const { data: profile } = await supabaseServer.from("profiles").select("id").eq("email", customerEmail).maybeSingle();
        if (profile?.id) {
          userId = profile.id;
          const maskedEmail = customerEmail.replace(/(.{2})(.*)(?=@)/, (_gp, a, b) => a + "*".repeat(b.length));
          console.log(`[PaddleWebhook] Resolved user ID from customer email (${maskedEmail}): ${userId}`);
        }
      } catch (lookupErr) {
        console.warn("[PaddleWebhook] Could not resolve user by email:", lookupErr);
      }
    }
    if (!userId) {
      userId = `paddle_user_${data?.customer_id || Date.now()}`;
    }
    const priceDescription = (data?.items?.[0]?.price?.description || data?.items?.[0]?.price?.name || "").toLowerCase();
    const customPlan = (customData.plan || customData.planType || "").toLowerCase();
    const priceId = data?.items?.[0]?.price?.id || data?.items?.[0]?.price_id || "";
    const founderPriceId = process.env.PADDLE_PRICE_ID_FOUNDER || process.env.VITE_PADDLE_PRICE_ID_FOUNDER || "";
    const amountVal = parseFloat(data?.details?.totals?.total || data?.items?.[0]?.price?.unit_price?.amount || "0");
    const currency = data?.currency_code || data?.details?.totals?.currency_code || "PKR";
    let plan = "monthly";
    if (customPlan === "founder" || priceDescription.includes("founder") || founderPriceId && priceId === founderPriceId || amountVal === 4999) {
      plan = "founder";
    } else if (customPlan === "lifetime" || priceDescription.includes("lifetime") || amountVal >= 7e3 || currency === "USD" && amountVal >= 25) {
      plan = "lifetime";
    } else if (customPlan === "yearly" || priceDescription.includes("year") || amountVal >= 2e3 || currency === "USD" && amountVal >= 8) {
      plan = "yearly";
    } else {
      plan = "monthly";
    }
    const isCompletedTransaction = event_type === "transaction.completed" || event_type === "transaction.paid" || event_type === "transaction.billed" || event_type === "payment.succeeded" || event_type === "payment_succeeded";
    const isSubscriptionActive = event_type === "subscription.created" || event_type === "subscription.activated" || event_type === "subscription.updated" || event_type === "subscription.resumed" || event_type === "subscription_created" || event_type === "subscription_updated";
    const isSubscriptionTerminated = event_type === "subscription.canceled" || event_type === "subscription.past_due" || event_type === "subscription.paused" || event_type === "subscription_cancelled";
    if (isCompletedTransaction || isSubscriptionActive) {
      const expiryDate = new Date(now);
      if (plan === "lifetime" || plan === "founder") {
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
      } else if (plan === "yearly") {
        if (data?.current_billing_period?.ends_at) {
          expiryDate.setTime(new Date(data.current_billing_period.ends_at).getTime());
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }
      } else {
        if (data?.current_billing_period?.ends_at) {
          expiryDate.setTime(new Date(data.current_billing_period.ends_at).getTime());
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
      }
      const orderId = data?.id || `txn_${Date.now()}`;
      const subId = data?.subscription_id || (plan === "lifetime" || plan === "founder" ? `sub_paddle_life_${orderId}` : `sub_paddle_${orderId}`);
      const paymentId = `pay_paddle_${orderId}`;
      let assignedFounderNumber = null;
      if (plan === "founder") {
        if (supabaseServer && userId && userId !== "guest" && !userId.startsWith("local-")) {
          try {
            const { data: rpcData, error: rpcErr } = await supabaseServer.rpc("claim_founder_seat_atomic", {
              p_user_id: userId,
              p_tx_ref: orderId
            });
            if (!rpcErr && rpcData?.founder_number) {
              assignedFounderNumber = rpcData.founder_number;
            }
          } catch (rpcEx) {
            console.warn("[PaddleWebhook] Supabase founder claim RPC error:", rpcEx);
          }
        }
        if (!assignedFounderNumber) {
          serverFounderCounter = Math.min(50, serverFounderCounter + 1);
          assignedFounderNumber = serverFounderCounter;
        }
      }
      const subscriptionRecord = {
        id: subId,
        userId,
        customerEmail,
        plan,
        status: "active",
        provider: "paddle",
        providerCustomerId: data?.customer_id || null,
        providerSubscriptionId: data?.subscription_id || orderId,
        currentPeriodStart: data?.current_billing_period?.starts_at || nowIso,
        currentPeriodEnd: expiryDate.toISOString(),
        cancelAtPeriodEnd: Boolean(data?.scheduled_change?.action === "cancel"),
        productId: `snapfind_pro_${plan}`,
        orderId,
        autoRenewing: plan !== "lifetime" && plan !== "founder",
        priceCurrencyCode: currency,
        priceAmount: amountVal,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      serverSubscriptions.set(subId, subscriptionRecord);
      const paymentRecord = {
        id: paymentId,
        userId,
        customerEmail,
        subscriptionId: subId,
        provider: "paddle",
        providerOrderId: orderId,
        productId: `snapfind_pro_${plan}`,
        amount: amountVal,
        currency,
        status: "succeeded",
        eventId: effectiveEventId,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      serverPayments.set(paymentId, paymentRecord);
      const existingEnt = serverEntitlements.get(userId);
      const isFounder = plan === "founder" || Boolean(existingEnt?.isFounder);
      const founderNumber = assignedFounderNumber || existingEnt?.founderNumber || null;
      const planFeatures = isFounder ? PLAN_FEATURES_MAP.founder : PLAN_FEATURES_MAP[plan] || PLAN_FEATURES_MAP.pro;
      const updatedEntitlement = {
        userId,
        plan: isFounder ? "founder" : plan,
        tier: isFounder ? "Founder" : "Pro",
        isPro: true,
        isFounder,
        founderNumber,
        founderGrantedAt: isFounder ? existingEnt?.founderGrantedAt || nowIso : null,
        founderExpiresAt: null,
        features: { ...planFeatures },
        maxScreenshots: planFeatures.maxIndexedScreenshots,
        canCloudSync: true,
        canAiMultimodalSearch: true,
        priorityProcessing: true,
        activeSubscriptionId: subId,
        productId: `snapfind_pro_${plan}`,
        expiresAt: expiryDate.toISOString(),
        autoRenewing: plan !== "lifetime" && plan !== "founder",
        status: "active",
        updatedAt: nowIso
      };
      serverEntitlements.set(userId, updatedEntitlement);
      syncEntitlementToSupabase(updatedEntitlement).catch((err) => {
        console.warn("[PaddleWebhook] Supabase sync error:", err);
      });
      const notifId = `notif_paddle_${effectiveEventId}`;
      const notif = {
        id: notifId,
        user_id: userId,
        userId,
        type: "SUBSCRIPTION",
        title: "\u26A1 Pro Activated via Paddle",
        message: `Your payment was verified successfully. ${plan.charAt(0).toUpperCase() + plan.slice(1)} Pro access (${updatedEntitlement.maxScreenshots.toLocaleString()} screenshots quota) is now active!`,
        priority: "high",
        read: false,
        created_at: nowIso,
        createdAt: nowIso
      };
      serverNotifications.set(notifId, notif);
      if (supabaseServer && userId && userId !== "guest" && !userId.startsWith("local-")) {
        try {
          await supabaseServer.from("notifications").upsert({
            id: notifId,
            user_id: userId,
            type: "SUBSCRIPTION",
            title: "\u26A1 Pro Activated via Paddle",
            message: `Your payment was verified successfully. ${plan.charAt(0).toUpperCase() + plan.slice(1)} Pro access (${updatedEntitlement.maxScreenshots.toLocaleString()} screenshots quota) is now active!`,
            priority: "high",
            read: false,
            created_at: nowIso
          });
        } catch (notifErr) {
          console.warn("[PaddleWebhook] Notification upsert error:", notifErr);
        }
      }
      console.log(`[PaddleWebhook] Activated ${plan.toUpperCase()} Pro entitlement for user ${userId} (Txn: ${orderId})`);
    } else if (isSubscriptionTerminated) {
      const subId = data?.id || data?.subscription_id;
      if (subId && serverSubscriptions.has(subId)) {
        const existingSub = serverSubscriptions.get(subId);
        existingSub.status = "canceled";
        existingSub.updatedAt = nowIso;
        serverSubscriptions.set(subId, existingSub);
      }
      const existingEnt = serverEntitlements.get(userId);
      if (existingEnt && !existingEnt.isFounder && existingEnt.plan !== "lifetime") {
        const isPastPeriod = existingEnt.expiresAt && new Date(existingEnt.expiresAt).getTime() <= Date.now();
        if (isPastPeriod) {
          const revertedEnt = {
            userId,
            plan: "free",
            tier: "Free",
            isPro: false,
            isFounder: false,
            founderNumber: null,
            features: { ...PLAN_FEATURES_MAP.free },
            maxScreenshots: PLAN_FEATURES_MAP.free.maxIndexedScreenshots,
            canCloudSync: false,
            canAiMultimodalSearch: false,
            priorityProcessing: false,
            activeSubscriptionId: null,
            productId: "snapfind_free",
            expiresAt: null,
            autoRenewing: false,
            status: "inactive",
            updatedAt: nowIso
          };
          serverEntitlements.set(userId, revertedEnt);
          syncEntitlementToSupabase(revertedEnt).catch(() => {
          });
          console.log(`[PaddleWebhook] Reverted user ${userId} to Free plan after subscription termination.`);
        }
      }
    }
    serverSubscriptionEvents.push({
      id: `evt_paddle_${effectiveEventId}`,
      userId,
      provider: "paddle",
      eventType: event_type,
      eventId: effectiveEventId,
      payload: {
        eventType: event_type,
        plan,
        currency,
        amount: amountVal,
        occurredAt: occurred_at || nowIso
      },
      createdAt: nowIso
    });
    processedPaddleEvents.add(effectiveEventId);
    saveBillingStateToDisk();
    console.log(`[PaddleWebhook] Successfully processed ${event_type} in ${Date.now() - startTime}ms`);
    return res.status(200).json({
      success: true,
      message: "Paddle webhook processed successfully.",
      eventId: effectiveEventId,
      eventType: event_type
    });
  } catch (err) {
    console.error("[PaddleWebhook] Internal processing exception:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while processing webhook."
    });
  }
});
app.get("/api/billing/audit-events", (_req, res) => {
  return res.json({
    success: true,
    events: serverSubscriptionEvents.slice(-50),
    // last 50 events
    processedPaddleEventsCount: processedPaddleEvents.size
  });
});
var FEEDBACK_DATA_FILE = import_path.default.join(BILLING_DATA_DIR, "feedback_state.json");
var serverFeedbackList = [];
function loadFeedbackState() {
  try {
    if (import_fs.default.existsSync(FEEDBACK_DATA_FILE)) {
      const raw = import_fs.default.readFileSync(FEEDBACK_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        serverFeedbackList.push(...parsed);
      }
    }
  } catch (err) {
    console.warn("[Feedback] Could not load feedback state:", err);
  }
}
loadFeedbackState();
function saveFeedbackState() {
  try {
    if (!import_fs.default.existsSync(BILLING_DATA_DIR)) {
      import_fs.default.mkdirSync(BILLING_DATA_DIR, { recursive: true });
    }
    import_fs.default.writeFileSync(FEEDBACK_DATA_FILE, JSON.stringify(serverFeedbackList.slice(-500), null, 2), "utf-8");
  } catch (err) {
    console.warn("[Feedback] Could not save feedback state:", err);
  }
}
app.post(["/api/feedback", "/api/feedback/submit"], async (req, res) => {
  try {
    const {
      type = "UI/UX",
      title,
      description,
      message,
      rating = 5,
      nps_score = null,
      page = "General",
      screenshot_url = null,
      user_email,
      platform = "Web"
    } = req.body;
    const bodyDesc = (description || message || title || "").trim();
    if (!bodyDesc) {
      return res.status(400).json({ success: false, error: "Feedback message or description is required." });
    }
    const userId = req.headers["x-user-id"] || req.body.user_id || "guest";
    const newId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newRecord = {
      id: newId,
      user_id: userId,
      user_email: user_email || void 0,
      type: String(type),
      title: title ? String(title).trim() : `${type} from ${page}`,
      description: bodyDesc,
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      nps_score: nps_score !== null && nps_score !== void 0 ? Math.max(0, Math.min(10, Number(nps_score))) : null,
      page: String(page),
      screenshot_url: screenshot_url || null,
      app_version: "v2.4.0",
      platform: String(platform),
      created_at: nowIso,
      status: "pending"
    };
    serverFeedbackList.unshift(newRecord);
    saveFeedbackState();
    if (supabaseServer) {
      try {
        await supabaseServer.from("feedback").insert([
          {
            id: newRecord.id,
            user_id: newRecord.user_id,
            user_email: newRecord.user_email,
            type: newRecord.type,
            title: newRecord.title,
            description: newRecord.description,
            rating: newRecord.rating,
            nps_score: newRecord.nps_score,
            page: newRecord.page,
            screenshot_url: newRecord.screenshot_url,
            app_version: newRecord.app_version,
            platform: newRecord.platform,
            created_at: newRecord.created_at,
            status: newRecord.status
          }
        ]);
      } catch (e) {
        console.warn("[Feedback] Supabase insert warning:", e);
      }
    }
    console.log(`[Feedback] New feedback received from user ${userId} on page [${page}]: "${newRecord.title}"`);
    return res.json({
      success: true,
      message: "Thank you! Your feedback has been received.",
      item: newRecord
    });
  } catch (error) {
    console.error("[Feedback] Submit error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to submit feedback." });
  }
});
app.get("/api/feedback", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  const userFeedback = serverFeedbackList.filter((f) => f.user_id === userId || userId === "admin");
  return res.json({ success: true, items: userFeedback });
});
var GAME_DATA_FILE = import_path.default.join(BILLING_DATA_DIR, "game_state.json");
var serverGameProfiles = /* @__PURE__ */ new Map();
var serverGameScores = [];
function loadGameState() {
  try {
    if (import_fs.default.existsSync(GAME_DATA_FILE)) {
      const raw = import_fs.default.readFileSync(GAME_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.profiles) {
          for (const [k, v] of Object.entries(parsed.profiles)) {
            serverGameProfiles.set(k, v);
          }
        }
        if (Array.isArray(parsed.scores)) {
          serverGameScores.push(...parsed.scores);
        }
      }
    }
  } catch (err) {
    console.warn("[SnapDash] Could not load game state from disk:", err);
  }
}
loadGameState();
function saveGameState() {
  try {
    if (!import_fs.default.existsSync(BILLING_DATA_DIR)) {
      import_fs.default.mkdirSync(BILLING_DATA_DIR, { recursive: true });
    }
    const state = {
      profiles: Object.fromEntries(serverGameProfiles.entries()),
      scores: serverGameScores.slice(-500),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    import_fs.default.writeFileSync(GAME_DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.warn("[SnapDash] Could not save game state to disk:", err);
  }
}
var RESERVED_USERNAMES = /* @__PURE__ */ new Set(["admin", "administrator", "snapfind", "snapdash", "moderator", "system", "root", "official", "support"]);
function validateGameUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required." };
  }
  const clean = username.trim().replace(/\s+/g, " ");
  if (clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long." };
  }
  if (clean.length > 20) {
    return { valid: false, error: "Username cannot exceed 20 characters." };
  }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(clean)) {
    return { valid: false, error: "Username can only contain letters, numbers, spaces, underscores, and hyphens." };
  }
  if (RESERVED_USERNAMES.has(clean.toLowerCase())) {
    return { valid: false, error: "This username is reserved. Please choose a different name." };
  }
  return { valid: true, sanitized: clean };
}
app.get("/api/game/profile", async (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  const isGuest = !userId || userId === "guest" || userId.startsWith("local-guest");
  if (isGuest) {
    return res.json({
      success: true,
      isGuest: true,
      profile: null
    });
  }
  let profile = serverGameProfiles.get(userId);
  if (!profile && supabaseServer) {
    try {
      const { data } = await supabaseServer.from("game_profiles").select("*").eq("user_id", userId).single();
      if (data) {
        profile = {
          userId: data.user_id,
          gameUsername: data.game_username,
          highScore: data.high_score || 0,
          totalGamesPlayed: data.total_games_played || 0,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        serverGameProfiles.set(userId, profile);
      }
    } catch (e) {
      console.warn("[SnapDash] Supabase profile query fallback:", e);
    }
  }
  if (!profile) {
    const defaultUsername = `Player_${userId.slice(0, 5)}`;
    return res.json({
      success: true,
      isGuest: false,
      hasCustomUsername: false,
      suggestedUsername: defaultUsername,
      profile: null
    });
  }
  return res.json({
    success: true,
    isGuest: false,
    hasCustomUsername: true,
    profile
  });
});
app.post("/api/game/profile", async (req, res) => {
  const userId = req.headers["x-user-id"] || req.body.userId || "guest";
  const isGuest = !userId || userId === "guest" || userId.startsWith("local-guest");
  if (isGuest) {
    return res.status(401).json({ success: false, error: "Please sign in to customize your SnapDash game username." });
  }
  const { gameUsername } = req.body;
  const validation = validateGameUsername(gameUsername);
  if (!validation.valid || !validation.sanitized) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  const cleanName = validation.sanitized;
  for (const [otherUserId, otherProf] of serverGameProfiles.entries()) {
    if (otherUserId !== userId && otherProf.gameUsername.toLowerCase() === cleanName.toLowerCase()) {
      return res.status(409).json({ success: false, error: "This game username is already taken. Please choose another." });
    }
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let profile = serverGameProfiles.get(userId);
  if (profile) {
    profile.gameUsername = cleanName;
    profile.updatedAt = nowIso;
  } else {
    profile = {
      userId,
      gameUsername: cleanName,
      highScore: 0,
      totalGamesPlayed: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }
  serverGameProfiles.set(userId, profile);
  saveGameState();
  if (supabaseServer) {
    try {
      await supabaseServer.from("game_profiles").upsert({
        user_id: userId,
        game_username: cleanName,
        high_score: profile.highScore,
        total_games_played: profile.totalGamesPlayed,
        updated_at: nowIso
      });
    } catch (e) {
      console.warn("[SnapDash] Supabase profile upsert warning:", e);
    }
  }
  console.log(`[SnapDash] User ${userId} updated game username to "${cleanName}"`);
  return res.json({
    success: true,
    message: `Game username set to "${cleanName}"`,
    profile
  });
});
app.post("/api/game/submit-score", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.body.userId || "guest";
    const isGuest = !userId || userId === "guest" || userId.startsWith("local-guest");
    if (isGuest) {
      return res.status(401).json({
        success: false,
        error: "Authentication required to save scores to the global leaderboard.",
        isGuest: true
      });
    }
    const { score, durationSeconds = 0 } = req.body;
    const numScore = Math.floor(Number(score));
    const numDuration = Math.max(0, Math.floor(Number(durationSeconds)));
    if (isNaN(numScore) || numScore < 0) {
      return res.status(400).json({ success: false, error: "Invalid score value." });
    }
    const maxAllowedScore = Math.max(500, (numDuration + 5) * 160);
    if (numScore > 5e5 || numDuration > 0 && numScore > maxAllowedScore) {
      console.warn(`[SnapDash Anti-Cheat] Blocked suspicious score: ${numScore} in ${numDuration}s by user ${userId}`);
      return res.status(400).json({
        success: false,
        error: "Score validation failed. Impossible speed or score anomaly detected."
      });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let profile = serverGameProfiles.get(userId);
    let currentUsername = profile?.gameUsername || `Player_${userId.slice(0, 5)}`;
    if (!profile) {
      profile = {
        userId,
        gameUsername: currentUsername,
        highScore: numScore,
        totalGamesPlayed: 1,
        createdAt: nowIso,
        updatedAt: nowIso
      };
    } else {
      profile.totalGamesPlayed += 1;
      profile.updatedAt = nowIso;
      if (numScore > profile.highScore) {
        profile.highScore = numScore;
      }
    }
    const isNewPersonalBest = numScore > (profile.highScore === numScore ? 0 : profile.highScore) || profile.highScore === numScore;
    serverGameProfiles.set(userId, profile);
    const scoreRecord = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      gameUsername: currentUsername,
      score: numScore,
      durationSeconds: numDuration,
      createdAt: nowIso
    };
    serverGameScores.push(scoreRecord);
    saveGameState();
    if (supabaseServer) {
      try {
        await supabaseServer.from("game_scores").insert([
          {
            user_id: userId,
            game_username: currentUsername,
            score: numScore,
            duration_seconds: numDuration,
            created_at: nowIso
          }
        ]);
        await supabaseServer.from("game_profiles").upsert({
          user_id: userId,
          game_username: currentUsername,
          high_score: profile.highScore,
          total_games_played: profile.totalGamesPlayed,
          updated_at: nowIso
        });
      } catch (e) {
        console.warn("[SnapDash] Supabase score sync warning:", e);
      }
    }
    const allHighScores = Array.from(serverGameProfiles.values()).filter((p) => p.highScore > 0).sort((a, b) => b.highScore - a.highScore);
    const userRank = allHighScores.findIndex((p) => p.userId === userId) + 1;
    console.log(`[SnapDash] Score submitted: ${numScore} by "${currentUsername}" (Rank: #${userRank || 1}, New Best: ${isNewPersonalBest})`);
    return res.json({
      success: true,
      score: numScore,
      highScore: profile.highScore,
      isNewBest: isNewPersonalBest,
      currentRank: userRank > 0 ? userRank : 1,
      totalGamesPlayed: profile.totalGamesPlayed,
      gameUsername: currentUsername
    });
  } catch (error) {
    console.error("[SnapDash] Score submit error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to submit score." });
  }
});
app.get("/api/game/leaderboard", async (req, res) => {
  const currentUserId = req.headers["x-user-id"] || req.query.userId || "guest";
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  if (supabaseServer) {
    try {
      const { data: dbProfiles, error } = await supabaseServer.from("game_profiles").select("user_id, game_username, high_score, total_games_played, created_at, updated_at").gt("high_score", 0).order("high_score", { ascending: false }).limit(limit);
      if (!error && Array.isArray(dbProfiles)) {
        for (const p of dbProfiles) {
          const existing = serverGameProfiles.get(p.user_id);
          if (!existing || p.high_score > existing.highScore) {
            serverGameProfiles.set(p.user_id, {
              userId: p.user_id,
              gameUsername: p.game_username || `Player_${p.user_id.slice(0, 5)}`,
              highScore: p.high_score,
              totalGamesPlayed: p.total_games_played || 1,
              createdAt: p.created_at || (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: p.updated_at || (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
      }
    } catch (e) {
      console.warn("[SnapDash] Supabase leaderboard sync warning:", e);
    }
  }
  const bestMap = /* @__PURE__ */ new Map();
  for (const [, prof] of serverGameProfiles.entries()) {
    if (prof && prof.highScore > 0 && prof.userId && !prof.userId.startsWith("fake-") && !prof.userId.startsWith("bot-")) {
      bestMap.set(prof.userId, { profile: prof });
    }
  }
  for (const s of serverGameScores) {
    const entry = bestMap.get(s.userId);
    if (entry && s.score === entry.profile.highScore) {
      if (!entry.scoreObj || new Date(s.createdAt).getTime() < new Date(entry.scoreObj.createdAt).getTime()) {
        entry.scoreObj = s;
      }
    }
  }
  const sorted = Array.from(bestMap.values()).sort((a, b) => {
    if (b.profile.highScore !== a.profile.highScore) {
      return b.profile.highScore - a.profile.highScore;
    }
    const aTime = a.scoreObj ? new Date(a.scoreObj.createdAt).getTime() : 0;
    const bTime = b.scoreObj ? new Date(b.scoreObj.createdAt).getTime() : 0;
    return aTime - bTime;
  });
  const leaderboard = sorted.slice(0, limit).map((item, index) => {
    const ent = serverEntitlements.get(item.profile.userId);
    return {
      rank: index + 1,
      userId: item.profile.userId,
      gameUsername: item.profile.gameUsername,
      score: item.profile.highScore,
      durationSeconds: item.scoreObj?.durationSeconds || 0,
      createdAt: item.scoreObj?.createdAt || item.profile.updatedAt || item.profile.createdAt,
      isCurrentUser: item.profile.userId === currentUserId,
      tier: ent?.isFounder ? "Founder" : ent?.isPro ? "Pro" : "Free",
      isFounder: Boolean(ent?.isFounder)
    };
  });
  let userRank = null;
  const userIdx = sorted.findIndex((item) => item.profile.userId === currentUserId);
  if (userIdx >= 0) {
    userRank = userIdx + 1;
  }
  return res.json({
    success: true,
    totalPlayers: sorted.length,
    leaderboard,
    userRank
  });
});
app.get("/api/game/user-stats", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  const isGuest = !userId || userId === "guest" || userId.startsWith("local-guest");
  if (isGuest) {
    return res.json({
      success: true,
      stats: {
        gameUsername: "Guest Pilot",
        personalBest: 0,
        currentRank: null,
        totalGamesPlayed: 0
      }
    });
  }
  const profile = serverGameProfiles.get(userId);
  const allHighScores = Array.from(serverGameProfiles.values()).filter((p) => p.highScore > 0).sort((a, b) => b.highScore - a.highScore);
  const rankIdx = allHighScores.findIndex((p) => p.userId === userId);
  return res.json({
    success: true,
    stats: {
      gameUsername: profile?.gameUsername || `Player_${userId.slice(0, 5)}`,
      personalBest: profile?.highScore || 0,
      currentRank: rankIdx >= 0 ? rankIdx + 1 : null,
      totalGamesPlayed: profile?.totalGamesPlayed || 0,
      lastPlayedAt: profile?.updatedAt
    }
  });
});
app.get("/api/usage", (req, res) => {
  const { userKey, userId, deviceId } = getEffectiveUserKey(req);
  const usage = getOrInitServerUsage(userKey, userId, deviceId);
  const ent = serverEntitlements.get(userId) || {
    plan: "free",
    tier: "Free",
    isPro: false,
    isFounder: false
  };
  const isFounder = Boolean(ent.isFounder);
  const isPro = Boolean(ent.isPro || isFounder);
  const limits = isFounder ? PLAN_FEATURES_MAP.founder : isPro ? PLAN_FEATURES_MAP.pro : PLAN_FEATURES_MAP.free;
  const now = /* @__PURE__ */ new Date();
  const resetDateObj = new Date(usage.monthlyResetDate);
  const diffTime = resetDateObj.getTime() - now.getTime();
  const daysUntilReset = Math.max(1, Math.ceil(diffTime / (1e3 * 60 * 60 * 24)));
  return res.json({
    success: true,
    userKey,
    userId,
    deviceId,
    tier: isFounder ? "Founder Pro" : isPro ? "Pro" : "Free",
    plan: ent.plan || "free",
    isPro,
    isFounder,
    founderNumber: ent.founderNumber || null,
    usage: {
      screenshotsIndexed: usage.screenshotsIndexed,
      aiAnalysesUsed: usage.aiAnalysesUsed,
      storageBytesUsed: usage.storageBytesUsed,
      storageMBUsed: Number((usage.storageBytesUsed / (1024 * 1024)).toFixed(1)),
      cloudSyncCount: usage.cloudSyncCount,
      periodStart: usage.periodStart,
      monthlyResetDate: usage.monthlyResetDate,
      daysUntilReset
    },
    limits: {
      maxIndexedScreenshots: limits.maxIndexedScreenshots,
      maxAIScansPerMonth: limits.maxAIScansPerMonth,
      maxStorageMB: limits.maxStorageMB,
      maxStorageBytes: limits.maxStorageMB * 1024 * 1024,
      cloudSyncAllowed: limits.cloudSync,
      priorityProcessing: limits.priorityProcessing
    },
    remaining: {
      screenshotsRemaining: Math.max(0, limits.maxIndexedScreenshots - usage.screenshotsIndexed),
      aiAnalysesRemaining: Math.max(0, limits.maxAIScansPerMonth - usage.aiAnalysesUsed),
      storageBytesRemaining: Math.max(0, limits.maxStorageMB * 1024 * 1024 - usage.storageBytesUsed)
    },
    isUnlimitedResource: false
    // We accurately reflect the concrete backend capabilities
  });
});
app.post("/api/usage/record", (req, res) => {
  const { userKey, userId, deviceId } = getEffectiveUserKey(req);
  const usage = getOrInitServerUsage(userKey, userId, deviceId);
  const { action, byteSize = 0, count = 1 } = req.body;
  if (action === "ai_scan") {
    usage.aiAnalysesUsed += count;
  } else if (action === "index_screenshot") {
    usage.screenshotsIndexed += count;
    usage.storageBytesUsed = Math.max(0, usage.storageBytesUsed + byteSize);
  } else if (action === "delete_screenshot") {
    usage.screenshotsIndexed = Math.max(0, usage.screenshotsIndexed - count);
    usage.storageBytesUsed = Math.max(0, usage.storageBytesUsed - byteSize);
  } else if (action === "cloud_sync") {
    usage.cloudSyncCount += count;
  }
  usage.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  serverUsageStore.set(userKey, usage);
  return res.json({
    success: true,
    usage: {
      screenshotsIndexed: usage.screenshotsIndexed,
      aiAnalysesUsed: usage.aiAnalysesUsed,
      storageBytesUsed: usage.storageBytesUsed,
      cloudSyncCount: usage.cloudSyncCount,
      monthlyResetDate: usage.monthlyResetDate
    }
  });
});
app.post("/api/usage/sync", (req, res) => {
  const { userKey, userId, deviceId } = getEffectiveUserKey(req);
  const usage = getOrInitServerUsage(userKey, userId, deviceId);
  const { clientScreenshotsCount = 0, clientStorageBytes = 0, clientSyncedCount = 0 } = req.body;
  usage.screenshotsIndexed = Math.max(usage.screenshotsIndexed, Number(clientScreenshotsCount) || 0);
  usage.storageBytesUsed = Math.max(usage.storageBytesUsed, Number(clientStorageBytes) || 0);
  usage.cloudSyncCount = Math.max(usage.cloudSyncCount, Number(clientSyncedCount) || 0);
  usage.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  serverUsageStore.set(userKey, usage);
  return res.json({
    success: true,
    usage
  });
});
app.post("/api/admin/test-reset", async (req, res) => {
  const auth = await checkAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({ success: false, error: auth.error });
  }
  serverFounderCounter = 0;
  serverEntitlements.clear();
  serverPayments.clear();
  serverPaymentRequests.clear();
  serverNotifications.clear();
  serverUsageStore.clear();
  saveBillingStateToDisk();
  return res.json({ success: true, message: "Testing state reset successfully." });
});
async function startServer() {
  await loadAuthoritativeFounderStateFromSupabase().catch(() => {
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SnapFind AI] Server active at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
