# Bug & Quality Assurance Checklist - SnapFind

## Pre-Release QA Checklist

- [x] **No Hardcoded API Keys**: All secrets are retrieved via `process.env.GEMINI_API_KEY`.
- [x] **Client-Side Security**: No `VITE_` prefix on server keys; all Gemini Vision requests routed through `/api/*`.
- [x] **Offline Resilience**: App detects offline status via `useOnlineStatus` and gracefully switches to local Tesseract OCR & cache search.
- [x] **Infinite Render Prevention**: All `useEffect` dependencies use stable primitive values or memoized handlers.
- [x] **Responsive Touch Targets**: All interactive buttons feature standard touch padding (minimum 44px on touch devices).
- [x] **Theme Consistency**: Dark and Light themes validate high-contrast text rendering across all cards and modal dialogues.
- [x] **Image Loading Resilience**: Lazy-loaded image grid with memory cache preloading (`imageCache.ts`) and SVG placeholders on broken URLs.
- [x] **Error Boundary Guard**: Wrap top-level React application in `<ErrorBoundary>` component with one-click recovery options.
- [x] **Storage Budget Safety**: `localStorage` usage guarded with JSON try/catch and reset data utilities.
- [x] **Build & Lint Cleanliness**: `npm run lint` and `npm run build` pass without warnings or type errors.
