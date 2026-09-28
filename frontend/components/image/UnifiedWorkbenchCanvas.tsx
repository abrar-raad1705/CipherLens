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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CompareSlider,
  CompareSliderBefore,
  CompareSliderAfter,
  CompareSliderHandle,
} from "@/components/ui/compare-slider";
import { Spatial3DTopographyCanvas } from "./Spatial3DTopographyCanvas";

export type WorkbenchViewMode =
  | "original"
  | "encrypted"
  | "split"
  | "side-by-side"
  | "difference"
  | "3d-topography";

interface UnifiedWorkbenchCanvasProps {
  currentSrc: string;
  originalSrc?: string;
  title?: string;
  subtitle?: string;
  originalLabel?: string;
  currentLabel?: string;
  defaultMode?: WorkbenchViewMode;
  className?: string;
  isLoading?: boolean;
}

export function UnifiedWorkbenchCanvas({
  currentSrc,
  originalSrc,
  title,
  subtitle,
  originalLabel = "ORIGINAL",
  currentLabel = "ENCRYPTED",
  defaultMode = "encrypted",
  className = "",
  isLoading = false,
}: UnifiedWorkbenchCanvasProps) {
  const [viewMode, setViewMode] = useState<WorkbenchViewMode>(defaultMode);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const diffDataUriRef = useRef<string | null>(null);
  const imageAreaRef = useRef<HTMLDivElement | null>(null);

  const hasOriginal = Boolean(originalSrc && originalSrc.trim().length > 0);
  const hasCurrent = Boolean(currentSrc && currentSrc.trim().length > 0);

  // Determine which single image is active for single-mode rendering
  const activeSingleSrc = viewMode === "original" ? originalSrc : currentSrc;

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

  // Reset pan when switching mode or resetting zoom to 1
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [viewMode]);

  // Mouse wheel zoom when cursor is over image area in original or encrypted mode
  useEffect(() => {
    const el = imageAreaRef.current;
    if (!el || (viewMode !== "original" && viewMode !== "encrypted")) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom((prev) => {
        const next = Number((prev + zoomDelta).toFixed(2));
        const clamped = Math.min(5, Math.max(0.25, next));
        if (clamped <= 1) {
          setPan({ x: 0, y: 0 });
        }
        return clamped;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [viewMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewMode !== "original" && viewMode !== "encrypted") return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Render Difference heatmap
  useEffect(() => {
    if (viewMode !== "difference" || !originalSrc || !currentSrc) return;

    const imgBefore = new Image();
    const imgAfter = new Image();
    if (originalSrc.startsWith("http://") || originalSrc.startsWith("https://")) {
      imgBefore.crossOrigin = "anonymous";
    }
    if (currentSrc.startsWith("http://") || currentSrc.startsWith("https://")) {
      imgAfter.crossOrigin = "anonymous";
    }

    let loadedCount = 0;
    const onBothLoaded = () => {
      loadedCount++;
      if (loadedCount < 2) return;

      const w = Math.min(imgBefore.naturalWidth || imgBefore.width, imgAfter.naturalWidth || imgAfter.width);
      const h = Math.min(imgBefore.naturalHeight || imgBefore.height, imgAfter.naturalHeight || imgAfter.height);
      if (w === 0 || h === 0) return;

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

      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = w;
      offscreenCanvas.height = h;
      const offCtx = offscreenCanvas.getContext("2d");
      if (!offCtx) return;

      const diffImg = offCtx.createImageData(w, h);
      const out = diffImg.data;

      for (let i = 0; i < data1.length; i += 4) {
        const diff = Math.abs(data2[i] - data1[i]);
        const amplified = Math.min(255, diff * 2.5);

        out[i] = amplified > 128 ? 235 : Math.floor(amplified * 1.8);
        out[i + 1] = amplified;
        out[i + 2] = 255 - amplified;
        out[i + 3] = 255;
      }

      offCtx.putImageData(diffImg, 0, 0);
      const uri = offscreenCanvas.toDataURL();
      diffDataUriRef.current = uri;

      const canvas = diffCanvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(offscreenCanvas, 0, 0);
      }
    };

    imgBefore.onload = onBothLoaded;
    imgAfter.onload = onBothLoaded;
    imgBefore.onerror = (e) => console.error("Error loading beforeSrc for difference", e);
    imgAfter.onerror = (e) => console.error("Error loading currentSrc for difference", e);
    imgBefore.src = originalSrc;
    imgAfter.src = currentSrc;
    if (imgBefore.complete && (imgBefore.naturalWidth > 0 || imgBefore.width > 0)) {
      onBothLoaded();
    }
    if (imgAfter.complete && (imgAfter.naturalWidth > 0 || imgAfter.width > 0)) {
      onBothLoaded();
    }
  }, [viewMode, originalSrc, currentSrc]);

  const handleDownload = () => {
    const downloadSrc = viewMode === "original" ? originalSrc : currentSrc;
    if (!downloadSrc) return;
    const link = document.createElement("a");
    const name = viewMode === "original" ? "original_plaintext" : (title || "encrypted").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.download = `${name}.png`;
    link.href = downloadSrc;
    link.click();
  };

  const isSingleView = viewMode === "original" || viewMode === "encrypted";

  const renderWorkbenchCard = (isModal: boolean) => (
    <Card
      ref={isModal ? undefined : containerRef}
      onClick={isModal ? (e) => e.stopPropagation() : undefined}
      className={`flex flex-col overflow-hidden transition-all ${
        isModal
          ? "relative w-full h-full max-w-7xl max-h-[92vh] rounded-xl border border-[#E8E8E3] dark:border-[#282828] bg-white dark:bg-[#141414] shadow-2xl animate-in zoom-in-95 duration-200"
          : `border border-[#E8E8E3] dark:border-[#282828] bg-white dark:bg-[#151515] shadow-xs ${className}`
      }`}
    >
      {/* Top Header Bar */}
      <CardHeader className="py-2.5 px-3.5 border-b border-[#E8E8E3] dark:border-[#242424] flex flex-row items-center justify-between gap-3 shrink-0 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-sm">
        {/* View Mode Tabs */}
        <div className="flex items-center overflow-x-auto">
          <Tabs
            value={viewMode}
            onValueChange={(val) => setViewMode(val as WorkbenchViewMode)}
          >
            <TabsList variant="line" className="h-7 gap-4">
              <TabsTrigger value="original" className="text-xs pb-1" disabled={!hasOriginal}>
                Original
              </TabsTrigger>
              <TabsTrigger value="encrypted" className="text-xs pb-1">
                Encrypted
              </TabsTrigger>
              <TabsTrigger value="split" className="text-xs pb-1" disabled={!hasOriginal}>
                Split
              </TabsTrigger>
              <TabsTrigger value="side-by-side" className="text-xs pb-1" disabled={!hasOriginal}>
                Side by Side
              </TabsTrigger>
              <TabsTrigger value="difference" className="text-xs pb-1" disabled={!hasOriginal}>
                Difference
              </TabsTrigger>
              <TabsTrigger value="3d-topography" className="text-xs pb-1" disabled={!hasOriginal}>
                3D Topography
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2 pl-2 shrink-0">
          {/* Zoom Controls */}
          {isSingleView && (
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
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                title="Reset Zoom & Position"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Fullscreen / Close Buttons */}
          {isModal ? (
            <Button
              size="icon-xs"
              variant="ghost"
              className="h-6 w-6 text-[#6F6F6A] hover:text-[#DC2626] dark:text-[#A0A09B] dark:hover:text-[#F87171]"
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
      </CardHeader>

      {/* Main Viewport Content */}
      {viewMode === "3d-topography" ? (
        <Spatial3DTopographyCanvas
          key="3d-topography"
          beforeSrc={originalSrc}
          afterSrc={currentSrc}
          beforeLabel={originalLabel}
          afterLabel={currentLabel}
          isFullscreen={isModal}
          className={`animate-option-switch ${isModal ? "flex-1 min-h-0 flex flex-col" : ""}`}
        />
      ) : (
        <CardContent
          key={viewMode}
          className={`relative flex-1 ${
            isModal ? "h-full min-h-0" : "min-h-[400px]"
          } flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-auto select-none animate-option-switch`}
        >
          {/* MODES 1 & 2: ORIGINAL & ENCRYPTED VIEW */}
          {isSingleView && (
            <div
              ref={imageAreaRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative flex items-center justify-center w-full h-full ${
                isModal ? "h-full min-h-0 flex-1" : "min-h-[380px]"
              } overflow-hidden select-none ${
                zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
              }`}
            >
              {activeSingleSrc ? (
                <div
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
                    transformOrigin: "center",
                    transition: isDragging ? "none" : "transform 0.08s ease-out",
                  }}
                  className="relative inline-flex items-center justify-center overflow-hidden rounded-sm border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] shadow-2xs pointer-events-none"
                >
                  <img
                    src={activeSingleSrc}
                    alt={viewMode === "original" ? originalLabel : currentLabel}
                    draggable={false}
                    className={`${
                      isModal ? "max-h-[calc(92vh-120px)]" : "max-h-[500px]"
                    } max-w-full object-contain block transition-opacity duration-300 pointer-events-none select-none ${
                      isLoading ? "opacity-80" : "opacity-100"
                    }`}
                    style={{ imageRendering: "pixelated" }}
                  />

                  {/* Minimalist Shimmer Overlay - Strictly Constrained Across The Image Surface Only */}
                  {isLoading && (
                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                      <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent skew-x-12 animate-shimmer-sweep" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A]">
                  {viewMode === "original" ? "No original image available" : "No encrypted image available yet"}
                </div>
              )}

              {zoom !== 1 && (
                <div className="absolute bottom-3 left-3 bg-neutral-900/95 text-white border border-white/25 px-2.5 py-1 rounded-md shadow-md backdrop-blur-md font-mono text-xs font-medium select-none pointer-events-none">
                  {Math.round(zoom * 100)}%
                </div>
              )}
            </div>
          )}

          {/* MODE 3: SPLIT COMPARISON SLIDER */}
          {viewMode === "split" && (
            <div
              className={`relative w-full ${
                isModal ? "max-w-5xl h-[calc(92vh-130px)]" : "max-w-[560px] h-[380px] sm:h-[440px]"
              } flex items-center justify-center overflow-hidden border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717]`}
            >
              {hasOriginal || hasCurrent ? (
                <CompareSlider
                  defaultValue={50}
                  className="w-full h-full flex items-center justify-center"
                >
                  <CompareSliderAfter label={originalLabel}>
                    {hasOriginal ? (
                      <img
                        src={originalSrc}
                        alt={originalLabel}
                        className="h-full w-full object-contain pointer-events-none p-2"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[#999993]">
                        No original image
                      </div>
                    )}
                  </CompareSliderAfter>

                  <CompareSliderBefore label={currentLabel}>
                    {hasCurrent ? (
                      <img
                        src={currentSrc}
                        alt={currentLabel}
                        className="h-full w-full object-contain pointer-events-none p-2"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[#999993]">
                        No encrypted image
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

          {/* MODE 4: SIDE BY SIDE */}
          {viewMode === "side-by-side" && (
            <div
              className={`flex flex-col w-full ${
                isModal ? "max-w-6xl h-[calc(92vh-130px)]" : "max-w-4xl"
              } py-2 gap-2`}
            >
              <div className="w-full flex items-center justify-between px-1 font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                <span>{originalLabel.toUpperCase()}</span>
                <span>{currentLabel.toUpperCase()}</span>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 w-full ${isModal ? "h-full min-h-0 flex-1" : ""}`}>
                <div
                  className={`w-full ${
                    isModal ? "h-[calc(92vh-180px)]" : "h-[320px]"
                  } flex items-center justify-center border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-2`}
                >
                  {hasOriginal ? (
                    <img
                      src={originalSrc}
                      alt={originalLabel}
                      className="max-h-full max-w-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <span className="font-mono text-xs text-[#999993]">No image</span>
                  )}
                </div>

                <div
                  className={`w-full ${
                    isModal ? "h-[calc(92vh-180px)]" : "h-[320px]"
                  } flex items-center justify-center border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-2`}
                >
                  {hasCurrent ? (
                    <img
                      src={currentSrc}
                      alt={currentLabel}
                      className="max-h-full max-w-full object-contain pointer-events-none select-none"
                    />
                  ) : (
                    <span className="font-mono text-xs text-[#999993]">No image</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE 5: DIFFERENCE HEATMAP */}
          {viewMode === "difference" && (
            <div className="flex flex-col items-center gap-3 py-2 w-full">
              <canvas
                ref={(el) => {
                  diffCanvasRef.current = el;
                  if (el && diffDataUriRef.current) {
                    const ctx = el.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                      el.width = img.width;
                      el.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                    };
                    img.src = diffDataUriRef.current;
                  }
                }}
                className={`${
                  isModal ? "max-h-[calc(92vh-160px)]" : "max-h-[420px]"
                } max-w-full object-contain border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717]`}
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

  return (
    <>
      {isFullscreen ? (
        <div
          className={`border border-dashed border-[#E8E8E3] dark:border-[#282828] rounded-xl bg-[#FAFAF8]/50 dark:bg-[#121212]/50 flex items-center justify-center min-h-[460px] ${className}`}
        >
          <div className="flex flex-col items-center gap-2 text-xs font-mono text-[#999993] dark:text-[#6A6A6A]">
            <Maximize2 className="h-5 w-5 opacity-40 animate-pulse" />
            <span>Workbench expanded in popup modal</span>
          </div>
        </div>
      ) : (
        renderWorkbenchCard(false)
      )}

      {isFullscreen &&
        isMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-200"
            onClick={() => setIsFullscreen(false)}
          >
            {renderWorkbenchCard(true)}
          </div>,
          document.body
        )}
    </>
  );
}
