/**
 * Utility to compute SHA-256 hex digest for images (base64 string, File, Blob, or ArrayBuffer)
 */
export async function computeImageSha256(
  input: string | File | Blob | ArrayBuffer
): Promise<string> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else if (typeof File !== "undefined" && input instanceof File) {
      arrayBuffer = await input.arrayBuffer();
    } else if (typeof Blob !== "undefined" && input instanceof Blob) {
      arrayBuffer = await input.arrayBuffer();
    } else if (typeof input === "string") {
      if (input.startsWith("data:")) {
        // Extract base64 payload
        const commaIdx = input.indexOf(",");
        const base64Str = commaIdx !== -1 ? input.slice(commaIdx + 1) : input;
        const binaryStr = atob(base64Str);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else if (input.startsWith("http://") || input.startsWith("https://") || input.startsWith("blob:")) {
        const response = await fetch(input);
        const blob = await response.blob();
        arrayBuffer = await blob.arrayBuffer();
      } else {
        // Plain string fallback
        const encoder = new TextEncoder();
        arrayBuffer = encoder.encode(input).buffer;
      }
    } else {
      throw new Error("Unsupported input type for SHA-256 hashing");
    }

    const digestBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(digestBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  } catch (err) {
    console.warn("[hashUtils] SHA-256 computation warning:", err);
    // Fallback pseudo-hash based on string representation
    const str = typeof input === "string" ? input : (input as any).name || String(Date.now());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `fallback_${Math.abs(hash).toString(16)}`;
  }
}
