import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  FolderPlus,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  Merge,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  Check,
  X,
  Plus,
  Move,
  Grid as GridIcon,
  Search,
  CheckSquare,
  Square,
  Plane,
  Receipt,
  Utensils,
  GraduationCap,
  ShoppingBag,
  MessageSquare,
  Code,
  DollarSign,
  Lightbulb,
  Zap,
  BookOpen,
  FileText,
  Shield,
  CreditCard,
  Lock,
  Unlock,
  KeyRound,
} from "lucide-react";
import { CollectionItem, ScreenshotItem, CategoryType } from "../types";
import { ScreenshotCard } from "./ScreenshotCard";
import { useEntitlement } from "../hooks/useEntitlement";
import { UpgradeModal, ProBadge } from "./subscription/UpgradePrompt";
import { PageHeroHeader } from "./PageHeroHeader";
import { collectionSecurity, VAULT_COLLECTION_NAME } from "../services/collectionSecurity";
import { SecurityLockModal } from "./SecurityLockModal";

interface CollectionsViewProps {
  collections: CollectionItem[];
  screenshots: ScreenshotItem[];
  isDark: boolean;
  onSelectScreenshot: (item: ScreenshotItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteScreenshot: (id: string) => void;
  onCreateCollection: (name: string, description?: string) => void;
  onRenameCollection: (oldName: string, newName: string) => void;
  onDeleteCollection: (collectionName: string, deleteScreenshots: boolean) => void;
  onMergeCollections: (sourceNames: string[], targetName: string) => void;
  onMoveScreenshots: (ids: string[], targetCollectionName: string) => void;
  addToast: (msg: { title: string; description?: string; type: "success" | "error" | "info" }) => void;
}

/**
 * Get category theme and placeholder styling when collection is empty
 */
const getCategoryTheme = (name: string, description?: string) => {
  const text = `${name} ${description || ""}`.toLowerCase();

  if (text.includes("flight") || text.includes("travel") || text.includes("passport") || text.includes("visa")) {
    return {
      icon: Plane,
      gradient: "from-sky-950 via-blue-900/60 to-indigo-950",
      accent: "text-sky-400",
      badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      label: "Travel & Identity",
      patternIcon: Plane,
    };
  }
  if (text.includes("bill") || text.includes("electric") || text.includes("power") || text.includes("utility")) {
    return {
      icon: Zap,
      gradient: "from-amber-950 via-orange-950/70 to-yellow-950/50",
      accent: "text-amber-400",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      label: "Utility Bills",
      patternIcon: Zap,
    };
  }
  if (text.includes("education") || text.includes("pass") || text.includes("cert") || text.includes("school") || text.includes("degree")) {
    return {
      icon: GraduationCap,
      gradient: "from-indigo-950 via-purple-950/70 to-blue-950/60",
      accent: "text-indigo-400",
      badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      label: "Education & Passes",
      patternIcon: BookOpen,
    };
  }
  if (text.includes("food") || text.includes("recipe") || text.includes("cook") || text.includes("meal") || text.includes("restaurant")) {
    return {
      icon: Utensils,
      gradient: "from-emerald-950 via-teal-950/70 to-green-950/50",
      accent: "text-emerald-400",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      label: "Food & Recipes",
      patternIcon: Utensils,
    };
  }
  if (text.includes("receipt") || text.includes("invoice") || text.includes("shop") || text.includes("order") || text.includes("purchase")) {
    return {
      icon: Receipt,
      gradient: "from-teal-950 via-cyan-950/70 to-slate-950",
      accent: "text-teal-400",
      badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      label: "Receipts & Shopping",
      patternIcon: ShoppingBag,
    };
  }
  if (text.includes("code") || text.includes("dev") || text.includes("program") || text.includes("terminal") || text.includes("git")) {
    return {
      icon: Code,
      gradient: "from-violet-950 via-purple-950/70 to-slate-950",
      accent: "text-violet-400",
      badgeBg: "bg-violet-500/20 text-violet-300 border-violet-500/30",
      label: "Development & Code",
      patternIcon: Code,
    };
  }
  if (text.includes("chat") || text.includes("message") || text.includes("convo") || text.includes("whatsapp") || text.includes("slack")) {
    return {
      icon: MessageSquare,
      gradient: "from-blue-950 via-sky-950/70 to-slate-950",
      accent: "text-blue-400",
      badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      label: "Chats & Messages",
      patternIcon: MessageSquare,
    };
  }
  if (text.includes("finance") || text.includes("bank") || text.includes("statement") || text.includes("crypto") || text.includes("money")) {
    return {
      icon: DollarSign,
      gradient: "from-emerald-950 via-slate-900 to-teal-950",
      accent: "text-emerald-400",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      label: "Financial Statements",
      patternIcon: CreditCard,
    };
  }
  if (text.includes("idea") || text.includes("note") || text.includes("draft") || text.includes("memo")) {
    return {
      icon: Lightbulb,
      gradient: "from-amber-950 via-yellow-950/60 to-slate-950",
      accent: "text-amber-300",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      label: "Ideas & Notes",
      patternIcon: Lightbulb,
    };
  }

  return {
    icon: Folder,
    gradient: "from-slate-900 via-[#18181B] to-slate-950",
    accent: "text-slate-400",
    badgeBg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    label: "Vault Collection",
    patternIcon: Folder,
  };
};

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  screenshots,
  isDark,
  onSelectScreenshot,
  onToggleFavorite,
  onDeleteScreenshot,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onMergeCollections,
  onMoveScreenshots,
  addToast,
}) => {
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    isPro,
    isFounder,
    promptUpgrade,
    isUpgradeModalOpen,
    closeUpgradeModal,
    activePromptContext,
  } = useEntitlement();

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");

  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteWithPhotos, setDeleteWithPhotos] = useState(false);

  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedMergeSources, setSelectedMergeSources] = useState<string[]>([]);
  const [targetMergeName, setTargetMergeName] = useState("");

  // Batch Selection inside Album detail view
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetMoveCollection, setTargetMoveCollection] = useState("");

  // Menu popover per card
  const [activeMenuCollection, setActiveMenuCollection] = useState<string | null>(null);

  // Security Lock Modal State
  const [securityModal, setSecurityModal] = useState<{
    isOpen: boolean;
    collectionName: string;
    mode: "unlock" | "configure" | "change" | "remove" | "settings";
    pendingTargetCollection?: string;
  }>({
    isOpen: false,
    collectionName: "",
    mode: "unlock",
  });

  const handleCollectionClick = (col: CollectionItem) => {
    if (collectionSecurity.isCollectionLocked(col.name)) {
      setSecurityModal({
        isOpen: true,
        collectionName: col.name,
        mode: "unlock",
        pendingTargetCollection: col.name,
      });
      return;
    }
    setSelectedCollectionName(col.name);
  };

  // Filter collections
  const filteredCollections = collections.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Active detail collection items
  const activeCollectionObj = collections.find((c) => c.name === selectedCollectionName);
  const activeScreenshots = screenshots.filter((s) => {
    const colName = s.collectionName || s.collection || "General Vault";
    return colName === selectedCollectionName;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onCreateCollection(newColName.trim(), newColDesc.trim());
    addToast({
      title: "Collection Created",
      description: `Created new album "${newColName}".`,
      type: "success",
    });
    setNewColName("");
    setNewColDesc("");
    setIsCreateOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    onRenameCollection(renameTarget, renameValue.trim());
    if (selectedCollectionName === renameTarget) {
      setSelectedCollectionName(renameValue.trim());
    }
    addToast({
      title: "Collection Renamed",
      description: `Renamed "${renameTarget}" to "${renameValue.trim()}".`,
      type: "success",
    });
    setRenameTarget(null);
    setRenameValue("");
  };

  const handleDeleteSubmit = () => {
    if (!deleteTarget) return;
    onDeleteCollection(deleteTarget, deleteWithPhotos);
    if (selectedCollectionName === deleteTarget) {
      setSelectedCollectionName(null);
    }
    addToast({
      title: "Collection Deleted",
      description: `Removed collection "${deleteTarget}".`,
      type: "info",
    });
    setDeleteTarget(null);
  };

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMergeSources.length < 1 || !targetMergeName.trim()) return;

    onMergeCollections(selectedMergeSources, targetMergeName.trim());
    addToast({
      title: "Collections Merged",
      description: `Merged ${selectedMergeSources.length} collection(s) into "${targetMergeName.trim()}".`,
      type: "success",
    });
    setMergeModalOpen(false);
    setSelectedMergeSources([]);
    setTargetMergeName("");
  };

  const handleBatchMoveSubmit = () => {
    if (selectedPhotoIds.length === 0 || !targetMoveCollection) return;
    onMoveScreenshots(selectedPhotoIds, targetMoveCollection);
    addToast({
      title: "Photos Moved",
      description: `Moved ${selectedPhotoIds.length} photo(s) to "${targetMoveCollection}".`,
      type: "success",
    });
    setSelectedPhotoIds([]);
    setIsMoveModalOpen(false);
  };

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Helper to get up to 3 thumbnails for Apple Photos stacked look with contextual ranking
  const getRepresentativeStackThumbnails = (collectionName: string): string[] => {
    const items = screenshots.filter((s) => {
      if (s.isDeleted || s.is_deleted) return false;
      const col = s.collectionName || s.collection || "General Vault";
      return col === collectionName;
    });

    if (items.length === 0) return [];

    // Score screenshots within the collection for best representative visual quality
    const scored = items.map((item) => {
      let score = 0;
      const uri = item.thumbnailUri || item.thumbnail_uri || item.imageUrl || item.image_uri || "";
      if (uri && uri.length > 20) score += 30;
      if (item.processingStatus === "Completed") score += 20;
      if (item.ocr_text || item.fullText) score += 15;
      if (item.tags && item.tags.length > 0) score += 10;
      if (item.category && item.category !== "Other") score += 10;
      if (item.isFavorite || item.favorite) score += 10;
      const dateMs = new Date(item.createdAt || item.date_created || item.indexedAt || 0).getTime();
      if (!isNaN(dateMs)) {
        score += Math.min(10, Math.floor(dateMs / (1000 * 60 * 60 * 24 * 30)));
      }
      return { uri, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((s) => s.uri).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* Detail Album View */}
      {selectedCollectionName ? (
        <motion.div
          key="album-detail"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Top Detail Header Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <button
              onClick={() => {
                setSelectedCollectionName(null);
                setSelectedPhotoIds([]);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? "bg-[#18181B] hover:bg-[#27272A] text-slate-200 border border-white/10"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm"
              }`}
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Back to Collections</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Security Lock Controls */}
              {selectedCollectionName && collectionSecurity.hasCollectionLock(selectedCollectionName) ? (
                <>
                  <button
                    onClick={() => {
                      setSecurityModal({
                        isOpen: true,
                        collectionName: selectedCollectionName,
                        mode: "settings",
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#CCFF00]/10 hover:bg-[#CCFF00]/20 text-[#CCFF00] border border-[#CCFF00]/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Manage security, change lock method, or remove lock"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Security Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      collectionSecurity.lockCollection(selectedCollectionName);
                      setSelectedCollectionName(null);
                      addToast({
                        title: "Collection Locked",
                        description: `Locked "${selectedCollectionName}".`,
                        type: "info",
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Lock this album now"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Album</span>
                  </button>
                </>
              ) : (
                selectedCollectionName && (
                  <button
                    onClick={() => {
                      setSecurityModal({
                        isOpen: true,
                        collectionName: selectedCollectionName,
                        mode: "configure",
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Protect album with Pattern, PIN, or Password"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Set Lock</span>
                  </button>
                )
              )}

              <button
                onClick={() => {
                  setRenameTarget(selectedCollectionName);
                  setRenameValue(selectedCollectionName);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename Album</span>
              </button>

              <button
                onClick={() => {
                  setSelectedMergeSources([selectedCollectionName]);
                  setTargetMergeName(selectedCollectionName);
                  setMergeModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Merge className="w-3.5 h-3.5" />
                <span>Merge Album</span>
              </button>

              <button
                onClick={() => setDeleteTarget(selectedCollectionName)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Album</span>
              </button>
            </div>
          </div>

          {/* Album Hero Card (Apple Photos Style) */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden backdrop-blur-2xl shadow-2xl ${
              isDark
                ? "bg-gradient-to-r from-[#18181B]/90 via-[#18181B]/70 to-blue-950/40 border-white/10"
                : "bg-gradient-to-r from-white via-slate-50 to-blue-50/50 border-slate-200"
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    {activeCollectionObj?.isAiGenerated ? "AI Auto Album" : "Custom Album"}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeScreenshots.length} Screenshots
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedCollectionName}
                </h1>

                {activeCollectionObj?.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activeCollectionObj.description}
                  </p>
                )}
              </div>

              {/* Batch Action Toolbar when items selected */}
              {selectedPhotoIds.length > 0 && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-blue-600/30 border border-blue-500/50 backdrop-blur-xl shadow-xl"
                >
                  <span className="text-xs font-bold text-blue-200 pl-1">
                    {selectedPhotoIds.length} Selected
                  </span>
                  <button
                    onClick={() => setIsMoveModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/30"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>Move to Album</span>
                  </button>
                  <button
                    onClick={() => setSelectedPhotoIds([])}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Grid of screenshots in this album */}
          {activeScreenshots.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl border border-dashed border-white/10">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">No screenshots in this album</h3>
              <p className="text-xs text-slate-500 mt-1">
                Move screenshots here or upload new ones to populate this AI collection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {activeScreenshots.map((item) => {
                const isSelected = selectedPhotoIds.includes(item.id);
                return (
                  <div key={item.id} className="relative group">
                    {/* Batch Selection Checkbox overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectPhoto(item.id);
                      }}
                      className={`absolute top-3 left-3 z-30 p-1.5 rounded-xl backdrop-blur-md transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                          : "bg-black/40 hover:bg-black/70 text-white/70 border border-white/20 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    <ScreenshotCard
                      item={item}
                      isDark={isDark}
                      onSelect={() => onSelectScreenshot(item)}
                      onToggleFavorite={() => onToggleFavorite(item.id)}
                      onDelete={() => onDeleteScreenshot(item.id)}
                      onCopyText={() => {
                        navigator.clipboard.writeText(item.fullText || item.summary);
                        addToast({ title: "Copied OCR text to clipboard", type: "info" });
                      }}
                      isSelected={isSelected}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      ) : (
        /* Main Collections Overview View */
        <motion.div
          key="collections-grid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="space-y-6"
        >
          {/* Header Banner */}
          <PageHeroHeader
            type="collections"
            title="AI Smart Collections"
            subtitle="Gemini vision models automatically cluster your visual knowledge into categorized smart albums. Create, move, rename, and merge albums effortlessly."
            isDark={isDark}
            actions={
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => {
                    if (!isPro && !isFounder) {
                      promptUpgrade("aiCollections");
                      return;
                    }
                    setMergeModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
                >
                  <Merge className="w-4 h-4 text-purple-400" />
                  <span>Merge Collections</span>
                  {!isPro && !isFounder && <ProBadge size="xs" variant="pill" />}
                </button>

                <button
                  onClick={() => {
                    if (!isPro && !isFounder) {
                      promptUpgrade("aiCollections");
                      return;
                    }
                    setIsCreateOpen(true);
                  }}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xl shadow-blue-500/25"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Collection</span>
                  {!isPro && !isFounder && <ProBadge size="xs" variant="solid" />}
                </button>
              </div>
            }
          />

          {/* Search Bar for Collections */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search album collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs border focus:outline-none focus:border-[#3B82F6] focus:shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-all ${
                isDark
                  ? "bg-[#0D1117] border-white/[0.08] text-slate-200 placeholder-slate-500"
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
              }`}
            />
          </div>

          {/* Apple Photos Collection Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCollections.map((col) => {
              const thumbs = getRepresentativeStackThumbnails(col.name);
              const mainThumb = thumbs[0] || "";
              const theme = getCategoryTheme(col.name, col.description);
              const ThemeIcon = theme.icon;

              return (
                <motion.div
                  key={col.name}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => handleCollectionClick(col)}
                  className={`group relative rounded-3xl border p-4 cursor-pointer transition-all duration-300 ${
                    isDark
                      ? "bg-[#121821] hover:bg-[#18202B] border-white/[0.08] hover:border-[#3B82F6]/50 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10"
                      : "bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 shadow-md hover:shadow-xl"
                  }`}
                >
                  {/* Apple Photos Overlapping Stack Image Effect */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl mb-4 overflow-hidden bg-slate-900 border border-white/10 shadow-inner">
                    {/* Background Stack Layer 2 */}
                    {thumbs[2] && (
                      <div className="absolute inset-0 scale-[0.88] translate-y-[-8px] opacity-40 rounded-2xl overflow-hidden border border-white/20 shadow-md">
                        <img src={thumbs[2]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {/* Background Stack Layer 1 */}
                    {thumbs[1] && (
                      <div className="absolute inset-0 scale-[0.94] translate-y-[-4px] opacity-70 rounded-2xl overflow-hidden border border-white/20 shadow-md">
                        <img src={thumbs[1]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Top Main Image or Themed Contextual Visual */}
                    {mainThumb ? (
                      <img
                        src={mainThumb}
                        alt={col.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br ${theme.gradient} relative z-10`}
                      >
                        <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <ThemeIcon className={`w-8 h-8 ${theme.accent}`} />
                        </div>
                        <span className="mt-2 text-[10px] font-bold tracking-wider uppercase text-slate-300/80">
                          {theme.label}
                        </span>
                      </div>
                    )}

                    {/* Security Lock Overlay if locked */}
                    {collectionSecurity.isCollectionLocked(col.name) && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2 shadow-lg">
                          <Lock className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-white">Album Locked</span>
                        <span className="text-[10px] text-slate-300 mt-0.5">Tap to unlock</span>
                      </div>
                    )}

                    {/* Gradient Overlay & Badge */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 flex flex-col justify-between p-3 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {col.isAiGenerated ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#3B82F6]/90 text-white backdrop-blur-md border border-blue-400/30 flex items-center gap-1 shadow-md">
                              <Sparkles className="w-2.5 h-2.5 text-blue-200" />
                              AI Classified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-600/80 text-white backdrop-blur-md border border-purple-400/30 shadow-md">
                              Custom Album
                            </span>
                          )}

                          {collectionSecurity.hasCollectionLock(col.name) && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/85 text-white backdrop-blur-md border border-amber-400/40 flex items-center gap-1 shadow-md">
                              <Lock className="w-2.5 h-2.5" />
                              <span>{collectionSecurity.isCollectionLocked(col.name) ? "Locked" : "Unlocked"}</span>
                            </span>
                          )}
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-md">
                          {col.itemCount || 0} items
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Album Info & Action Dropdown */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-[#F8FAFC] group-hover:text-[#3B82F6] transition-colors truncate">
                        {col.name}
                      </h3>
                      {col.description && (
                        <p className="text-[11px] text-[#94A3B8] line-clamp-1">{col.description}</p>
                      )}
                    </div>

                    {/* Options Popover Button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuCollection(activeMenuCollection === col.name ? null : col.name);
                        }}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuCollection === col.name && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-50 w-44 rounded-2xl bg-[#0D1117] border border-white/[0.08] shadow-2xl p-1.5 space-y-1 backdrop-blur-2xl"
                        >
                          <button
                            onClick={() => {
                              setActiveMenuCollection(null);
                              setRenameTarget(col.name);
                              setRenameValue(col.name);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-blue-600/20 hover:text-blue-300 rounded-xl transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Rename</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuCollection(null);
                              if (collectionSecurity.isCollectionLocked(col.name)) {
                                setSecurityModal({
                                  isOpen: true,
                                  collectionName: col.name,
                                  mode: "unlock",
                                  pendingTargetCollection: col.name,
                                });
                              } else if (collectionSecurity.hasCollectionLock(col.name)) {
                                setSecurityModal({
                                  isOpen: true,
                                  collectionName: col.name,
                                  mode: "settings",
                                });
                              } else {
                                setSecurityModal({
                                  isOpen: true,
                                  collectionName: col.name,
                                  mode: "configure",
                                });
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-600/20 rounded-xl transition-all"
                          >
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span>{collectionSecurity.hasCollectionLock(col.name) ? "Lock Settings" : "Protect with Lock"}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuCollection(null);
                              setSelectedMergeSources([col.name]);
                              setTargetMergeName(col.name);
                              setMergeModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-purple-600/20 hover:text-purple-300 rounded-xl transition-all"
                          >
                            <Merge className="w-3.5 h-3.5" />
                            <span>Merge</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuCollection(null);
                              setDeleteTarget(col.name);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-600/20 rounded-xl transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Album</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* MODAL 1: Create Custom Collection */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold">New Custom Collection</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Album Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tax Returns 2026, Gym Workouts"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of this collection..."
                    value={newColDesc}
                    onChange={(e) => setNewColDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
                  >
                    Create Collection
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Rename Collection */}
      <AnimatePresence>
        {renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold">Rename Collection</h3>
                </div>
                <button
                  onClick={() => setRenameTarget(null)}
                  className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRenameSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    New Name for "{renameTarget}"
                  </label>
                  <input
                    type="text"
                    required
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setRenameTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
                  >
                    Save Rename
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Delete Collection */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3 text-rose-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-lg font-bold">Delete Collection "{deleteTarget}"?</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Choose how you would like to handle the screenshots currently inside this collection:
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10 cursor-pointer hover:border-blue-500/50">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={!deleteWithPhotos}
                    onChange={() => setDeleteWithPhotos(false)}
                    className="accent-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Keep photos, unassign album</p>
                    <p className="text-[10px] text-slate-400">
                      Move screenshots to "General Vault" without deleting photos.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 cursor-pointer hover:border-rose-500/50">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteWithPhotos}
                    onChange={() => setDeleteWithPhotos(true)}
                    className="accent-rose-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-rose-300">Delete album AND all screenshots</p>
                    <p className="text-[10px] text-rose-400/80">
                      Permanently delete all screenshots inside this album.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubmit}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Merge Collections */}
      <AnimatePresence>
        {mergeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-5 ${
                isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Merge className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold">Merge Collections</h3>
                </div>
                <button
                  onClick={() => setMergeModalOpen(false)}
                  className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleMergeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Select Source Collections to Merge
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-900/80 border border-white/10">
                    {collections.map((c) => {
                      const isSelected = selectedMergeSources.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            setSelectedMergeSources((prev) =>
                              prev.includes(c.name)
                                ? prev.filter((s) => s !== c.name)
                                : [...prev, c.name]
                            );
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                              : "hover:bg-white/5 text-slate-300"
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-500">{c.itemCount || 0} items</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Merged Target Collection Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Combined Receipts & Bills"
                    value={targetMergeName}
                    onChange={(e) => setTargetMergeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setMergeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedMergeSources.length === 0 || !targetMergeName.trim()}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-500/20"
                  >
                    Merge Albums
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: Move Screenshots to Target Album */}
      <AnimatePresence>
        {isMoveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                isDark ? "bg-[#18181B] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Move className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold">Move {selectedPhotoIds.length} Photo(s)</h3>
                </div>
                <button
                  onClick={() => setIsMoveModalOpen(false)}
                  className="p-1 rounded-xl hover:bg-white/10 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select Target Destination Album
                </label>
                <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-900/80 border border-white/10">
                  {collections.map((c) => {
                    const isSelected = targetMoveCollection === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => setTargetMoveCollection(c.name)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                            : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] opacity-70">{c.itemCount || 0} items</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchMoveSubmit}
                  disabled={!targetMoveCollection}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
                >
                  Confirm Move
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reusable Contextual Upgrade Prompt for Pro Features */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={closeUpgradeModal}
        feature={activePromptContext.feature || "aiCollections"}
        isDark={isDark}
      />

      {/* Security Lock Modal for Pattern/PIN/Password */}
      <SecurityLockModal
        isOpen={securityModal.isOpen}
        onClose={() => setSecurityModal((prev) => ({ ...prev, isOpen: false }))}
        collectionName={securityModal.collectionName}
        mode={securityModal.mode}
        onSuccess={() => {
          if (securityModal.pendingTargetCollection) {
            setSelectedCollectionName(securityModal.pendingTargetCollection);
          }
          setSecurityModal((prev) => ({ ...prev, isOpen: false, pendingTargetCollection: undefined }));
        }}
        addToast={addToast}
      />
    </div>
  );
};
