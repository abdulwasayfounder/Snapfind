# Testing & QA Verification Guide - SnapFind

## Testing Framework & Methodology

### 1. Functional Suite
- **Single & Batch Screenshot Import**: Upload multiple sample images (Passports, Utility Bills, Receipts, Recipes, Wi-Fi QR Codes).
- **OCR Text Extraction**: Verify both server-side Vision OCR (`/api/ocr`) and client-side Tesseract.js fallback when offline.
- **Natural Language Search Queries**:
  - *"Find my passport expiry date"*
  - *"Find electricity bill due amount"*
  - *"Find carbonara recipe ingredients"*
  - *"Find Wi-Fi router password"*
- **Search History & Recents**: Test query persistence, click-to-search, and clear history actions.
- **Pagination Controls**: Test 6, 12, 24, 48 items per page, prev/next pagination, and page numbers.

### 2. Edge Case & Failure Testing
- **Corrupt File Upload**: Upload non-image files or corrupted base64 images; verify error toast notifications.
- **Offline Network Mode**: Toggle DevTools Network to "Offline" to trigger `OfflineBanner` and ensure Tesseract client OCR works seamlessly.
- **Image Load Failures**: Verify broken image URLs trigger fallback SVG placeholders (`FALLBACK_IMAGE_PLACEHOLDER`).
- **UI Error Isolation**: Test `ErrorBoundary` component when unexpected render errors occur.

### 3. Command Line Verification
```bash
# Type check and syntax verification
npm run lint

# Production build verification
npm run build
```
