"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Columns2,
  Download,
  Eye,
  Sparkles,
  SplitSquareVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SplitCompareCanvasProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

type ViewMode = "split" | "side-by-side" | "difference";

export function SplitCompareCanvas({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Result",
  className = "",
}: SplitCompareCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  // Compute difference heatmap when viewMode === 'difference'
  useEffect(() => {
    if (viewMode !== "difference" || !beforeSrc || !afterSrc) return;
    const canvas = diffCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgBefore = new Image();
    const imgAfter = new Image();
    imgBefore.crossOrigin = "anonymous";
    imgAfter.crossOrigin = "anonymous";

    let loaded = 0;
    const onBothLoaded = () => {
      loaded++;
      if (loaded < 2) return;

      const w = Math.min(imgBefore.width, imgAfter.width);
      const h = Math.min(imgBefore.height, imgAfter.height);
      canvas.width = w;
      canvas.height = h;

      const tempC1 = document.createElement("canvas");
      tempC1.width = w;
      tempC1.height = h;
      const ctx1 = tempC1.getContext("2d");
      ctx1?.drawImage(imgBefore, 0, 0, w, h);

      const tempC2 = document.createElement("canvas");
      tempC2.width = w;
      tempC2.height = h;
      const ctx2 = tempC2.getContext("2d");
      ctx2?.drawImage(imgAfter, 0, 0, w, h);

      if (!ctx1 || !ctx2) return;
      const data1 = ctx1.getImageData(0, 0, w, h).data;
      const data2 = ctx2.getImageData(0, 0, w, h).data;

      const diffImg = ctx.createImageData(w, h);
      const out = diffImg.data;

      for (let i = 0; i < data1.length; i += 4) {
        const diff = Math.abs(data2[i] - data1[i]);
        const amplified = Math.min(255, diff * 2.5);

        // Heatmap color mapping
        out[i] = amplified > 128 ? 235 : Math.floor(amplified * 1.8);
        out[i + 1] = amplified;
        out[i + 2] = 255 - amplified;
        out[i + 3] = 255;
      }

      ctx.putImageData(diffImg, 0, 0);
    };

    imgBefore.onload = onBothLoaded;
    imgAfter.onload = onBothLoaded;
    imgBefore.src = beforeSrc;
    imgAfter.src = afterSrc;
  }, [viewMode, beforeSrc, afterSrc]);

  // Pointer drag logic for split slider
  const handlePointerDown = () => setIsDragging(true);

  useEffect(() => {
    const handlePointerUp = () => setIsDragging(false);
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const offsetX = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
      setSliderPos(Number(pct.toFixed(1)));
    };

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  const handleDownloadResult = () => {
    if (!afterSrc) return;
    const link = document.createElement("a");
    link.download = `${afterLabel.toLowerCase().replace(/[^a-z0-9]/g, "_")}_result.png`;
    link.href = afterSrc;
    link.click();
  };

  return (
    <div
      className={`flex flex-col rounded-lg bg-white dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] overflow-hidden shadow-xs ${className}`}
    >
      {/* Top Bar: View Mode Selector & Tools */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 border-b border-[#EDEDEB] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#252525] gap-2">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#F1F1EF] dark:bg-[#2A2A2A] p-0.5 rounded border border-[#EDEDEB] dark:border-[#333333]">
          <button
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
              viewMode === "split"
                ? "bg-white dark:bg-[#383838] text-[#37352F] dark:text-white shadow-xs"
                : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
            }`}
          >
            <SplitSquareVertical className="h-3 w-3" />
            <span>Split Slider</span>
          </button>
          <button
            onClick={() => setViewMode("side-by-side")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
              viewMode === "side-by-side"
                ? "bg-white dark:bg-[#383838] text-[#37352F] dark:text-white shadow-xs"
                : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
            }`}
          >
            <Columns2 className="h-3 w-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode("difference")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer font-medium ${
              viewMode === "difference"
                ? "bg-white dark:bg-[#383838] text-[#37352F] dark:text-white shadow-xs"
                : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Diff Heatmap</span>
          </button>
        </div>

        {/* Quick percentage buttons for Split mode */}
        {viewMode === "split" && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#787774] dark:text-[#9B9B9B]">
            <span>Snap:</span>
            {[25, 50, 75].map((pct) => (
              <button
                key={pct}
                onClick={() => setSliderPos(pct)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  sliderPos === pct
                    ? "bg-[#E3E2E0] dark:bg-[#383838] text-[#37352F] dark:text-white font-medium"
                    : "hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E]"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick hold to peek at original */}
          <button
            onMouseDown={() => setIsHoldingOriginal(true)}
            onMouseUp={() => setIsHoldingOriginal(false)}
            onTouchStart={() => setIsHoldingOriginal(true)}
            onTouchEnd={() => setIsHoldingOriginal(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-[#252525] hover:bg-[#F7F6F5] dark:hover:bg-[#2E2E2E] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#E6E5E3] text-xs font-medium cursor-pointer transition-colors select-none shadow-xs"
            title="Press and hold to temporarily view original unedited image"
          >
            <Eye className="h-3 w-3 text-[#787774] dark:text-[#9B9B9B]" />
            <span>Peek Original</span>
          </button>

          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={handleDownloadResult}
            title="Download result image"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Main Comparison Viewport */}
      <div className="relative select-none overflow-hidden bg-[#F7F6F3] dark:bg-[#141414] flex items-center justify-center min-h-[380px] p-4">
        {/* MODE 1: SPLIT SLIDER */}
        {viewMode === "split" && (
          <div
            ref={containerRef}
            className="relative w-full max-w-[512px] h-[360px] sm:h-[440px] flex items-center justify-center overflow-hidden rounded border border-[#EDEDEB] dark:border-[#2E2E2E] bg-white dark:bg-[#1E1E1E] shadow-sm"
          >
            {/* After image (base) or peek original */}
            <img
              src={isHoldingOriginal ? beforeSrc : afterSrc}
              alt={isHoldingOriginal ? beforeLabel : afterLabel}
              className="max-h-full max-w-full object-contain pointer-events-none"
            />

            {/* Before image (clipped overlay) */}
            {!isHoldingOriginal && (
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
                style={{
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                }}
              >
                <img
                  src={beforeSrc}
                  alt={beforeLabel}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            {/* Draggable Divider Line */}
            {!isHoldingOriginal && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#37352F] dark:bg-[#E6E5E3] cursor-ew-resize flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
                onPointerDown={handlePointerDown}
              >
                <div className="h-6 w-6 rounded-full bg-white dark:bg-[#202020] border-2 border-[#37352F] dark:border-[#E6E5E3] flex items-center justify-center shadow-md">
                  <div className="h-2.5 w-0.5 bg-[#37352F] dark:bg-[#E6E5E3] mx-0.5 rounded-full" />
                  <div className="h-2.5 w-0.5 bg-[#37352F] dark:bg-[#E6E5E3] mx-0.5 rounded-full" />
                </div>
              </div>
            )}

            {/* Badges */}
            <span className="absolute top-3 left-3 bg-white/90 dark:bg-[#202020]/90 backdrop-blur-xs border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#E6E5E3] text-[10px] font-medium px-2 py-0.5 rounded shadow-xs">
              {beforeLabel}
            </span>
            <span className="absolute top-3 right-3 bg-white/90 dark:bg-[#202020]/90 backdrop-blur-xs border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#E6E5E3] text-[10px] font-medium px-2 py-0.5 rounded shadow-xs">
              {isHoldingOriginal ? `${beforeLabel} (Peeking)` : afterLabel}
            </span>
          </div>
        )}

        {/* MODE 2: SIDE-BY-SIDE */}
        {viewMode === "side-by-side" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl">
            <div className="flex flex-col items-center rounded border border-[#EDEDEB] dark:border-[#2E2E2E] bg-white dark:bg-[#1E1E1E] p-2 shadow-xs">
              <span className="text-[11px] font-medium text-[#787774] dark:text-[#9B9B9B] mb-2">
                {beforeLabel}
              </span>
              <img
                src={beforeSrc}
                alt={beforeLabel}
                className="max-h-[360px] max-w-full object-contain rounded"
              />
            </div>
            <div className="flex flex-col items-center rounded border border-[#EDEDEB] dark:border-[#2E2E2E] bg-white dark:bg-[#1E1E1E] p-2 shadow-xs">
              <span className="text-[11px] font-medium text-[#37352F] dark:text-[#E6E5E3] mb-2">
                {afterLabel}
              </span>
              <img
                src={afterSrc}
                alt={afterLabel}
                className="max-h-[360px] max-w-full object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* MODE 3: DIFFERENCE HEATMAP */}
        {viewMode === "difference" && (
          <div className="flex flex-col items-center gap-3">
            <canvas
              ref={diffCanvasRef}
              className="max-h-[440px] max-w-full object-contain rounded border border-[#EDEDEB] dark:border-[#2E2E2E] shadow-sm bg-white dark:bg-[#1E1E1E]"
            />
            <div className="flex items-center gap-2 text-[11px] text-[#787774] dark:text-[#9B9B9B] bg-white dark:bg-[#202020] px-3 py-1 rounded-full border border-[#EDEDEB] dark:border-[#2E2E2E] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#2383E2]" />
              <span>Difference Map: Dark = Identical • Saturated = Modified pixels</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
