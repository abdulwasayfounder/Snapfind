/**
 * SnapFind AI - Centralized Design Tokens & Color System
 *
 * Design Direction: Premium Graphite + Electric Cyan
 * - Main background: #101214
 * - Sidebar: #171A1D
 * - Cards and elevated surfaces: #1E2226
 * - Borders: #30363D
 * - Primary accent: #00D4FF
 * - Hover accent: #00B8D9
 * - Primary text: #F5F7FA
 * - Secondary text: #A7B0BA
 * - Success: #22C55E
 * - Warning: #F59E0B
 * - Error: #EF4444
 */

export const SnapFindTokens = {
  colors: {
    bg: "#101214",
    surface: "#171A1D",
    surfaceElevated: "#1E2226",
    surfaceHover: "#262C32",
    border: "#30363D",
    borderHover: "#00D4FF",

    // Primary Electric Cyan Accents
    primary: "#00D4FF",
    primaryHover: "#00B8D9",
    primaryLight: "#33DDFF",
    secondary: "#00D4FF",
    secondaryHover: "#00B8D9",
    accent: "#00D4FF",
    accentHover: "#00B8D9",

    // Semantic States
    ai: "#00D4FF",
    aiHover: "#00B8D9",
    aiNeon: "#00D4FF",
    success: "#22C55E",
    warning: "#F59E0B",
    attention: "#F59E0B",
    highlight: "#00D4FF",
    error: "#EF4444",
    danger: "#EF4444",

    // Typography
    textPrimary: "#F5F7FA",
    textSecondary: "#A7B0BA",
    textMuted: "#6B7280",
    textDisabled: "#4B5563",
  },
  gradients: {
    // Solid & subtle dark surfaces (eliminating cheap purple/pink glows)
    primary: "linear-gradient(180deg, #1E2226 0%, #171A1D 100%)",
    ai: "linear-gradient(180deg, #1E2226 0%, #171A1D 100%)",
    aiSubtle: "linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.02) 100%)",
    cardGlow: "none",
  },
  shadows: {
    primary: "0 2px 8px rgba(0, 212, 255, 0.15)",
    card: "0 4px 12px rgba(0, 0, 0, 0.4)",
    elevated: "0 8px 24px rgba(0, 0, 0, 0.6)",
  },
} as const;

export default SnapFindTokens;
