import React, { useState, useRef, useEffect, useCallback } from "react";
import { RotateCcw } from "lucide-react";

interface PatternLockProps {
  onPatternComplete: (pattern: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export const PatternLock: React.FC<PatternLockProps> = ({
  onPatternComplete,
  disabled = false,
  error = false,
}) => {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLineEnd, setCurrentLineEnd] = useState<{ x: number; y: number } | null>(null);

  // 9 dots in a 3x3 grid: 0, 1, 2 / 3, 4, 5 / 6, 7, 8
  const dots = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const getDotCenter = (index: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const dotElement = containerRef.current.querySelector(`[data-dot-index="${index}"]`);
    if (!dotElement) return { x: 0, y: 0 };
    const rect = dotElement.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    };
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    setSelectedDots([index]);
    const center = getDotCenter(index);
    setCurrentLineEnd(center);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDrawing || disabled || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      setCurrentLineEnd({
        x: clientX - containerRect.left,
        y: clientY - containerRect.top,
      });

      // Find if touch is hovering over any dot
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        const dotIndexAttr = el.getAttribute("data-dot-index");
        if (dotIndexAttr !== null) {
          const dotIndex = parseInt(dotIndexAttr, 10);
          if (!isNaN(dotIndex) && !selectedDots.includes(dotIndex)) {
            setSelectedDots((prev) => [...prev, dotIndex]);
            break;
          }
        }
      }
    },
    [isDrawing, disabled, selectedDots]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentLineEnd(null);

    if (selectedDots.length >= 2) {
      onPatternComplete(selectedDots.join("-"));
    }
  }, [isDrawing, selectedDots, onPatternComplete]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleClear = () => {
    setSelectedDots([]);
    setIsDrawing(false);
    setCurrentLineEnd(null);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative w-64 h-64 select-none touch-none p-4 rounded-3xl bg-[#0D1117]/80 border border-white/[0.08]"
      >
        {/* SVG connection lines between selected dots */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {selectedDots.map((dotIdx, i) => {
            if (i === 0) return null;
            const from = getDotCenter(selectedDots[i - 1]);
            const to = getDotCenter(dotIdx);
            return (
              <line
                key={`line-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={error ? "#FF0000" : "#CCFF00"}
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.85"
              />
            );
          })}
          {isDrawing && selectedDots.length > 0 && currentLineEnd && (
            <line
              x1={getDotCenter(selectedDots[selectedDots.length - 1]).x}
              y1={getDotCenter(selectedDots[selectedDots.length - 1]).y}
              x2={currentLineEnd.x}
              y2={currentLineEnd.y}
              stroke={error ? "#FF0000" : "#CCFF00"}
              strokeWidth="3"
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity="0.6"
            />
          )}
        </svg>

        {/* 3x3 Grid of Dots */}
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-4 relative z-20">
          {dots.map((dot) => {
            const isSelected = selectedDots.includes(dot);
            return (
              <div
                key={dot}
                data-dot-index={dot}
                onPointerDown={(e) => handlePointerDown(dot, e)}
                className="flex items-center justify-center cursor-pointer touch-none"
              >
                <div
                  className={`transition-all duration-150 rounded-full flex items-center justify-center ${
                    isSelected
                      ? error
                        ? "w-7 h-7 bg-red-500/20 border-2 border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.5)]"
                        : "w-7 h-7 bg-[#CCFF00]/20 border-2 border-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.5)]"
                      : "w-5 h-5 bg-white/20 hover:bg-white/40 border border-white/20"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                      isSelected
                        ? error
                          ? "bg-red-500 scale-125"
                          : "bg-[#CCFF00] scale-125"
                        : "bg-slate-400"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDots.length > 0 && !isDrawing && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Redraw pattern</span>
        </button>
      )}
    </div>
  );
};
