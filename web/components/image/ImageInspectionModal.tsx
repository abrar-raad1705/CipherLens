"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownTrayIcon as Download,
  ArrowPathIcon as RotateCcw,
  XMarkIcon as X,
  MagnifyingGlassPlusIcon as ZoomIn,
  MagnifyingGlassMinusIcon as ZoomOut,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImageInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  name: string;
  width: number;
  height: number;
}

export function ImageInspectionModal({
  isOpen,
  onClose,
  imageSrc,
  name,
  width,
  height,
}: ImageInspectionModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [colorMap, setColorMap] = useState<"raw" | "invert" | "heatmap">("raw");
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    gray: number;
  } | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset zoom & colorMap when opened with new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setColorMap("raw");
      setHoverPixel(null);
    }
  }, [isOpen, imageSrc]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      const scrollContainer = document.getElementById("main-scroll-container");
      if (scrollContainer) {
        scrollContainer.style.overflow = "hidden";
      }
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      const scrollContainer = document.getElementById("main-scroll-container");
      if (scrollContainer) {
        scrollContainer.style.overflow = "";
      }
    };
  }, [isOpen, onClose]);

  // Render processed pixels to canvas
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);

      if (colorMap !== "raw") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

          if (colorMap === "invert") {
            d[i] = 255 - r;
            d[i + 1] = 255 - g;
            d[i + 2] = 255 - b;
          } else if (colorMap === "heatmap") {
            // Perceptually smooth rainbow jet / thermal pseudocolor map
            const normalized = gray / 255;
            d[i] = Math.floor(Math.sin(normalized * Math.PI) * 255);
            d[i + 1] = Math.floor(Math.sin(normalized * Math.PI * 0.75 + 0.5) * 255);
            d[i + 2] = Math.floor((1 - normalized) * 255);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    };
  }, [isOpen, imageSrc, colorMap]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((prev) => {
      const next = Math.max(0.2, Math.min(8, Number((prev + delta).toFixed(2))));
      return next;
    });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      setHoverPixel({ x, y, r, g, b, gray });
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const handleDownload = () => {
    if (!imageSrc) return;
    const canvas = canvasRef.current;
    const targetUri = colorMap === "raw" || !canvas ? imageSrc : canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${colorMap}.png`;
    link.href = targetUri;
    link.click();
  };

  if (!isOpen || !isMounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-2xl border border-[#E8E8E3] dark:border-[#282828] bg-[#FAFAF8] dark:bg-[#121212] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E3] dark:border-[#242424] bg-white/80 dark:bg-[#141414]/80 backdrop-blur-md shrink-0">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h2 className="text-[13px] font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0] truncate leading-none">
              {name}
            </h2>
            <span className="text-[12px] font-normal text-[#888882] dark:text-[#888882] shrink-0 leading-none">
              {width} × {height} px
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: RAW, HEATMAP, INVERT */}
            <div className="flex items-center p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setColorMap("raw")}
                className={`px-3 py-1 text-[11px] font-medium tracking-wide uppercase rounded-md transition-all ${
                  colorMap === "raw"
                    ? "bg-white dark:bg-[#262626] text-[#181818] dark:text-[#F2F2F0] font-semibold shadow-xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                }`}
              >
                RAW
              </button>
              <button
                type="button"
                onClick={() => setColorMap("heatmap")}
                className={`px-3 py-1 text-[11px] font-medium tracking-wide uppercase rounded-md transition-all ${
                  colorMap === "heatmap"
                    ? "bg-white dark:bg-[#262626] text-[#2563EB] dark:text-[#5B8CFF] font-semibold shadow-xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                }`}
              >
                HEATMAP
              </button>
              <button
                type="button"
                onClick={() => setColorMap("invert")}
                className={`px-3 py-1 text-[11px] font-medium tracking-wide uppercase rounded-md transition-all ${
                  colorMap === "invert"
                    ? "bg-white dark:bg-[#262626] text-[#D97706] dark:text-[#FBBF24] font-semibold shadow-xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                }`}
              >
                INVERT
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 border-l border-[#E8E8E3] dark:border-[#282828] pl-2 text-[#6F6F6A] dark:text-[#A0A09B]">
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(8, Number((z + 0.25).toFixed(2))))}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.25).toFixed(2))))}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoom(1)}
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleDownload}
                title="Download current view"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 ml-1 rounded-lg text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Viewport Area with Fixed HUD Overlays */}
        <div className="relative flex-1 w-full overflow-hidden bg-[#F4F4F0] dark:bg-[#0A0A0A] select-none flex flex-col">
          {/* Scrollable Viewport Canvas with Scroll & Wheel Zoom */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            className="w-full h-full overflow-auto flex items-center justify-center p-6"
          >
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                transition: "transform 0.08s ease-out",
              }}
              className="max-h-full max-w-full object-contain cursor-crosshair rounded-lg shadow-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#141414]"
            />
          </div>

          {/* Fixed Floating HUD Overlay (Pinned to modal corners) */}
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-end">
            <div className="flex items-end justify-between w-full gap-4">
              {/* Zoom & Helper Capsule */}
              <div className="flex items-baseline gap-2 pointer-events-auto px-3 py-1.5 rounded-lg bg-white/95 dark:bg-[#181818]/95 border border-[#E5E5E0] dark:border-[#2D2D2D] shadow-md backdrop-blur-md">
                <span className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0] leading-none">
                  {Math.round(zoom * 100)}%
                </span>
                <span className="text-[12px] font-normal text-[#787873] dark:text-[#8E8E88] leading-none hidden sm:inline">
                  Scroll to zoom
                </span>
              </div>

              {/* Hover Pixel Inspector */}
              {hoverPixel && (
                <div className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-white/95 dark:bg-[#181818]/95 border border-[#E5E5E0] dark:border-[#2D2D2D] shadow-md font-mono text-[11px] text-[#181818] dark:text-[#F2F2F0] pointer-events-auto backdrop-blur-md">
                  <div className="flex items-center gap-1 text-[#6F6F6A] dark:text-[#A0A09B]">
                    <span>X:</span>
                    <span className="font-semibold text-[#181818] dark:text-[#F2F2F0]">{hoverPixel.x}</span>
                    <span className="ml-1">Y:</span>
                    <span className="font-semibold text-[#181818] dark:text-[#F2F2F0]">{hoverPixel.y}</span>
                  </div>
                  <span className="text-[#D0D0CA] dark:text-[#383838]">|</span>
                  <div className="flex items-center gap-1 text-[#6F6F6A] dark:text-[#A0A09B]">
                    <span>Intensity:</span>
                    <span className="font-semibold text-[#181818] dark:text-[#F2F2F0]">{hoverPixel.gray}</span>
                  </div>
                  <span className="text-[#D0D0CA] dark:text-[#383838]">|</span>
                  <div className="flex items-center gap-1.5 text-[#6F6F6A] dark:text-[#A0A09B]">
                    <span>RGB:</span>
                    <span className="font-semibold text-[#181818] dark:text-[#F2F2F0]">
                      ({hoverPixel.r}, {hoverPixel.g}, {hoverPixel.b})
                    </span>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shrink-0 ml-0.5"
                      style={{ backgroundColor: `rgb(${hoverPixel.r}, ${hoverPixel.g}, ${hoverPixel.b})` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
