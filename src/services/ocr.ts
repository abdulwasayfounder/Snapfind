import { createWorker } from "tesseract.js";

export interface OCRResult {
  success: boolean;
  text: string;
  ocrText?: string;
  confidence: number;
  lines: string[];
  words: string[];
  provider: string;
}

/**
 * Singleton OCR Worker Manager
 * Reuses a single Tesseract worker across all image scans instead of re-instantiating,
 * eliminating 2-3s of worker spin-up & termination overhead per image.
 */
class OCRWorkerManager {
  private workerPromise: Promise<any> | null = null;
  private workerInstance: any = null;
  private queue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * Get or initialize the persistent Tesseract worker singleton
   */
  public async getWorker(): Promise<any> {
    if (this.workerInstance) {
      return this.workerInstance;
    }

    if (!this.workerPromise) {
      this.workerPromise = (async () => {
        try {
          console.log("[OCRWorkerManager] Initializing persistent Tesseract OCR worker singleton...");
          const worker = await createWorker("eng");
          this.workerInstance = worker;
          return worker;
        } catch (err) {
          console.error("[OCRWorkerManager] Failed to initialize persistent worker:", err);
          this.workerPromise = null;
          throw err;
        }
      })();
    }

    return this.workerPromise;
  }

  /**
   * Pre-warm the persistent OCR worker in the background on app launch
   */
  public preloadWorker(): void {
    if (typeof window !== "undefined" && !this.workerPromise && !this.workerInstance) {
      this.getWorker().catch((e) => {
        console.warn("[OCRWorkerManager] Background preload warning:", e);
      });
    }
  }

  /**
   * Run OCR recognition with concurrency mutex through the shared worker
   */
  public async recognize(
    imageSource: string | File | Blob,
    onProgress?: (progress: number, status: string) => void
  ): Promise<OCRResult> {
    return new Promise<OCRResult>((resolve, reject) => {
      const task = async () => {
        try {
          if (onProgress) onProgress(15, "Accessing persistent OCR Engine...");
          const worker = await this.getWorker();

          if (onProgress) onProgress(45, "Scanning text on image...");
          const ret = await worker.recognize(imageSource);

          if (onProgress) onProgress(90, "Formatting extracted text...");
          const rawText = ret.data?.text || "";
          const cleanText = rawText.trim();
          const confidence = ret.data?.confidence || 0;
          const lines = cleanText.split("\n").filter((l: string) => l.trim().length > 0);
          const words = cleanText.split(/\s+/).filter((w: string) => w.trim().length > 0);

          resolve({
            success: true,
            text: cleanText,
            ocrText: cleanText,
            confidence: Math.round(confidence),
            lines,
            words,
            provider: "Tesseract.js (Persistent Singleton)",
          });
        } catch (err: any) {
          console.error("[OCRWorkerManager] Recognize error:", err);
          // If worker crashed, reset instance
          this.workerInstance = null;
          this.workerPromise = null;
          resolve({
            success: false,
            text: "",
            ocrText: "",
            confidence: 0,
            lines: [],
            words: [],
            provider: "Tesseract.js (Fallback)",
          });
        }
      };

      this.queue.push(task);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        try {
          await nextTask();
        } catch (e) {
          console.error("[OCRWorkerManager] Queue task execution error:", e);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  public async terminate(): Promise<void> {
    if (this.workerInstance) {
      try {
        await this.workerInstance.terminate();
      } catch {}
      this.workerInstance = null;
      this.workerPromise = null;
    }
  }
}

export const ocrWorkerManager = new OCRWorkerManager();

/**
 * Free client-side OCR text extraction using reusable persistent Tesseract worker
 */
export async function extractTextClientOCR(
  imageSource: string | File | Blob,
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  return ocrWorkerManager.recognize(imageSource, onProgress);
}

/**
 * Extract OCR text via Server API (combines free OCR & Vision model)
 */
export async function extractTextServerOCR(
  base64Data: string,
  fileName: string = "screenshot.png"
): Promise<OCRResult> {
  try {
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Data, fileName }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    const extractedText = (data.ocrText || data.text || "").trim();

    return {
      success: true,
      text: extractedText,
      ocrText: extractedText,
      confidence: data.confidence || 95,
      lines: extractedText.split("\n").filter((l: string) => l.trim()),
      words: extractedText.split(/\s+/).filter((w: string) => w.trim()),
      provider: data.provider || "Free Server Vision OCR",
    };
  } catch (error: any) {
    console.warn("Server OCR error, falling back to persistent Tesseract client OCR:", error);
    return extractTextClientOCR(base64Data);
  }
}

