import jsQR from "jsqr";

export interface DecodedQRResult {
  hasQrCode: boolean;
  qrCodeData: string | null;
  qrCodeType: "URL" | "TEXT" | "EMAIL" | "PHONE" | "WIFI" | "VCARD" | "SMS" | "GEO" | "OTHER";
  qrUrl: string | null;
}

export interface ExtractedWebsiteInfo {
  websiteName?: string;
  websiteDomain?: string;
  websiteUrl?: string;
  detectedUrls: string[];
}

/**
 * Classify decoded QR code payload string into appropriate type and safe URL
 */
export function classifyQrPayload(data: string): {
  type: "URL" | "TEXT" | "EMAIL" | "PHONE" | "WIFI" | "VCARD" | "SMS" | "GEO" | "OTHER";
  url: string | null;
} {
  if (!data || !data.trim()) {
    return { type: "OTHER", url: null };
  }

  const trimmed = data.trim();

  // 1. Explicit URL pattern
  if (/^https?:\/\/[^\s]+/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return { type: "URL", url: trimmed };
      }
    } catch {}
  }

  // Common web prefixes without explicit protocol (e.g. www.example.com)
  if (/^(?:www\.)[a-z0-9-]+(\.[a-z0-9-]+)+[^\s]*/i.test(trimmed)) {
    const withProto = `https://${trimmed}`;
    try {
      new URL(withProto);
      return { type: "URL", url: withProto };
    } catch {}
  }

  // 2. WiFi pattern (WIFI:S:Network;T:WPA;P:Password;;)
  if (/^WIFI:/i.test(trimmed)) {
    return { type: "WIFI", url: null };
  }

  // 3. vCard / Contact pattern
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    return { type: "VCARD", url: null };
  }

  // 4. Email pattern
  if (/^mailto:/i.test(trimmed)) {
    return { type: "EMAIL", url: trimmed };
  }
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return { type: "EMAIL", url: `mailto:${trimmed}` };
  }

  // 5. Phone pattern
  if (/^tel:/i.test(trimmed)) {
    return { type: "PHONE", url: trimmed };
  }
  if (/^(\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}$/.test(trimmed)) {
    return { type: "PHONE", url: `tel:${trimmed.replace(/\s+/g, "")}` };
  }

  // 6. SMS pattern
  if (/^smsto:/i.test(trimmed) || /^sms:/i.test(trimmed)) {
    return { type: "SMS", url: trimmed };
  }

  // 7. Geolocation pattern
  if (/^geo:/i.test(trimmed)) {
    return { type: "GEO", url: trimmed };
  }

  return { type: "TEXT", url: null };
}

/**
 * Decode QR Code from Base64 or Image Source in browser environment
 * Uses native BarcodeDetector API if available, falling back to jsQR
 */
export async function decodeQrFromImage(imageSource: string): Promise<DecodedQRResult> {
  if (typeof window === "undefined" || !imageSource) {
    return {
      hasQrCode: false,
      qrCodeData: null,
      qrCodeType: "OTHER",
      qrUrl: null,
    };
  }

  return new Promise<DecodedQRResult>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = async () => {
        try {
          // 1. Try native BarcodeDetector API if supported (fast, hardware-accelerated)
          if (typeof window !== "undefined" && "BarcodeDetector" in window) {
            try {
              const BarcodeDetectorClass = (window as any).BarcodeDetector;
              const supportedFormats: string[] = await BarcodeDetectorClass.getSupportedFormats();
              if (supportedFormats.includes("qr_code")) {
                const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
                const barcodes = await detector.detect(img);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  const rawVal = barcodes[0].rawValue.trim();
                  const { type, url } = classifyQrPayload(rawVal);
                  resolve({
                    hasQrCode: true,
                    qrCodeData: rawVal,
                    qrCodeType: type,
                    qrUrl: url,
                  });
                  return;
                }
              }
            } catch (detectorErr) {
              // Graceful fallback to jsQR canvas decode
            }
          }

          // 2. jsQR Canvas Decode fallback
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve({ hasQrCode: false, qrCodeData: null, qrCodeType: "OTHER", qrUrl: null });
            return;
          }

          // Bound dimension to max 1200px for optimal speed and QR fidelity
          const maxDim = 1200;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data && code.data.trim().length > 0) {
            const { type, url } = classifyQrPayload(code.data);
            resolve({
              hasQrCode: true,
              qrCodeData: code.data,
              qrCodeType: type,
              qrUrl: url,
            });
            return;
          }

          resolve({
            hasQrCode: false,
            qrCodeData: null,
            qrCodeType: "OTHER",
            qrUrl: null,
          });
        } catch {
          resolve({
            hasQrCode: false,
            qrCodeData: null,
            qrCodeType: "OTHER",
            qrUrl: null,
          });
        }
      };

      img.onerror = () => {
        resolve({
          hasQrCode: false,
          qrCodeData: null,
          qrCodeType: "OTHER",
          qrUrl: null,
        });
      };

      img.src = imageSource;
    } catch {
      resolve({
        hasQrCode: false,
        qrCodeData: null,
        qrCodeType: "OTHER",
        qrUrl: null,
      });
    }
  });
}

