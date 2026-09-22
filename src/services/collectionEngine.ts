import { CollectionItem, ScreenshotItem } from "../types";
import { getDefaultCollectionForCategory } from "./storage";
import { collectionSecurity, VAULT_COLLECTION_NAME } from "./collectionSecurity";
import { isFinanceOrPaymentScreenshot, isSensitiveScreenshot } from "./smartSnapsClassifier";

const COLLECTIONS_STORAGE_KEY = "snapfind_collections_v1";

// Default preset icons / color accents for standard AI collections
const COLLECTION_PRESETS: Record<string, { icon: string; color: string; description: string }> = {
  "💳 Banking & Payments": {
    icon: "CreditCard",
    color: "from-[#00FF66] to-emerald-700",
    description: "Bank transactions, payment confirmations, transfers, and account statements",
  },
  "🔒 Private & Sensitive": {
    icon: "ShieldAlert",
    color: "from-amber-500 to-rose-700",
    description: "Identity documents, credentials, private messages, and confidential records",
  },
  "🔐 Vault": {
    icon: "Lock",
    color: "from-zinc-700 to-black",
    description: "Encrypted secure vault for strictly protected personal captures",
  },
  "Travel & Identity": {
    icon: "Plane",
    color: "from-blue-500 to-indigo-600",
    description: "Passports, ID cards, flight tickets, and travel itineraries",
  },
  "Utility Bills": {
    icon: "Receipt",
    color: "from-amber-500 to-orange-600",
    description: "Electricity, water, gas bills, and service invoices",
  },
  "Food & Recipes": {
    icon: "Utensils",
    color: "from-emerald-500 to-teal-600",
    description: "Cooking recipes, meal ideas, restaurant menus, and food photos",
  },
  "Education & Passes": {
    icon: "GraduationCap",
    color: "from-purple-500 to-violet-600",
    description: "Certificates, QR event passes, student IDs, and admission cards",
  },
  "Shopping & Receipts": {
    icon: "ShoppingBag",
    color: "from-pink-500 to-rose-600",
    description: "E-Commerce orders, store receipts, purchase invoices",
  },
  "Chats & Messages": {
    icon: "MessageSquare",
    color: "from-cyan-500 to-blue-600",
    description: "Important chat logs, messages, social media conversations",
  },
  "Development & Code": {
    icon: "Code",
    color: "from-slate-600 to-zinc-800",
    description: "Code snippets, terminal logs, developer documentation",
  },
  "Financial Statements": {
    icon: "DollarSign",
    color: "from-green-500 to-emerald-700",
    description: "Bank statements, tax forms, investment reports",
  },
  "Ideas & Notes": {
    icon: "Lightbulb",
    color: "from-yellow-500 to-amber-600",
    description: "Handwritten notes, whiteboards, inspiration, mind maps",
  },
  "General Vault": {
    icon: "Folder",
    color: "from-indigo-600 to-purple-800",
    description: "Unsorted & miscellaneous indexed screenshots",
  },
};

export function loadStoredCollections(): CollectionItem[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse stored collections:", e);
  }
  return [];
}

export function saveStoredCollections(collections: CollectionItem[]): void {
  try {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
  } catch (e) {
    console.warn("Failed to save collections:", e);
  }
}

/**
 * Automatically sync/derive Collections from current Screenshots.
 * Creates new Collection objects for any collectionName found on screenshots,
 * updates cover image and item count, and retains custom collections created by user.
 */
