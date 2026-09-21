/**
 * SnapFind AI - Accent Theme System
 * 
 * Provides centralized dynamic styling tokens for the 5 interface accent tones:
 * 1. Electric Blue (#3B82F6)
 * 2. Deep Indigo (#6366F1)
 * 3. Cyber Purple (#A855F7)
 * 4. Emerald Mint (#10B981)
 * 5. Amber Sun (#F59E0B)
 * 
 * Updates CSS variables dynamically on :root so buttons, active tabs,
 * sidebar states, rings, borders, and badges seamlessly update while
 * preserving SnapFind's premium dark canvas identity (#07090D).
 */

export type AccentToneId = "blue" | "indigo" | "purple" | "emerald" | "amber";

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
  blue: {
    id: "blue",
    label: "Electric Blue",
    name: "Electric Blue",
    primary: "#3B82F6",
    hover: "#2563EB",
    soft: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.35)",
    glow: "rgba(59, 130, 246, 0.25)",
    text: "#60A5FA",
    ring: "rgba(59, 130, 246, 0.45)",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    badgeText: "#93C5FD",
  },
  indigo: {
    id: "indigo",
    label: "Deep Indigo",
    name: "Deep Indigo",
    primary: "#6366F1",
    hover: "#4F46E5",
    soft: "rgba(99, 102, 241, 0.12)",
    border: "rgba(99, 102, 241, 0.35)",
    glow: "rgba(99, 102, 241, 0.25)",
    text: "#818CF8",
    ring: "rgba(99, 102, 241, 0.45)",
    badgeBg: "rgba(99, 102, 241, 0.15)",
    badgeText: "#A5B4FC",
  },
  purple: {
    id: "purple",
    label: "Cyber Purple",
    name: "Cyber Purple",
    primary: "#A855F7",
    hover: "#9333EA",
    soft: "rgba(168, 85, 247, 0.12)",
    border: "rgba(168, 85, 247, 0.35)",
    glow: "rgba(168, 85, 247, 0.25)",
    text: "#C084FC",
    ring: "rgba(168, 85, 247, 0.45)",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    badgeText: "#D8B4FE",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Mint",
    name: "Emerald Mint",
    primary: "#10B981",
    hover: "#059669",
    soft: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
    glow: "rgba(16, 185, 129, 0.25)",
    text: "#34D399",
    ring: "rgba(16, 185, 129, 0.45)",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeText: "#6EE7B7",
  },
  amber: {
    id: "amber",
    label: "Amber Sun",
    name: "Amber Sun",
    primary: "#F59E0B",
    hover: "#D97706",
    soft: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
    glow: "rgba(245, 158, 11, 0.25)",
    text: "#FBBF24",
    ring: "rgba(245, 158, 11, 0.45)",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeText: "#FCD34D",
  },
};

const ACCENT_STORAGE_KEY = "snapfind_accent_tone_v1";

/**
 * Apply accent variables directly to document.documentElement
 */
export function applyAccentTheme(accentId: AccentToneId = "blue"): void {
  if (typeof document === "undefined") return;

  const theme = ACCENT_THEMES[accentId] || ACCENT_THEMES.blue;
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
  if (typeof localStorage === "undefined") return "blue";
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentToneId;
    if (stored && ACCENT_THEMES[stored]) {
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return "blue";
}