/**
 * File extensions and abbreviations to avoid falsely detecting as domains
 */
const BANNED_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "css", "json", "png", "jpg", "jpeg", "gif", "svg", "webp",
  "py", "java", "cpp", "c", "h", "rs", "go", "rb", "php", "md", "sql", "html", "xml",
  "zip", "tar", "gz", "pdf", "doc", "docx", "xls", "xlsx", "mp4", "mp3", "wav", "m4a"
]);

const BANNED_WORDS = new Set(["e.g", "i.e", "etc", "vs", "fig", "ref", "v1", "v2", "v3"]);

/**
 * Extract URLs and Website Information from OCR and metadata text
 */
export function extractWebsitesFromText(text: string): ExtractedWebsiteInfo {
  if (!text || !text.trim()) {
    return { detectedUrls: [] };
  }

  // 1. Match full explicit URLs
  const urlRegex = /(?:https?:\/\/|www\.)[a-zA-Z0-9][-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
  const rawMatches = text.match(urlRegex) || [];

  // 2. Match recognizable domain mentions
  const domainRegex = /\b([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:com|org|net|edu|gov|io|ai|co|app|dev|me|info|tv|tech|so|to|gg|cc|pk|uk|de|ca|au|in))\b/gi;
  const rawDomains = text.match(domainRegex) || [];

  const candidateUrls: string[] = [];

  const sanitizeUrl = (str: string): string => {
    let clean = str.trim();
    // Strip trailing punctuation often adjacent to URLs in OCR text
    clean = clean.replace(/[.,;:!?)>\]"']+$/, "");
    // Strip leading punctuation
    clean = clean.replace(/^[<(\["']+/, "");
    return clean;
  };

  rawMatches.forEach((m) => {
    const clean = sanitizeUrl(m);
    if (!clean) return;

    // Check banned extensions unless explicit http
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      const ext = clean.split(".").pop()?.toLowerCase();
      if (ext && BANNED_EXTENSIONS.has(ext)) return;
    }

    const normalized = clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;

    try {
      const parsed = new URL(normalized);
      if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".")) {
        if (!candidateUrls.includes(normalized)) {
          candidateUrls.push(normalized);
        }
      }
    } catch {}
  });

  rawDomains.forEach((d) => {
    const clean = sanitizeUrl(d).toLowerCase();
    if (!clean || BANNED_WORDS.has(clean)) return;

    const ext = clean.split(".").pop()?.toLowerCase();
    if (ext && BANNED_EXTENSIONS.has(ext)) return;

    const normalized = `https://${clean}`;
    try {
      const parsed = new URL(normalized);
      if (!candidateUrls.some((u) => u.toLowerCase().includes(parsed.hostname.toLowerCase()))) {
        candidateUrls.push(normalized);
      }
    } catch {}
  });

  if (candidateUrls.length === 0) {
    return { detectedUrls: [] };
  }

  // Derive primary domain & name
  let primaryDomain: string | undefined;
  let primaryName: string | undefined;
  const firstUrl = candidateUrls[0];

  try {
    const urlObj = new URL(firstUrl);
    primaryDomain = urlObj.hostname.replace(/^www\./i, "");

    // Friendly brand naming for popular sites
    const domainLower = primaryDomain.toLowerCase();
    if (domainLower.includes("amazon")) primaryName = "Amazon";
    else if (domainLower.includes("daraz")) primaryName = "Daraz";
    else if (domainLower.includes("youtube") || domainLower.includes("youtu.be")) primaryName = "YouTube";
    else if (domainLower.includes("github")) primaryName = "GitHub";
    else if (domainLower.includes("google")) primaryName = "Google";
    else if (domainLower.includes("instagram")) primaryName = "Instagram";
    else if (domainLower.includes("facebook") || domainLower.includes("fb.com")) primaryName = "Facebook";
    else if (domainLower.includes("twitter") || domainLower.includes("x.com")) primaryName = "X (Twitter)";
    else if (domainLower.includes("linkedin")) primaryName = "LinkedIn";
    else if (domainLower.includes("wikipedia")) primaryName = "Wikipedia";
    else if (domainLower.includes("notion")) primaryName = "Notion";
    else if (domainLower.includes("stripe")) primaryName = "Stripe";
    else if (domainLower.includes("figma")) primaryName = "Figma";
    else if (domainLower.includes("slack")) primaryName = "Slack";
    else if (domainLower.includes("openai")) primaryName = "OpenAI";
    else {
      const seg = primaryDomain.split(".")[0];
      primaryName = seg.charAt(0).toUpperCase() + seg.slice(1);
    }
  } catch {
    primaryDomain = firstUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  }

  return {
    websiteName: primaryName,
    websiteDomain: primaryDomain,
    websiteUrl: firstUrl,
    detectedUrls: candidateUrls,
  };
}