export function deriveAndSyncCollections(
  screenshots: ScreenshotItem[],
  existingCollections: CollectionItem[] = []
): CollectionItem[] {
  const collectionMap = new Map<string, CollectionItem>();

  // 1. Seed existing stored collections
  existingCollections.forEach((col) => {
    collectionMap.set(col.name, {
      ...col,
      itemCount: 0,
    });
  });

  // 2. Scan all screenshots to group and detect automatic AI collection names
  screenshots.forEach((sc) => {
    const name = sc.collectionName || sc.collection || getDefaultCollectionForCategory(sc.category);
    const existing = collectionMap.get(name);

    if (existing) {
      existing.itemCount = (existing.itemCount || 0) + 1;
      if (!existing.coverImageUrl && (sc.imageUrl || sc.thumbnailUri)) {
        existing.coverImageUrl = sc.thumbnailUri || sc.imageUrl;
      }
    } else {
      const preset = COLLECTION_PRESETS[name] || {
        icon: "Folder",
        color: "from-blue-600 to-indigo-700",
        description: `AI Classified collection for ${name}`,
      };

      collectionMap.set(name, {
        id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        description: preset.description,
        coverImageUrl: sc.thumbnailUri || sc.imageUrl,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
        itemCount: 1,
        color: preset.color,
        icon: preset.icon,
      });
    }

    // Auto smart aggregate into "💳 Banking & Payments"
    if (isFinanceOrPaymentScreenshot(sc)) {
      const bankColName = "💳 Banking & Payments";
      const bankCol = collectionMap.get(bankColName);
      if (bankCol) {
        bankCol.itemCount = (bankCol.itemCount || 0) + (name === bankColName ? 0 : 1);
        if (!bankCol.coverImageUrl) bankCol.coverImageUrl = sc.thumbnailUri || sc.imageUrl;
      } else {
        const preset = COLLECTION_PRESETS[bankColName];
        collectionMap.set(bankColName, {
          id: `col_smart_banking`,
          name: bankColName,
          description: preset.description,
          coverImageUrl: sc.thumbnailUri || sc.imageUrl,
          isAiGenerated: true,
          createdAt: new Date().toISOString(),
          itemCount: 1,
          color: preset.color,
          icon: preset.icon,
        });
      }
    }

    // Auto smart aggregate into "🔒 Private & Sensitive"
    if (isSensitiveScreenshot(sc)) {
      const privColName = "🔒 Private & Sensitive";
      const privCol = collectionMap.get(privColName);
      if (privCol) {
        privCol.itemCount = (privCol.itemCount || 0) + (name === privColName ? 0 : 1);
        if (!privCol.coverImageUrl) privCol.coverImageUrl = sc.thumbnailUri || sc.imageUrl;
      } else {
        const preset = COLLECTION_PRESETS[privColName];
        collectionMap.set(privColName, {
          id: `col_smart_private`,
          name: privColName,
          description: preset.description,
          coverImageUrl: sc.thumbnailUri || sc.imageUrl,
          isAiGenerated: true,
          createdAt: new Date().toISOString(),
          itemCount: 1,
          color: preset.color,
          icon: preset.icon,
        });
      }
    }

    // Auto track "🔐 Vault"
    if (sc.in_vault || sc.inVault) {
      const vaultColName = VAULT_COLLECTION_NAME;
      const vaultCol = collectionMap.get(vaultColName);
      if (vaultCol) {
        vaultCol.itemCount = (vaultCol.itemCount || 0) + (name === vaultColName ? 0 : 1);
        if (!vaultCol.coverImageUrl) vaultCol.coverImageUrl = sc.thumbnailUri || sc.imageUrl;
      } else {
        const preset = COLLECTION_PRESETS[vaultColName];
        collectionMap.set(vaultColName, {
          id: `col_smart_vault`,
          name: vaultColName,
          description: preset.description,
          coverImageUrl: sc.thumbnailUri || sc.imageUrl,
          isAiGenerated: true,
          createdAt: new Date().toISOString(),
          itemCount: 1,
          color: preset.color,
          icon: preset.icon,
        });
      }
    }
  });

  // 3. Attach current real-time lock states to each collection
  collectionMap.forEach((col, name) => {
    col.isLocked = collectionSecurity.isCollectionLocked(name);
    col.lockType = collectionSecurity.getCollectionLockType(name);
    col.hasLock = collectionSecurity.hasCollectionLock(name);
  });

  // 4. Ensure cover images are up-to-date with latest screenshot if empty
  collectionMap.forEach((col, name) => {
    if (!col.coverImageUrl || col.coverImageUrl.length === 0) {
      const match = screenshots.find(
        (s) => (s.collectionName || s.collection || getDefaultCollectionForCategory(s.category)) === name
      );
      if (match) {
        col.coverImageUrl = match.thumbnailUri || match.imageUrl;
      }
    }
  });

  const result = Array.from(collectionMap.values());
  saveStoredCollections(result);
  return result;
}

/**
 * Operations:
 */

