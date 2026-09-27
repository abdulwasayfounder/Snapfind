import { NavViewType } from "../components/BottomNavigation";

interface PageSeoConfig {
  title: string;
  description: string;
  isPublic: boolean;
}

const VIEW_SEO_CONFIG: Record<NavViewType, PageSeoConfig> = {
  landing: {
    title: "SnapFind AI – AI Screenshot Search",
    description: "Search, organize and protect your screenshots with SnapFind AI.",
    isPublic: true,
  },
  pricing: {
    title: "Plans & Pricing – SnapFind AI",
    description: "Upgrade to SnapFind Pro for unlimited screenshot indexing, instant OCR search, and multi-device sync.",
    isPublic: true,
  },
  founders: {
    title: "Founders Lifetime Access – SnapFind AI",
    description: "Claim lifetime access to SnapFind AI. Zero subscriptions, premium indexing quota, and founding member perks.",
    isPublic: true,
  },
  game: {
    title: "SnapDash Speed Challenge – SnapFind AI",
    description: "Test your visual memory skills with SnapDash, the official SnapFind interactive challenge.",
    isPublic: true,
  },
  dashboard: {
    title: "Dashboard – SnapFind AI",
    description: "Manage your indexed visual memory library.",
    isPublic: false,
  },
  collections: {
    title: "Collections & Vault – SnapFind AI",
    description: "Organize screenshots into collections.",
    isPublic: false,
  },
  timeline: {
    title: "Visual Timeline – SnapFind AI",
    description: "Browse screenshots chronologically.",
    isPublic: false,
  },
  favorites: {
    title: "Favorites – SnapFind AI",
    description: "View your saved screenshots.",
    isPublic: false,
  },
  trash: {
    title: "Trash – SnapFind AI",
    description: "Manage deleted screenshots.",
    isPublic: false,
  },
  gallery: {
    title: "Gallery – SnapFind AI",
    description: "Browse your screenshot library.",
    isPublic: false,
  },
  search: {
    title: "AI Search – SnapFind AI",
    description: "Search across your indexed screenshots.",
    isPublic: false,
  },
  import: {
    title: "Import Screenshots – SnapFind AI",
    description: "Upload and index new screenshots.",
    isPublic: false,
  },
  history: {
    title: "Search History – SnapFind AI",
    description: "View previous search queries.",
    isPublic: false,
  },
  settings: {
    title: "Settings – SnapFind AI",
    description: "Configure app preferences and local storage.",
    isPublic: false,
  },
  account: {
    title: "My Account – SnapFind AI",
    description: "Manage subscription and profile settings.",
    isPublic: false,
  },
  notifications: {
    title: "Notifications – SnapFind AI",
    description: "View system alerts and indexing status.",
    isPublic: false,
  },
  feedback: {
    title: "Give Feedback – SnapFind AI",
    description: "Share feedback with the SnapFind team.",
    isPublic: false,
  },
  "admin-payments": {
    title: "Admin – SnapFind AI",
    description: "Administration portal.",
    isPublic: false,
  },
};

/**
 * Updates dynamic SEO metadata for the current view.
 * Ensures strict privacy:
 * - Public views receive "index, follow"
 * - Private / authenticated views receive "noindex, nofollow"
 * - Never includes private user OCR data or screenshot titles in metadata
 */
export function applySeoMetadata(view: NavViewType) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const config = VIEW_SEO_CONFIG[view] || VIEW_SEO_CONFIG.landing;

  // 1. Update Document Title
  document.title = config.title;

  // 2. Update Robots Meta Tag (Critical protection for private vs public pages)
  let robotsMeta = document.getElementById("sf-robots") as HTMLMetaElement | null;
  if (!robotsMeta) {
    robotsMeta = document.createElement("meta");
    robotsMeta.id = "sf-robots";
    robotsMeta.name = "robots";
    document.head.appendChild(robotsMeta);
  }
  robotsMeta.content = config.isPublic ? "index, follow" : "noindex, nofollow";

  // 3. Update Meta Description
  let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (descMeta) {
    descMeta.content = config.description;
  }

  // 4. Update OpenGraph and Twitter Metadata
  const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
  if (ogTitle) ogTitle.content = config.title;

  const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
  if (ogDesc) ogDesc.content = config.description;

  const twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null;
  if (twTitle) twTitle.content = config.title;

  const twDesc = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null;
  if (twDesc) twDesc.content = config.description;

  // 5. Update Canonical URL dynamically to reflect actual origin without breaking
  const origin = window.location.origin || "https://ais-pre-2ztufua4tcuizbkzpm5xi4-438233974581.asia-east1.run.app";
  let canonicalLink = document.getElementById("sf-canonical") as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.querySelector('link[rel="canonical"]');
  }
  if (canonicalLink) {
    // Canonical points to the canonical base for public marketing and specific public hash routes
    if (view === "landing") {
      canonicalLink.href = `${origin}/`;
    } else if (config.isPublic) {
      canonicalLink.href = `${origin}/#${view}`;
    } else {
      // For private views, canonical points to the root so search engines attribute authority to the root
      canonicalLink.href = `${origin}/`;
    }
  }
}
