# Production Deployment Guide - SnapFind

## Overview
SnapFind is a high-performance screenshot indexer and natural language search engine built with React, Vite, Express, and Gemini 3.6 Vision OCR.

## Prerequisites
- Node.js >= 18.x
- NPM >= 9.x
- Environment secret: `GEMINI_API_KEY`

## Deployment Steps

### 1. Environment Configuration
Create a `.env` file in the root directory (or inject via hosting dashboard e.g. Cloud Run, Vercel, Railway):
```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
PORT=3000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Production Build
Run the unified Vite & Esbuild bundle script:
```bash
npm run build
```
This compiles the frontend SPA into `dist/` and bundles the backend server into `dist/server.cjs`.

### 4. Launch Server
```bash
npm start
```
The application runs at `http://localhost:3000`.

## Docker & Containerization (Cloud Run / AWS ECS)

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

## Security & Best Practices
1. **API Key Isolation**: `GEMINI_API_KEY` is kept server-side in `/server.ts` and never leaked to the client browser.
2. **CORS & Compression**: Ensure reverse proxy (Nginx / Cloud Run ingress) enforces HTTPS.
3. **Local Storage Index**: Client-side IndexedDB/localStorage acts as offline cache fallback.
