/**
 * In-memory image caching & preloading utility to optimize rendering performance
 */

const imageCache = new Map<string, HTMLImageElement>();
const failedUrls = new Set<string>();

export const FALLBACK_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' fill='%230f172a'><rect width='400' height='300' fill='%230f172a'/><path d='M150 120 h100 v60 h-100 z' fill='%231e293b'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='14'>Screenshot Preview</text></svg>";

/**
 * Preload an array of image URLs into memory cache
 */
export function preloadImages(urls: string[]): void {
  urls.forEach((url) => {
    if (!url || imageCache.has(url) || failedUrls.has(url)) return;

    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
    };
    img.onerror = () => {
      failedUrls.add(url);
    };
    img.src = url;
  });
}

/**
 * Check if image URL is marked as failed
 */
export function isImageFailed(url: string): boolean {
  return failedUrls.has(url);
}

/**
 * Mark an image URL as failed
 */
export function markImageFailed(url: string): void {
  failedUrls.add(url);
}

/**
 * Get cached image element if present
 */
export function getCachedImage(url: string): HTMLImageElement | undefined {
  return imageCache.get(url);
}