// 1. Create a custom collection manually
export function createCustomCollection(
  name: string,
  description?: string,
  existingCollections: CollectionItem[] = []
): CollectionItem[] {
  const trimmed = name.trim();
  if (!trimmed) return existingCollections;

  const exists = existingCollections.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return existingCollections;

  const newCol: CollectionItem = {
    id: `col_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    description: description || "Custom user created album collection",
    isAiGenerated: false,
    createdAt: new Date().toISOString(),
    itemCount: 0,
    color: "from-purple-600 to-pink-600",
    icon: "FolderPlus",
  };

  const updated = [newCol, ...existingCollections];
  saveStoredCollections(updated);
  return updated;
}

// 2. Rename Collection
export function renameCollection(
  oldName: string,
  newName: string,
  screenshots: ScreenshotItem[],
  collections: CollectionItem[]
): { updatedScreenshots: ScreenshotItem[]; updatedCollections: CollectionItem[] } {
  const trimmedNew = newName.trim();
  if (!trimmedNew || oldName === trimmedNew) {
    return { updatedScreenshots: screenshots, updatedCollections: collections };
  }

  // Update screenshots
  const updatedScreenshots = screenshots.map((sc) => {
    const currentName = sc.collectionName || sc.collection || getDefaultCollectionForCategory(sc.category);
    if (currentName === oldName) {
      return {
        ...sc,
        collectionName: trimmedNew,
        collection: trimmedNew,
      };
    }
    return sc;
  });

  // Update collections array
  const updatedCollections = collections.map((col) => {
    if (col.name === oldName) {
      return {
        ...col,
        name: trimmedNew,
        updatedAt: new Date().toISOString(),
      };
    }
    return col;
  });

  const synced = deriveAndSyncCollections(updatedScreenshots, updatedCollections);
  return { updatedScreenshots, updatedCollections: synced };
}

// 3. Delete Collection
export function deleteCollection(
  collectionName: string,
  screenshots: ScreenshotItem[],
  collections: CollectionItem[],
  deleteScreenshots: boolean = false
): { updatedScreenshots: ScreenshotItem[]; updatedCollections: CollectionItem[] } {
  let updatedScreenshots: ScreenshotItem[];

  if (deleteScreenshots) {
    // Delete all screenshots inside this collection
    updatedScreenshots = screenshots.filter((sc) => {
      const cName = sc.collectionName || sc.collection || getDefaultCollectionForCategory(sc.category);
      return cName !== collectionName;
    });
  } else {
    // Move screenshots in this collection to "General Vault"
    updatedScreenshots = screenshots.map((sc) => {
      const cName = sc.collectionName || sc.collection || getDefaultCollectionForCategory(sc.category);
      if (cName === collectionName) {
        return {
          ...sc,
          collectionName: "General Vault",
          collection: "General Vault",
        };
      }
      return sc;
    });
  }

  const updatedCollections = collections.filter((c) => c.name !== collectionName);
  const synced = deriveAndSyncCollections(updatedScreenshots, updatedCollections);
  return { updatedScreenshots, updatedCollections: synced };
}

// 4. Merge Collections
export function mergeCollections(
  sourceCollectionNames: string[],
  targetCollectionName: string,
  screenshots: ScreenshotItem[],
  collections: CollectionItem[]
): { updatedScreenshots: ScreenshotItem[]; updatedCollections: CollectionItem[] } {
  const sourceSet = new Set(sourceCollectionNames);

  // Re-assign all screenshots from source collections to target collection
  const updatedScreenshots = screenshots.map((sc) => {
    const cName = sc.collectionName || sc.collection || getDefaultCollectionForCategory(sc.category);
    if (sourceSet.has(cName)) {
      return {
        ...sc,
        collectionName: targetCollectionName,
        collection: targetCollectionName,
      };
    }
    return sc;
  });

  // Filter out merged source collections except target if target was one of them
  const updatedCollections = collections.filter(
    (c) => !sourceSet.has(c.name) || c.name === targetCollectionName
  );

  const synced = deriveAndSyncCollections(updatedScreenshots, updatedCollections);
  return { updatedScreenshots, updatedCollections: synced };
}

// 5. Move Screenshots to Target Collection
export function moveScreenshotsToCollection(
  screenshotIds: string[],
  targetCollectionName: string,
  screenshots: ScreenshotItem[],
  collections: CollectionItem[]
): { updatedScreenshots: ScreenshotItem[]; updatedCollections: CollectionItem[] } {
  const idSet = new Set(screenshotIds);

  const updatedScreenshots = screenshots.map((sc) => {
    if (idSet.has(sc.id)) {
      return {
        ...sc,
        collectionName: targetCollectionName,
        collection: targetCollectionName,
      };
    }
    return sc;
  });

  const synced = deriveAndSyncCollections(updatedScreenshots, collections);
  return { updatedScreenshots, updatedCollections: synced };
}
