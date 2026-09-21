# SnapFind AI — Modular Vision & Natural Language Screenshot Indexing Engine

SnapFind AI is an intelligent visual indexing and natural language search engine designed to automatically OCR, index, and organize user screenshots (passports, recipes, utility bills, QR codes, receipts, admission letters, shopping carts, etc.).

---

## 🏗️ Project Architecture Overview

```
snapfind-ai/
├── server.ts                    # Server-side Express API proxy with Gemini 3.6 Vision multimodal integration
├── src/
│   ├── main.tsx                 # Client application entry point
│   ├── App.tsx                  # Core layout manager, view state router, search dispatcher
│   ├── types.ts                 # Strongly typed TypeScript interfaces for screenshots, categories, and searches
│   ├── index.css                # Global Tailwind CSS styling rules
│   ├── data/
│   │   └── sampleScreenshots.ts # Sample realistic screenshot datasets (Passports, Bills, Recipes, QR Codes, etc.)
│   ├── services/
│   │   ├── api.ts               # Vision OCR extraction API client & natural language search fallback
│   │   └── storage.ts           # Local storage cache, user profile, settings persistence layer
│   └── components/
│       ├── Navbar.tsx           # Premium Apple/Notion-inspired top navigation bar
│       ├── SidebarNavigation.tsx# Category facets, navigation views & engine status drawer
│       ├── SearchBar.tsx        # Natural language query input with suggestion pills
│       ├── ScreenshotGrid.tsx   # Responsive screenshot gallery grid & match score ranking
│       ├── ScreenshotCard.tsx   # Individual screenshot card with match percentage & copy actions
│       ├── ImageViewerModal.tsx # High-resolution lightbox inspector with deep OCR text viewer
│       ├── BatchImporter.tsx    # Drag-and-drop batch upload and auto-OCR processing queue
│       ├── SearchHistoryView.tsx# Recent queries log with instant re-execution
│       ├── SettingsView.tsx     # Theme toggle, OCR model selection, storage stats, system reset
│       ├── AuthModal.tsx        # User authentication and subscription profile modal
│       ├── NotificationCenter.tsx# Floating real-time toast notification system
│       └── StatsOverview.tsx    # High-level analytics cards for indexed content
├── package.json                 # Project dependencies and build scripts
├── metadata.json                # Application metadata configuration
└── README.md                    # System architectural documentation
```

---

## 📁 Directory Breakdown

- **`/server.ts`**: Express backend server handling secure server-side Gemini 3.6 Flash multimodal API requests for OCR text extraction, structured entity parsing, and semantic search ranking.
- **`/src/types.ts`**: Shared TypeScript contracts defining `ScreenshotItem`, `SearchResultMatch`, `SearchHistoryItem`, `CategoryType`, and `AppSettings`.
- **`/src/data/`**: Rich preset datasets powering zero-configuration sample screenshot indexing.
- **`/src/services/`**: API wrapper services and resilient local persistence handlers.
- **`/src/components/`**: Clean, modular React components built with Tailwind CSS, Lucide icons, and Motion animations following Apple and Notion aesthetic guidelines.

---

## 🛠️ Version 1 Feature Roadmap

1. **Authentication & User Profile**: Pro subscription status, storage limits, and user state.
2. **Gallery Permission & Import**: Drag-and-drop batch upload with real-time processing queues.
3. **Automatic Detection**: Categorizes content into Passports, Bills, Recipes, QR Codes, Admissions, and E-Commerce.
4. **Multimodal OCR & Vision AI**: Powered by server-side `gemini-3.6-flash`.
5. **Natural Language Search**: "Find my passport", "Find electricity bill", "Find QR code", "Find recipe".
6. **Deep Inspector & Copy**: Lightbox view with zoom control and line-by-line raw OCR copy buttons.

---

## 🚀 Getting Started

1. Start development server:
   ```bash
   npm run dev
   ```
2. Build for production:
   ```bash
   npm run build
   ```
3. Start production server:
   ```bash
   npm run start
   ```
