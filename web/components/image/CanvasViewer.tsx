"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownTrayIcon as Download,
  ArrowsPointingOutIcon as Maximize2,
  ArrowPathIcon as RotateCcw,
  MagnifyingGlassPlusIcon as ZoomIn,
  MagnifyingGlassMinusIcon as ZoomOut,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface CanvasViewerProps {
  imageSrc: string;
  title?: string;
  subtitle?: string;
  className?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function CanvasViewer({
  imageSrc,
  title,
  subtitle,
  className = "",
  isLoading = false,
  loadingText = "Executing Cryptographic Cipher...",
}: CanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cachedImgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [colorMap, setColorMap] = useState<"raw" | "invert" | "heatmap">("raw");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard shortcut: Escape to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const drawCanvas = (targetCanvas: HTMLCanvasElement | null, img: HTMLImageElement | null) => {
    if (!targetCanvas || !img) return;
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w === 0 || h === 0) return;

    targetCanvas.width = w;
    targetCanvas.height = h;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);

    if (colorMap !== "raw") {
      const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = d[i];
        if (colorMap === "invert") {
          d[i] = 255 - val;
          d[i + 1] = 255 - val;
          d[i + 2] = 255 - val;
        } else if (colorMap === "heatmap") {
          const normalized = val / 255;
          d[i] = Math.floor(Math.sin(normalized * Math.PI) * 255);
          d[i + 1] = Math.floor(Math.sin(normalized * Math.PI * 0.75 + 0.5) * 255);
          d[i + 2] = Math.floor((1 - normalized) * 255);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  };

  useEffect(() => {
    if (!imageSrc) {
      cachedImgRef.current = null;
      return;
    }

    const img = new Image();
    if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      cachedImgRef.current = img;
      drawCanvas(canvasRef.current, img);
    };

    img.onerror = (e) => {
      console.error("Failed to load image in CanvasViewer", e);
    };

    img.src = imageSrc;

    if (img.complete && (img.naturalWidth > 0 || img.width > 0)) {
      cachedImgRef.current = img;
      drawCanvas(canvasRef.current, img);
    }
  }, [imageSrc]);

  useEffect(() => {
    if (cachedImgRef.current && canvasRef.current) {
      drawCanvas(canvasRef.current, cachedImgRef.current);
    }
  }, [colorMap]);

  const handleDownload = () => {
    if (!imageSrc) return;
    const link = document.createElement("a");
    link.download = `${(title || "image").toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;
    link.href = imageSrc;
    link.click();
  };

  const renderViewerCard = (isModal: boolean) => (
    <Card
      ref={isModal ? undefined : containerRef}
      onClick={isModal ? (e) => e.stopPropagation() : undefined}
      className={`flex flex-col overflow-hidden transition-all ${
        isModal
          ? "relative w-full h-full max-w-7xl max-h-[92vh] rounded-xl border border-[#E8E8E3] dark:border-[#282828] bg-white dark:bg-[#141414] shadow-2xl animate-in zoom-in-95 duration-200"
          : `border border-[#E8E8E3] dark:border-[#282828] bg-white dark:bg-[#151515] shadow-xs ${className}`
      }`}
    >
      {/* Viewer Header */}
      <CardHeader className="py-2 px-3 border-b border-[#E8E8E3] dark:border-[#242424] flex flex-row items-center justify-between gap-3 shrink-0 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-sm">
        <div className="flex items-baseline gap-2 min-w-0">
          {title && (
            <span className="font-medium text-[#181818] dark:text-[#F2F2F0] truncate text-xs">
              {title}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B] truncate">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Colormap Button */}
          <button
            onClick={() => {
              if (colorMap === "raw") setColorMap("heatmap");
              else if (colorMap === "heatmap") setColorMap("invert");
              else setColorMap("raw");
            }}
            className="cursor-pointer"
          >
            <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0.5">
              {colorMap}
            </Badge>
          </button>

          <div className="flex items-center gap-0.5 text-[#6F6F6A] dark:text-[#A0A09B]">
            <Button
              size="icon-xs"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setZoom(1)}
              title="Reset Zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>

            {/* Fullscreen / Close Buttons */}
            {isModal ? (
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-6 w-6 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-red-500 dark:hover:text-red-400 bg-transparent hover:bg-transparent dark:hover:bg-transparent transition-colors cursor-pointer"
                onClick={() => setIsFullscreen(false)}
                title="Close (Esc)"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-6 w-6 text-[#6F6F6A] dark:text-[#A0A09B]"
                onClick={() => setIsFullscreen(true)}
                title="Fullscreen"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Canvas Viewport */}
      <CardContent
        className={`relative flex-1 ${
          isModal ? "h-full min-h-0" : "min-h-[360px]"
        } flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-auto select-none`}
      >
        <div
          className="relative inline-flex items-center justify-center overflow-hidden rounded-sm border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            transition: "transform 0.1s ease-out",
          }}
        >
          <canvas
            ref={(el) => {
              canvasRef.current = el;
              if (el && cachedImgRef.current) {
                drawCanvas(el, cachedImgRef.current);
              }
            }}
            className={`${
              isModal ? "max-h-[calc(92vh-120px)]" : "max-h-[500px]"
            } max-w-full object-contain block transition-opacity duration-300 ${
              isLoading ? "opacity-80" : "opacity-100"
            }`}
          />

          {/* Minimalist Shimmer Overlay - Strictly Constrained Across The Image Surface Only */}
          {isLoading && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent skew-x-12 animate-shimmer-sweep" />
            </div>
          )}
        </div>

        {zoom !== 1 && (
          <div className="absolute bottom-3 left-3 bg-neutral-900/95 text-white border border-white/25 px-2.5 py-1 rounded-md shadow-md backdrop-blur-md font-mono text-xs font-medium select-none">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {isFullscreen ? (
        <div
          className={`border border-dashed border-[#E8E8E3] dark:border-[#282828] rounded-xl bg-[#FAFAF8]/50 dark:bg-[#121212]/50 flex items-center justify-center min-h-[400px] ${className}`}
        >
          <div className="flex flex-col items-center gap-2 text-xs font-mono text-[#999993] dark:text-[#6A6A6A]">
            <Maximize2 className="h-5 w-5 opacity-40 animate-pulse" />
            <span>Image viewer expanded in popup modal</span>
          </div>
        </div>
      ) : (
        renderViewerCard(false)
      )}

      {isFullscreen &&
        isMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-200"
            onClick={() => setIsFullscreen(false)}
          >
            {renderViewerCard(true)}
          </div>,
          document.body
        )}
    </>
  );
}
