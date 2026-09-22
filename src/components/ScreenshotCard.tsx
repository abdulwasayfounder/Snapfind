import React, { useState } from "react";
import {
  Heart,
  Calendar,
  Image as ImageIcon,
  Check,
  Maximize2,
  ShieldAlert,
  Lock,
  Copy,
} from "lucide-react";
import { motion } from "motion/react";
import { ScreenshotItem, SearchResultMatch, CategoryType } from "../types";
import { FALLBACK_IMAGE_PLACEHOLDER, markImageFailed } from "../services/imageCache";

interface ScreenshotCardProps {
  item: ScreenshotItem;
  matchInfo?: SearchResultMatch;
  isDark: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect: (item: ScreenshotItem) => void;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onMoveCategory?: (id: string, newCategory: CategoryType) => void;
  onDelete: (id: string) => void;
  onCopyText: (text: string) => void;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  item,
  isDark,
  isSelected = false,
  isSelectionMode = false,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.thumbnailUri || item.imageUrl || FALLBACK_IMAGE_PLACEHOLDER);
  const [isRevealed, setIsRevealed] = useState(false);

  const isSensitive = Boolean(
    item.is_sensitive ||
    item.isSensitive ||
    item.privacy_level === "highly_sensitive" ||
    item.privacy_level === "private" ||
    item.privacyLevel === "highly_sensitive" ||
    item.privacyLevel === "private"
  );

  const isDuplicateItem = Boolean(item.isDuplicate);

  const handleImageError = () => {
    markImageFailed(item.imageUrl);
    setImgSrc(FALLBACK_IMAGE_PLACEHOLDER);
    setImgLoaded(true);
  };

  const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(item.id);
    } else {
      onSelect(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? "bg-[#18202B] border-[#3B82F6] ring-2 ring-[#3B82F6]/40 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
          : isDark
          ? "bg-[#121821] border-white/[0.08] hover:border-[#3B82F6]/40 hover:bg-[#18202B] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7),0_0_18px_-4px_rgba(59,130,246,0.18)]"
          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
      }`}
    >
      {/* Thumbnail Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#07090D]">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-[#0D1117] flex items-center justify-center text-slate-600">
            <ImageIcon className="w-8 h-8 opacity-30" />
          </div>
        )}

        <img
          src={imgSrc}
          alt={item.title}
          onLoad={() => setImgLoaded(true)}
          onError={handleImageError}
          className={`w-full h-full object-cover object-top transition-all duration-300 group-hover:scale-105 ${
            imgLoaded ? "opacity-90 group-hover:opacity-100" : "opacity-0"
          } ${isSensitive && !isRevealed ? "filter blur-md scale-105 brightness-75" : ""}`}
          loading="lazy"
        />

        {/* Security & Privacy Badge with tap-to-unblur */}
        {isSensitive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRevealed((r) => !r);
            }}
            className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-rose-500/85 hover:bg-rose-600 backdrop-blur-md border border-rose-400/30 text-white text-[10px] font-bold flex items-center gap-1 shadow-md transition-colors cursor-pointer"
            title={isRevealed ? "Tap to blur" : "Tap to reveal screenshot"}
          >
            <Lock className="w-2.5 h-2.5" />
            <span>{isRevealed ? "Revealed" : "Private Blur"}</span>
          </button>
        )}

        {/* Smart Category Indicator (if not sensitive) */}
        {!isSensitive && (item.smart_category || item.smartCategory) && (item.smart_category || item.smartCategory) !== "Other" && (
          <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-emerald-500/30 text-[#00FF66] text-[10px] font-bold flex items-center gap-1 shadow-md">
            <span>{item.smart_category || item.smartCategory}</span>
          </div>
        )}

        {/* Duplicate Badge if flagged */}
        {isDuplicateItem && (
          <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-lg bg-amber-500/80 backdrop-blur-md border border-amber-400/30 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
            <Copy className="w-2.5 h-2.5" />
            <span>Duplicate</span>
          </div>
        )}

        {/* Multi-Select Checkbox (Top Left) */}
        {(isSelectionMode || isSelected) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(item.id);
            }}
            className={`absolute top-2.5 left-2.5 z-10 w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              isSelected
                ? "bg-[#3B82F6] text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                : "bg-black/60 backdrop-blur-md border border-white/30 text-transparent"
            }`}
          >
            {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
          </button>
        )}

        {/* Small Favorite Button (Top Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-xl backdrop-blur-md transition-all ${
            item.isFavorite
              ? "bg-rose-500/90 text-white shadow-sm"
              : "opacity-0 group-hover:opacity-100 bg-black/60 text-slate-300 hover:text-white border border-white/[0.08]"
          }`}
          title={item.isFavorite ? "Favorited" : "Add to favorites"}
        >
          <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Card Content: Title, 1-line description, Date & Inspect */}
      <div className="p-3.5 sm:p-4 space-y-1.5">
        <h3 className="font-semibold text-sm sm:text-base text-[#F8FAFC] line-clamp-1 group-hover:text-blue-400 transition-colors">
          {item.title}
        </h3>

        {/* Short 1-line description */}
        <p className="text-xs text-[#94A3B8] line-clamp-1 leading-normal">
          {item.summary || "Screenshot capture"}
        </p>

        {/* Footer: Date & Inspect Action */}
        <div className="flex items-center justify-between pt-1.5 text-[11px] text-[#64748B] border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#64748B]" />
            <span>{formattedDate}</span>
          </div>

          <span className="text-[#3B82F6] group-hover:text-blue-300 font-medium flex items-center gap-1 text-[11px]">
            <Maximize2 className="w-3 h-3" /> Inspect
          </span>
        </div>
      </div>
    </div>
  );
};
