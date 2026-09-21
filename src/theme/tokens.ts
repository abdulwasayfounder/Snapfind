/**
 * SnapFind AI - Centralized Design Tokens & Vibrant Premium Color System
 *
 * Palette Archetype:
 * - Primary: Electric Violet / Indigo (#6366F1 / #7C3AED / #818CF8)
 * - Secondary: Cyan / Aqua (#06B6D4 / #22D3EE / #00F5FF)
 * - Accent: Magenta / Pink (#EC4899 / #F43F5E)
 * - Success / Indexed: Emerald (#10B981 / #00FF66)
 * - Warning / Attention: Amber (#F59E0B / #FFB800)
 * - Danger / Error: Vibrant Red (#EF4444 / #FF0000)
 * - Dark Canvas: Obsidian Charcoal (#07090E)
 * - Dark Surface: Graphite (#0D111A)
 * - Elevated Surface: Deep Slate (#131924)
 * - Primary Text: Crisp White (#F8FAFC)
 * - Secondary Text: Cool Slate (#94A3B8)
 * - Muted Text: Deep Slate (#64748B)
 * - Border: rgba(255, 255, 255, 0.08)
 */

export const SnapFindTokens = {
  colors: {
    bg: "#07090E",
    surface: "#0D111A",
    surfaceElevated: "#131924",
    surfaceHover: "#1A2232",
    border: "rgba(255, 255, 255, 0.08)",
    borderHover: "rgba(99, 102, 241, 0.4)",

    // Vibrant Brand Accents
    primary: "#6366F1", // Electric Violet
    primaryHover: "#7C3AED",
    primaryLight: "#818CF8",
    secondary: "#06B6D4", // Cyan / Aqua
    secondaryHover: "#22D3EE",
    accent: "#EC4899", // Magenta / Pink
    accentHover: "#F43F5E",
    ai: "#10B981", // Emerald AI
    aiHover: "#34D399",
    aiNeon: "#00FF66",
    attention: "#F59E0B", // Amber
    highlight: "#FBBF24",
    danger: "#EF4444", // Red

    // Typography
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    textDisabled: "#475569",
  },
  gradients: {
    primary: "linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)",
    ai: "linear-gradient(135deg, #6366F1 0%, #10B981 100%)",
    aiSubtle: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)",
    magentaCyan: "linear-gradient(135deg, #EC4899 0%, #06B6D4 100%)",
    speed: "linear-gradient(90deg, #EC4899 0%, #6366F1 50%, #06B6D4 100%)",
    discovery: "linear-gradient(135deg, #F59E0B 0%, #6366F1 100%)",
    crown: "linear-gradient(135deg, #FBBF24 0%, #EC4899 100%)",
    cardGlow: "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)",
  },
  shadows: {
    primary: "0 4px 20px -2px rgba(99, 102, 241, 0.35)",
    secondary: "0 4px 20px -2px rgba(6, 182, 212, 0.35)",
    ai: "0 4px 20px -2px rgba(16, 185, 129, 0.3)",
    attention: "0 4px 16px -2px rgba(245, 158, 11, 0.35)",
    card: "0 8px 32px -8px rgba(0, 0, 0, 0.6)",
  },
} as const;

export default SnapFindTokens;
