"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Eye } from "lucide-react";
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

  const baseSrc = isHoldingOriginal ? beforeSrc : afterSrc;
  const hasBase = Boolean(baseSrc && baseSrc.trim().length > 0);
  const hasBefore = Boolean(beforeSrc && beforeSrc.trim().length > 0);
  const hasAfter = Boolean(afterSrc && afterSrc.trim().length > 0);

  return (
    <div
      className={`flex flex-col rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] overflow-hidden ${className}`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E8E3] dark:border-[#292929] text-xs">
        {/* Mode Selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode("split")}
            className={`cursor-pointer transition-colors pb-0.5 ${
              viewMode === "split"
                ? "text-[#181818] dark:text-[#F2F2F0] font-medium border-b border-[#2563EB] dark:border-[#5B8CFF]"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode("side-by-side")}
            className={`cursor-pointer transition-colors pb-0.5 ${
              viewMode === "side-by-side"
                ? "text-[#181818] dark:text-[#F2F2F0] font-medium border-b border-[#2563EB] dark:border-[#5B8CFF]"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            }`}
          >
            Side-by-side
          </button>
          <button
            onClick={() => setViewMode("difference")}
            className={`cursor-pointer transition-colors pb-0.5 ${
              viewMode === "difference"
                ? "text-[#181818] dark:text-[#F2F2F0] font-medium border-b border-[#2563EB] dark:border-[#5B8CFF]"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            }`}
          >
            Difference
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => setIsHoldingOriginal(true)}
            onMouseUp={() => setIsHoldingOriginal(false)}
            onTouchStart={() => setIsHoldingOriginal(true)}
            onTouchEnd={() => setIsHoldingOriginal(false)}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#E8E8E3] dark:border-[#292929] text-[11px] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] select-none transition-colors"
            title="Press and hold to inspect original"
          >
            <Eye className="h-3 w-3" />
            <span>Hold for Original</span>
          </button>

          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[11px]"
            onClick={handleDownloadResult}
            title="Export image"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Main Comparison Viewport */}
      <div className="relative select-none overflow-hidden bg-[#FAFAF8] dark:bg-[#101010] flex items-center justify-center min-h-[380px] p-6">
        {/* MODE 1: SPLIT SLIDER */}
        {viewMode === "split" && (
          <div
            ref={containerRef}
            className="relative w-full max-w-[512px] h-[360px] sm:h-[440px] flex items-center justify-center overflow-hidden border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]"
          >
            {hasBase ? (
              <img
                src={baseSrc}
                alt={isHoldingOriginal ? beforeLabel : afterLabel}
                className="max-h-full max-w-full object-contain pointer-events-none"
              />
            ) : (
              <div className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A]">
                No image available
              </div>
            )}

            {!isHoldingOriginal && hasBefore && (
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
                className="absolute top-0 bottom-0 w-px bg-[#181818] dark:bg-[#F2F2F0] cursor-ew-resize flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
                onPointerDown={handlePointerDown}
              >
                <div className="h-4 w-4 rounded-full bg-white dark:bg-[#171717] border border-[#181818] dark:border-[#F2F2F0] flex items-center justify-center shadow-xs">
                  <div className="h-1.5 w-0.5 bg-[#181818] dark:bg-[#F2F2F0]" />
                </div>
              </div>
            )}

            {/* Minimal Corner Labels */}
            <div className="absolute top-2 left-2 font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] bg-white/85 dark:bg-[#171717]/85 px-1.5 py-0.5 rounded border border-[#E8E8E3] dark:border-[#292929]">
              {beforeLabel}
            </div>
            <div className="absolute top-2 right-2 font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] bg-white/85 dark:bg-[#171717]/85 px-1.5 py-0.5 rounded border border-[#E8E8E3] dark:border-[#292929]">
              {isHoldingOriginal ? `${beforeLabel} (Peeking)` : afterLabel}
            </div>
          </div>
        )}

        {/* MODE 2: SIDE-BY-SIDE */}
        {viewMode === "side-by-side" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-1.5 font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                <span>ORIGINAL</span>
                <span>{beforeLabel}</span>
              </div>
              <div className="w-full h-[320px] flex items-center justify-center border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] p-2">
                {hasBefore ? (
                  <img
                    src={beforeSrc}
                    alt={beforeLabel}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="font-mono text-xs text-[#999993]">No image</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-1.5 font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                <span>RESULT</span>
                <span>{afterLabel}</span>
              </div>
              <div className="w-full h-[320px] flex items-center justify-center border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] p-2">
                {hasAfter ? (
                  <img
                    src={afterSrc}
                    alt={afterLabel}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="font-mono text-xs text-[#999993]">No image</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: DIFFERENCE HEATMAP */}
        {viewMode === "difference" && (
          <div className="flex flex-col items-center gap-3">
            <canvas
              ref={diffCanvasRef}
              className="max-h-[420px] max-w-full object-contain border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]"
            />
            <div className="font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B]">
              Difference heatmap: Dark = Unchanged · Bright = Modified
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
