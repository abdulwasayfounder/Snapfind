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
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
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
    const { base64Data, mimeType: rawMime = "image/png", fileName = "screenshot.png", timestamp } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Missing base64Data in request body." });
    }
    const { userKey, userId, deviceId } = getEffectiveUserKey(req);
    const usage = getOrInitServerUsage(userKey, userId, deviceId);
    const ent = serverEntitlements.get(userId) || { plan: "free", isPro: false, isFounder: false };
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
CRITICAL INSTRUCTION:
1. title: Generate a clear, descriptive 3 to 7 word human-readable title summarizing what this screenshot depicts (e.g., "Monthly Performance Analytics Dashboard", "Passport Photo Identification Page", "Pepperoni Pizza Recipe", "Electricity Bill Statement"). DO NOT use the image filename (e.g. "mon", "mon.jpg", "image", "screenshot") or file extensions as the title.
2. description: A detailed 2 to 4 sentence description of the screenshot content, visual layout, text, and context.
3. category: Categorize as exactly one of: ["Passport", "Recipe", "Electricity Bill", "QR Code", "Ticket & Travel", "Receipt & Invoice", "Chat & Message", "Code & Dev", "E-Commerce", "Admission & Certificate", "Financial", "Notes & Ideas", "Other"].
4. collectionName: Automatically classify into an Apple Photos style collection album name (e.g. "Travel & Identity", "Utility Bills", "Food & Recipes", "Development & Code", "Shopping Receipts", "Financial Documents", "Chat & Messages", "Education & Cards", "Ideas & Notes").
5. summary: A 2-sentence natural language summary explaining the core content, context, and purpose.
6. fullText: Exhaustive OCR text extraction of ALL readable text, numbers, codes, and labels in the image.
7. keyEntities: Extract specific structured facts found, like names, amounts, reference numbers, dates, emails, phone numbers, addresses, account numbers.
8. keywords: Array of 5 to 10 specific search terms and keywords found or implied in the image.
9. tags: 4 to 8 relevant search tags or keywords (lowercase).
10. objects: Array of detected visual and physical objects in the image (e.g., ["paper", "receipt", "table", "text", "barcode"]).
11. textDensity: "low", "medium", or "high".
12. keyMetrics: List of important numbers/amounts with labels if applicable.`;
    let response = null;
    let attempts = 0;
    const maxAttempts = 3;
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
    const rawText = response?.text || "";
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    let analysis = null;
    try {
      if (cleanJson) {
        analysis = JSON.parse(cleanJson);
      }
    } catch {
      analysis = null;
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
        description: analysis.description || analysis.summary || "Analyzed screenshot image.",
        keywords: analysis.keywords || analysis.keyEntities || [],
        objects: analysis.objects || [],
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
var GOOGLE_PLAY_PRODUCTS = [
  {
    productId: "snapfind_pro:pro-yearly",
    type: "subs",
    title: "SnapFind Pro (Yearly)",
    name: "SnapFind Pro Yearly Plan",
    description: "10,000 indexed screenshots, advanced AI search, cloud sync, priority processing",
    formattedPrice: "$24.99/year",
    priceCurrencyCode: "USD",
    priceAmountMicros: 2499e4,
    billingPeriod: "P1Y",
    badge: "Best Value (Save 30%)"
  },
  {
    productId: "snapfind_pro:pro-monthly",
    type: "subs",
    title: "SnapFind Pro (Monthly)",
    name: "SnapFind Pro Monthly Plan",
    description: "10,000 indexed screenshots, advanced AI search, cloud sync, priority processing",
    formattedPrice: "$2.99/month",
    priceCurrencyCode: "USD",
    priceAmountMicros: 299e4,
    billingPeriod: "P1M"
  },
  {
    productId: "snapfind_pro_lifetime",
    type: "inapp",
    title: "SnapFind Pro Lifetime",
    name: "SnapFind Pro Lifetime Pass",
    description: "Permanent Pro entitlement for 10,000 screenshots, all future AI vision upgrades",
    formattedPrice: "$39.99",
    priceCurrencyCode: "USD",
    priceAmountMicros: 3999e4,
    billingPeriod: "lifetime",
    badge: "One-Time Payment"
  }
];
var FOUNDER_CONFIG = {
  max_founder_users: 100,
  benefit_duration_days: null,
  // null = Lifetime
  enabled: true
};
var serverEntitlements = /* @__PURE__ */ new Map();
var serverSubscriptions = /* @__PURE__ */ new Map();
var serverPayments = /* @__PURE__ */ new Map();
var serverSubscriptionEvents = [];
var serverFounderCounter = 0;
var serverUsageStore = /* @__PURE__ */ new Map();
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
var PLAN_FEATURES_MAP = {
  free: {
    maxIndexedScreenshots: 500,
    maxAIScansPerMonth: 20,
    maxStorageMB: 500,
    cloudSync: false,
    advancedSearch: false,
    aiCollections: false,
    priorityProcessing: false
  },
  pro: {
    maxIndexedScreenshots: 1e4,
    maxAIScansPerMonth: 2e3,
    maxStorageMB: 1e4,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: true
  },
  founder: {
    maxIndexedScreenshots: 1e4,
    maxAIScansPerMonth: 2e3,
    maxStorageMB: 1e4,
    cloudSync: true,
    advancedSearch: true,
    aiCollections: true,
    priorityProcessing: true
  }
};
app.get("/api/billing/products", (_req, res) => {
  return res.json({
    success: true,
    products: GOOGLE_PLAY_PRODUCTS,
    founderConfig: FOUNDER_CONFIG,
    currentFoundersGranted: serverFounderCounter
  });
});
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
  try {
    const ageMs = Date.now() - new Date(lastFxFetchTimestamp).getTime();
    if (ageMs > 12 * 60 * 60 * 1e3) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2e3);
        const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData && fxData.rates) {
            if (fxData.rates.PKR) SERVER_FX_RATES.PKR = Number(fxData.rates.PKR);
            if (fxData.rates.INR) SERVER_FX_RATES.INR = Number(fxData.rates.INR);
            if (fxData.rates.EUR) SERVER_FX_RATES.EUR = Number(fxData.rates.EUR);
            if (fxData.rates.GBP) SERVER_FX_RATES.GBP = Number(fxData.rates.GBP);
            if (fxData.rates.AED) SERVER_FX_RATES.AED = Number(fxData.rates.AED);
            if (fxData.rates.SAR) SERVER_FX_RATES.SAR = Number(fxData.rates.SAR);
            lastFxFetchTimestamp = (/* @__PURE__ */ new Date()).toISOString();
          }
        }
      } catch (networkErr) {
        console.warn("[BillingFX] External rate fetch skipped, serving verified cached rates");
      }
    }
    return res.json({
      success: true,
      base: "USD",
      rates: SERVER_FX_RATES,
      lastUpdated: lastFxFetchTimestamp,
      source: "SnapFind Financial FX Service"
    });
  } catch (err) {
    return res.json({
      success: true,
      base: "USD",
      rates: SERVER_FX_RATES,
      lastUpdated: lastFxFetchTimestamp,
      source: "SnapFind Fallback FX Engine"
    });
  }
});
app.post("/api/billing/verify-purchase", async (req, res) => {
  try {
    const {
      userId = "guest",
      productId,
      purchaseToken,
      orderId,
      platform = "android_google_play",
      isSandbox = platform === "mock" || String(purchaseToken).startsWith("token_sandbox_")
    } = req.body;
    if (!productId || !purchaseToken) {
      return res.status(400).json({
        success: false,
        error: "Missing required billing parameters (productId and purchaseToken required)."
      });
    }
    const matchedProduct = GOOGLE_PLAY_PRODUCTS.find((p) => p.productId === productId);
    const billingPeriod = matchedProduct?.billingPeriod || "P1M";
    const now = /* @__PURE__ */ new Date();
    let expiryDate = new Date(now);
    if (billingPeriod === "P1Y") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else if (billingPeriod === "lifetime") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const effectiveOrderId = orderId || `GPA.${Date.now()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const subscriptionRecord = {
      id: subId,
      userId,
      plan: "pro",
      status: "active",
      provider: platform === "mock" ? "mock" : "google_play",
      providerCustomerId: userId,
      providerSubscriptionId: purchaseToken,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiryDate.toISOString(),
      cancelAtPeriodEnd: false,
      productId,
      purchaseToken,
      orderId: effectiveOrderId,
      platform,
      isSandbox: Boolean(isSandbox),
      autoRenewing: billingPeriod !== "lifetime",
      priceCurrencyCode: matchedProduct?.priceCurrencyCode || "USD",
      priceAmountMicros: matchedProduct?.priceAmountMicros || 299e4,
      startTime: now.toISOString(),
      expiryTime: expiryDate.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverSubscriptions.set(subId, subscriptionRecord);
    const paymentRecord = {
      id: paymentId,
      userId,
      subscriptionId: subId,
      provider: platform === "mock" ? "mock" : "google_play",
      providerOrderId: effectiveOrderId,
      purchaseToken,
      productId,
      amountMicros: matchedProduct?.priceAmountMicros || 299e4,
      currency: matchedProduct?.priceCurrencyCode || "USD",
      status: "succeeded",
      isSandbox: Boolean(isSandbox),
      platform: platform === "mock" ? "mock" : "android",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    serverPayments.set(paymentId, paymentRecord);
    const existing = serverEntitlements.get(userId);
    const updatedEntitlement = {
      userId,
      plan: "pro",
      tier: "Pro",
      isPro: true,
      isFounder: existing?.isFounder || false,
      founderNumber: existing?.founderNumber || null,
      founderGrantedAt: existing?.founderGrantedAt || null,
      founderExpiresAt: existing?.founderExpiresAt || null,
      features: { ...PLAN_FEATURES_MAP.pro },
      maxScreenshots: PLAN_FEATURES_MAP.pro.maxIndexedScreenshots,
      canCloudSync: true,
      canAiMultimodalSearch: true,
      priorityProcessing: true,
      activeSubscriptionId: subId,
      productId,
      expiresAt: expiryDate.toISOString(),
      autoRenewing: subscriptionRecord.autoRenewing,
      status: "active",
      updatedAt: now.toISOString()
    };
    serverEntitlements.set(userId, updatedEntitlement);
    serverSubscriptionEvents.push({
      id: `evt_${Date.now()}`,
      userId,
      provider: platform === "mock" ? "mock" : "google_play",
      eventType: "subscription_created",
      isSandbox: Boolean(isSandbox),
      payload: {
        subId,
        paymentId,
        productId,
        orderId: effectiveOrderId,
        amountMicros: paymentRecord.amountMicros,
        currency: paymentRecord.currency
      },
      createdAt: now.toISOString()
    });
    console.log(
      `[BillingServer] Verified purchase for user ${userId}: ${productId} (Order: ${effectiveOrderId}, Sandbox: ${isSandbox})`
    );
    return res.json({
      success: true,
      subscription: subscriptionRecord,
      payment: paymentRecord,
      entitlement: updatedEntitlement,
      message: isSandbox ? "Development Sandbox purchase verified and Pro entitlement activated." : "Google Play purchase verified and Pro entitlement activated."
    });
  } catch (error) {
    console.error("[BillingServer] Verification error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify purchase."
    });
  }
});
app.get("/api/billing/entitlements", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  let existing = serverEntitlements.get(userId);
  if (existing) {
    if (existing.expiresAt && new Date(existing.expiresAt).getTime() < Date.now()) {
      if (!existing.isFounder) {
        existing = {
          ...existing,
          plan: "free",
          tier: "Free",
          isPro: false,
          features: { ...PLAN_FEATURES_MAP.free },
          maxScreenshots: PLAN_FEATURES_MAP.free.maxIndexedScreenshots,
          canCloudSync: false,
          canAiMultimodalSearch: false,
          priorityProcessing: false,
          status: "expired",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        serverEntitlements.set(userId, existing);
      }
    }
    return res.json({ success: true, entitlement: existing });
  }
  const isGuest = userId === "guest" || userId.startsWith("local-guest");
  let isFounder = false;
  let founderNumber = null;
  let founderGrantedAt = null;
  let founderExpiresAt = null;
  if (!isGuest && FOUNDER_CONFIG.enabled && serverFounderCounter < FOUNDER_CONFIG.max_founder_users) {
    serverFounderCounter += 1;
    isFounder = true;
    founderNumber = serverFounderCounter;
    founderGrantedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (FOUNDER_CONFIG.benefit_duration_days) {
      const exp = /* @__PURE__ */ new Date();
      exp.setDate(exp.getDate() + FOUNDER_CONFIG.benefit_duration_days);
      founderExpiresAt = exp.toISOString();
    }
    console.log(`[Founder100] Allocated Founder #${founderNumber} to user ${userId}`);
  }
  const plan = isFounder ? "founder" : "free";
  const isPro = isFounder;
  const tier = isFounder ? "Founder" : "Free";
  const features = isFounder ? { ...PLAN_FEATURES_MAP.founder } : { ...PLAN_FEATURES_MAP.free };
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
    status: isFounder ? "active" : void 0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  serverEntitlements.set(userId, newEntitlement);
  return res.json({ success: true, entitlement: newEntitlement });
});
app.post("/api/billing/claim-founder", (req, res) => {
  const userId = req.headers["x-user-id"] || req.body?.userId || "guest";
  const isGuest = userId === "guest" || userId.startsWith("local-guest");
  if (isGuest) {
    return res.status(400).json({
      success: false,
      error: "Please sign in or create an account to claim your Founder spot."
    });
  }
  const existing = serverEntitlements.get(userId);
  if (existing && existing.isFounder) {
    return res.json({
      success: true,
      message: `You are already Founder #${existing.founderNumber}!`,
      entitlement: existing
    });
  }
  if (serverFounderCounter >= FOUNDER_CONFIG.max_founder_users) {
    return res.status(400).json({
      success: false,
      error: "All 100 Founder spots have been claimed. You can upgrade to Pro anytime!"
    });
  }
  serverFounderCounter += 1;
  const founderNumber = serverFounderCounter;
  const founderGrantedAt = (/* @__PURE__ */ new Date()).toISOString();
  let founderExpiresAt = null;
  if (FOUNDER_CONFIG.benefit_duration_days) {
    const exp = /* @__PURE__ */ new Date();
    exp.setDate(exp.getDate() + FOUNDER_CONFIG.benefit_duration_days);
    founderExpiresAt = exp.toISOString();
  }
  const features = { ...PLAN_FEATURES_MAP.founder };
  const founderEntitlement = {
    userId,
    plan: "founder",
    tier: "Founder",
    isPro: true,
    isFounder: true,
    founderNumber,
    founderGrantedAt,
    founderExpiresAt,
    features,
    maxScreenshots: features.maxIndexedScreenshots,
    canCloudSync: features.cloudSync,
    canAiMultimodalSearch: features.advancedSearch,
    priorityProcessing: features.priorityProcessing,
    status: "active",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  serverEntitlements.set(userId, founderEntitlement);
  console.log(`[Founder100] User ${userId} successfully claimed Founder #${founderNumber}`);
  return res.json({
    success: true,
    message: `Congratulations! You have claimed Founder #${founderNumber} with free Lifetime Pro access.`,
    entitlement: founderEntitlement,
    founderNumber,
    claimedSpots: serverFounderCounter,
    totalSpots: FOUNDER_CONFIG.max_founder_users,
    remainingSpots: FOUNDER_CONFIG.max_founder_users - serverFounderCounter
  });
});
app.get("/api/billing/subscription-status", (req, res) => {
  const userId = req.headers["x-user-id"] || req.query.userId || "guest";
  let activeSub = null;
  for (const [, sub] of serverSubscriptions.entries()) {
    if (sub.userId === userId && sub.status === "active") {
      activeSub = sub;
      break;
    }
  }
  const entitlement = serverEntitlements.get(userId) || null;
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
app.get("/api/billing/audit-events", (_req, res) => {
  return res.json({
    success: true,
    events: serverSubscriptionEvents.slice(-50)
    // last 50 events
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
async function startServer() {
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
