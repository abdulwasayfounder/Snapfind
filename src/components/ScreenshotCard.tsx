import React, { useState } from "react";
import {
  Heart,
  Calendar,
  Image as ImageIcon,
  Check,
  Maximize2,
  Lock,
  Copy,
} from "lucide-react";
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
      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-colors duration-150 ${
        isSelected
          ? "bg-[#1E2226] border-[#00D4FF] ring-1 ring-[#00D4FF]/40"
          : "bg-[#1E2226] border-[#30363D] hover:border-[#00D4FF] hover:bg-[#262C32]"
      }`}
    >
      {/* Thumbnail Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#101214]">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-[#171A1D] flex items-center justify-center text-[#6B7280]">
            <ImageIcon className="w-8 h-8 opacity-40" />
          </div>
        )}

        <img
          src={imgSrc}
          alt={item.title}
          onLoad={() => setImgLoaded(true)}
          onError={handleImageError}
          className={`w-full h-full object-cover object-top transition-opacity duration-200 ${
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
            className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#171A1D]/90 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title={isRevealed ? "Tap to blur" : "Tap to reveal screenshot"}
          >
            <Lock className="w-2.5 h-2.5" />
            <span>{isRevealed ? "Revealed" : "Private Blur"}</span>
          </button>
        )}

        {/* Smart Category Indicator */}
        {!isSensitive && (item.smart_category || item.smartCategory) && (item.smart_category || item.smartCategory) !== "Other" && (
          <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#171A1D]/90 border border-[#00D4FF]/30 text-[#00D4FF] text-[10px] font-medium flex items-center gap-1">
            <span>{item.smart_category || item.smartCategory}</span>
          </div>
        )}

        {/* Duplicate Badge */}
        {isDuplicateItem && (
          <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-md bg-[#171A1D]/90 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-medium flex items-center gap-1">
            <Copy className="w-2.5 h-2.5" />
            <span>Duplicate</span>
          </div>
        )}

        {/* Multi-Select Checkbox */}
        {(isSelectionMode || isSelected) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(item.id);
            }}
            className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-[#00D4FF] text-[#101214]"
                : "bg-[#171A1D]/80 border border-[#30363D] text-transparent"
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-colors cursor-pointer ${
            item.isFavorite
              ? "bg-[#171A1D]/90 text-[#EF4444] border border-[#EF4444]/30"
              : "opacity-0 group-hover:opacity-100 bg-[#171A1D]/80 text-[#A7B0BA] hover:text-[#F5F7FA] border border-[#30363D]"
          }`}
          title={item.isFavorite ? "Favorited" : "Add to favorites"}
        >
          <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-3.5 space-y-1.5">
        <h3 className="font-semibold text-xs sm:text-sm text-[#F5F7FA] line-clamp-1 group-hover:text-[#00D4FF] transition-colors">
          {item.title}
        </h3>

        <p className="text-xs text-[#A7B0BA] line-clamp-1 leading-normal">
          {item.summary || "Screenshot capture"}
        </p>

        {/* Footer: Date & Inspect */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-[#6B7280] border-t border-[#30363D]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-[#6B7280]" />
            <span>{formattedDate}</span>
          </div>

          <span className="text-[#00D4FF] group-hover:text-[#00B8D9] font-medium flex items-center gap-1">
            <Maximize2 className="w-3 h-3" /> Inspect
          </span>
        </div>
      </div>
    </div>
  );
};
export default ScreenshotCard;
