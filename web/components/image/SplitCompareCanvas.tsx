"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CompareSlider,
  CompareSliderBefore,
  CompareSliderAfter,
  CompareSliderHandle,
} from "@/components/ui/compare-slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Spatial3DTopographyCanvas } from "./Spatial3DTopographyCanvas";

interface SplitCompareCanvasProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

type ViewMode = "split" | "side-by-side" | "difference" | "3d-topography";

export function SplitCompareCanvas({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Result",
  className = "",
}: SplitCompareCanvasProps) {
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  const handleDownloadResult = () => {
    if (!afterSrc) return;
    const link = document.createElement("a");
    link.download = `${afterLabel.toLowerCase().replace(/[^a-z0-9]/g, "_")}_result.png`;
    link.href = afterSrc;
    link.click();
  };

  const hasBefore = Boolean(beforeSrc && beforeSrc.trim().length > 0);
  const hasAfter = Boolean(afterSrc && afterSrc.trim().length > 0);

  return (
    <Card className={`flex flex-col overflow-hidden ${className}`}>
      {/* Top Bar Header */}
      <CardHeader className="py-2 px-3 border-b">
        {/* Mode Selector using shadcn Tabs */}
        <Tabs
          value={viewMode}
          onValueChange={(val) => setViewMode(val as ViewMode)}
        >
          <TabsList variant="line" className="h-7 gap-3">
            <TabsTrigger value="split" className="text-xs pb-1">
              Split
            </TabsTrigger>
            <TabsTrigger value="side-by-side" className="text-xs pb-1">
              Side-by-side
            </TabsTrigger>
            <TabsTrigger value="difference" className="text-xs pb-1">
              Difference
            </TabsTrigger>
            <TabsTrigger value="3d-topography" className="text-xs pb-1">
              3D Topography
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tools */}
        <div className="flex items-center gap-2">
          {viewMode !== "3d-topography" && (
            <button
              onMouseDown={() => setIsHoldingOriginal(true)}
              onMouseUp={() => setIsHoldingOriginal(false)}
              onTouchStart={() => setIsHoldingOriginal(true)}
              onTouchEnd={() => setIsHoldingOriginal(false)}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#E8E8E3] dark:border-[#292929] text-[11px] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] select-none transition-colors cursor-pointer"
              title="Press and hold to inspect original"
            >
              <Eye className="h-3 w-3" />
              <span>Hold for Original</span>
            </button>
          )}

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
      </CardHeader>

      {/* Main Comparison Viewport */}
      {viewMode === "3d-topography" ? (
        <div className="p-3 bg-[#FAFAF8] dark:bg-[#101010]">
          <Spatial3DTopographyCanvas
            beforeSrc={beforeSrc}
            afterSrc={afterSrc}
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
          />
        </div>
      ) : (
        <CardContent className="p-6 bg-[#FAFAF8] dark:bg-[#101010] flex items-center justify-center min-h-[380px] select-none">
          {/* MODE 1: SHADCN COMPARISON SLIDER */}
          {viewMode === "split" && (
            <div className="relative w-full max-w-[540px] h-[360px] sm:h-[440px] flex items-center justify-center overflow-hidden border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717]">
              {isHoldingOriginal ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  {hasBefore ? (
                    <img
                      src={beforeSrc}
                      alt={beforeLabel}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A]">
                      No image available
                    </div>
                  )}
                  <div className="absolute top-2 left-2 font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] bg-white/90 dark:bg-[#171717]/90 px-2 py-0.5 rounded border border-[#E8E8E3] dark:border-[#292929]">
                    {beforeLabel} (Peeking)
                  </div>
                </div>
              ) : hasBefore || hasAfter ? (
                <CompareSlider
                  defaultValue={50}
                  className="w-full h-full flex items-center justify-center"
                >
                  {/* Left side (0 to slider %): Original image */}
                  <CompareSliderAfter label={beforeLabel}>
                    {hasBefore ? (
                      <img
                        src={beforeSrc}
                        alt={beforeLabel}
                        className="h-full w-full object-contain pointer-events-none p-2"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[#999993]">
                        No original image
                      </div>
                    )}
                  </CompareSliderAfter>

                  {/* Right side (slider % to 100%): Result / Modified image */}
                  <CompareSliderBefore label={afterLabel}>
                    {hasAfter ? (
                      <img
                        src={afterSrc}
                        alt={afterLabel}
                        className="h-full w-full object-contain pointer-events-none p-2"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[#999993]">
                        No result image
                      </div>
                    )}
                  </CompareSliderBefore>

                  <CompareSliderHandle />
                </CompareSlider>
              ) : (
                <div className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A]">
                  No images to compare
                </div>
              )}
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
                <div className="w-full h-[320px] flex items-center justify-center border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-2">
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
                <div className="w-full h-[320px] flex items-center justify-center border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-2">
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
                className="max-h-[420px] max-w-full object-contain border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717]"
              />
              <div className="font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B]">
                Difference heatmap: Dark = Unchanged · Bright = Modified
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
