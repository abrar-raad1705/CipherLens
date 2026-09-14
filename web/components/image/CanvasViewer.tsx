"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  Palette,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasViewerProps {
  imageSrc: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CanvasViewer({
  imageSrc,
  title,
  subtitle,
  className = "",
}: CanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    val: number;
    norm: number;
  } | null>(null);
  const [colorMap, setColorMap] = useState<"raw" | "invert" | "heatmap">("raw");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Redraw canvas when image or colorMap changes
  useEffect(() => {
    if (!imageSrc) return;
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

      // Apply colormaps if requested
      if (colorMap !== "raw") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const val = d[i]; // Grayscale intensity
          if (colorMap === "invert") {
            d[i] = 255 - val;
            d[i + 1] = 255 - val;
            d[i + 2] = 255 - val;
          } else if (colorMap === "heatmap") {
            // Pseudo-thermal colormap
            const normalized = val / 255;
            d[i] = Math.floor(Math.sin(normalized * Math.PI) * 255); // R
            d[i + 1] = Math.floor(Math.sin(normalized * Math.PI * 0.75 + 0.5) * 255); // G
            d[i + 2] = Math.floor((1 - normalized) * 255); // B
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
    };
  }, [imageSrc, colorMap]);

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
      const val = pixel[0];
      setHoverPixel({
        x,
        y,
        val,
        norm: Number((val / 255).toFixed(3)),
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const handleDownload = () => {
    if (!imageSrc) return;
    const link = document.createElement("a");
    link.download = `${(title || "image").toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;
    link.href = imageSrc;
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-lg bg-white dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] overflow-hidden shadow-xs transition-all ${
        isFullscreen ? "fixed inset-4 z-50 bg-white/98 dark:bg-[#191919]/98 shadow-2xl" : ""
      } ${className}`}
    >
      {/* Viewer Header HUD */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 border-b border-[#EDEDEB] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#252525] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-[#0F7B6C] dark:bg-[#4DAB9A]" />
          <div className="truncate">
            {title && (
              <span className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="ml-2 text-[11px] text-[#787774] dark:text-[#9B9B9B]">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* HUD Controls & Coordinates */}
        <div className="flex items-center gap-2 text-[11px] ml-auto">
          {hoverPixel ? (
            <div className="flex items-center gap-1.5 bg-[#F1F1EF] dark:bg-[#2C2C2C] px-2 py-0.5 rounded text-[#37352F] dark:text-[#E6E5E3] border border-[#EDEDEB] dark:border-[#383838] font-mono text-[10px]">
              <span className="text-[#787774] dark:text-[#9B9B9B]">({hoverPixel.x}, {hoverPixel.y})</span>
              <span className="text-[#D3D1CB] dark:text-[#4A4A4A]">|</span>
              <span>val: {hoverPixel.val}</span>
              <span className="text-[#787774] dark:text-[#9B9B9B]">({hoverPixel.norm})</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center text-[10px] text-[#9B9A97] dark:text-[#6A6A6A]">
              Hover canvas to inspect pixel
            </div>
          )}

          {/* Colormap Toggle Button */}
          <button
            onClick={() => {
              if (colorMap === "raw") setColorMap("heatmap");
              else if (colorMap === "heatmap") setColorMap("invert");
              else setColorMap("raw");
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
              colorMap !== "raw"
                ? "bg-[#D3E5EF] text-[#183347] border-[#C4DCED] dark:bg-[#1E394B] dark:text-[#529CCA] dark:border-[#24455C]"
                : "bg-white dark:bg-[#252525] text-[#787774] dark:text-[#9B9B9B] border-[#EDEDEB] dark:border-[#2E2E2E] hover:text-[#37352F] dark:hover:text-[#E6E5E3]"
            }`}
            title="Toggle Visual Colormaps (Raw, Pseudo-Heatmap, Invert)"
          >
            <Palette className="h-3 w-3" />
            <span className="uppercase text-[10px]">{colorMap}</span>
          </button>

          {/* Zoom & Action Controls */}
          <div className="flex items-center gap-0.5 bg-[#F1F1EF] dark:bg-[#2A2A2A] p-0.5 rounded border border-[#EDEDEB] dark:border-[#333333]">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
              onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
              onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
              onClick={() => setZoom(1)}
              title="Reset Zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
              onClick={handleDownload}
              title="Download Image"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative flex-1 min-h-[340px] flex items-center justify-center p-6 bg-[#F7F6F3] dark:bg-[#141414] overflow-auto select-none">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            transition: "transform 0.1s ease-out",
          }}
          className="max-h-[512px] max-w-full object-contain cursor-crosshair rounded border border-[#EDEDEB] dark:border-[#2E2E2E] shadow-sm bg-white dark:bg-[#1E1E1E]"
        />

        {zoom !== 1 && (
          <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-[#202020]/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-[#787774] dark:text-[#9B9B9B] border border-[#EDEDEB] dark:border-[#2E2E2E]">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
