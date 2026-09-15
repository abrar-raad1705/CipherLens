"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

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

      if (colorMap !== "raw") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
    <Card
      ref={containerRef}
      className={`flex flex-col overflow-hidden transition-all ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : ""
      } ${className}`}
    >
      {/* Viewer Header */}
      <CardHeader className="py-2 px-3 border-b">
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
          {hoverPixel ? (
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B]">
              <span>({hoverPixel.x}, {hoverPixel.y})</span>
              <span>·</span>
              <span>val: {hoverPixel.val}</span>
            </div>
          ) : null}

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
            <Button
              size="icon-xs"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Canvas Viewport */}
      <CardContent className="relative flex-1 min-h-[360px] flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-auto select-none">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            transition: "transform 0.1s ease-out",
          }}
          className="max-h-[500px] max-w-full object-contain cursor-crosshair border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] rounded-sm"
        />

        {zoom !== 1 && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {Math.round(zoom * 100)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
