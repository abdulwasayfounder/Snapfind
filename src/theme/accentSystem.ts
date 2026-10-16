/**
 * SnapFind AI - Accent Theme System
 *
 * Provides centralized dynamic styling tokens with Electric Cyan as primary default:
 * - Primary accent: #00D4FF
 * - Hover accent: #00B8D9
 * - Surface: #1E2226
 * - Canvas: #101214
 * - Borders: #30363D
 */

export type AccentToneId = "cyan" | "blue" | "emerald" | "amber";

export interface AccentThemeConfig {
  id: AccentToneId;
  label: string;
  name: string;
  primary: string;
  hover: string;
  soft: string;
  border: string;
  glow: string;
  text: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
}

export const ACCENT_THEMES: Record<AccentToneId, AccentThemeConfig> = {
  cyan: {
    id: "cyan",
    label: "Electric Cyan",
    name: "Electric Cyan",
    primary: "#00D4FF",
    hover: "#00B8D9",
    soft: "rgba(0, 212, 255, 0.10)",
    border: "#30363D",
    glow: "rgba(0, 212, 255, 0.15)",
    text: "#00D4FF",
    ring: "rgba(0, 212, 255, 0.40)",
    badgeBg: "rgba(0, 212, 255, 0.12)",
    badgeText: "#00D4FF",
  },
  blue: {
    id: "blue",
    label: "Electric Cyan",
    name: "Electric Cyan",
    primary: "#00D4FF",
    hover: "#00B8D9",
    soft: "rgba(0, 212, 255, 0.10)",
    border: "#30363D",
    glow: "rgba(0, 212, 255, 0.15)",
    text: "#00D4FF",
    ring: "rgba(0, 212, 255, 0.40)",
    badgeBg: "rgba(0, 212, 255, 0.12)",
    badgeText: "#00D4FF",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Mint",
    name: "Emerald Mint",
    primary: "#22C55E",
    hover: "#16A34A",
    soft: "rgba(34, 197, 94, 0.10)",
    border: "#30363D",
    glow: "rgba(34, 197, 94, 0.15)",
    text: "#22C55E",
    ring: "rgba(34, 197, 94, 0.40)",
    badgeBg: "rgba(34, 197, 94, 0.12)",
    badgeText: "#22C55E",
  },
  amber: {
    id: "amber",
    label: "Amber Sun",
    name: "Amber Sun",
    primary: "#F59E0B",
    hover: "#D97706",
    soft: "rgba(245, 158, 11, 0.10)",
    border: "#30363D",
    glow: "rgba(245, 158, 11, 0.15)",
    text: "#F59E0B",
    ring: "rgba(245, 158, 11, 0.40)",
    badgeBg: "rgba(245, 158, 11, 0.12)",
    badgeText: "#F59E0B",
  },
};

const ACCENT_STORAGE_KEY = "snapfind_accent_tone_v2";

/**
 * Apply accent variables directly to document.documentElement
 */
export function applyAccentTheme(accentId: AccentToneId = "cyan"): void {
  if (typeof document === "undefined") return;

  const theme = ACCENT_THEMES[accentId] || ACCENT_THEMES.cyan;
  const root = document.documentElement;

  root.style.setProperty("--accent-primary", theme.primary);
  root.style.setProperty("--accent-hover", theme.hover);
  root.style.setProperty("--accent-soft", theme.soft);
  root.style.setProperty("--accent-border", theme.border);
  root.style.setProperty("--accent-glow", theme.glow);
  root.style.setProperty("--accent-text", theme.text);
  root.style.setProperty("--accent-ring", theme.ring);
  root.style.setProperty("--accent-badge-bg", theme.badgeBg);
  root.style.setProperty("--accent-badge-text", theme.badgeText);

  root.setAttribute("data-accent", theme.id);

  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, theme.id);
  } catch (e) {
    // ignore
  }
}

/**
 * Get currently stored accent tone
 */
export function getStoredAccentTheme(): AccentToneId {
  if (typeof localStorage === "undefined") return "cyan";
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentToneId;
    if (stored && ACCENT_THEMES[stored]) {
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return "cyan";
}
