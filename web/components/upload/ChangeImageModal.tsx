"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Check,
  Crop,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";

interface ChangeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangeImageModal({ isOpen, onClose }: ChangeImageModalProps) {
  const {
    artifacts,
    activeArtifact,
    presets,
    addArtifact,
    setActiveArtifactId,
    loadPresetById,
  } = useWorkspace();

  // Mode: "choose" (gallery/upload) or "crop" (adjust zoom & pan)
  const [mode, setMode] = useState<"choose" | "crop">("choose");
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [rawFileName, setRawFileName] = useState<string>("image.png");

  // Cropper state
  const [baseDim, setBaseDim] = useState<{ w: number; h: number }>({ w: 240, h: 240 });
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // State ref to eliminate stale closures and lag in rapid event listeners
  const stateRef = useRef({ zoom, offset, baseDim });
  stateRef.current = { zoom, offset, baseDim };

  // Prevent background scroll and interaction when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, [isOpen]);

  const resetModalState = () => {
    setMode("choose");
    setRawImageSrc(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setBaseDim({ w: 240, h: 240 });
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  // Clamping function to guarantee the aperture (240x240) is ALWAYS 100% filled with image pixels
  const updateClampedOffset = useCallback(
    (nextX: number, nextY: number, curZoom = zoom, curDim = baseDim) => {
      const dispW = curDim.w * curZoom;
      const dispH = curDim.h * curZoom;
      // Maximum offset allowed before image edge moves inside the 240x240 aperture
      const maxOffsetX = Math.max(0, (dispW - 240) / 2);
      const maxOffsetY = Math.max(0, (dispH - 240) / 2);

      setOffset({
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
      });
    },
    [zoom, baseDim]
  );

  // Prevent mouse wheel from scrolling the background website and smoothly adjust zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mode !== "crop") return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const { zoom: curZoom, offset: curOffset, baseDim: curDim } = stateRef.current;
      const delta = e.deltaY * -0.002;
      const nextZoom = Math.min(3.5, Math.max(1, Number((curZoom + delta).toFixed(2))));
      setZoom(nextZoom);

      const dispW = curDim.w * nextZoom;
      const dispH = curDim.h * nextZoom;
      const maxOffsetX = Math.max(0, (dispW - 240) / 2);
      const maxOffsetY = Math.max(0, (dispH - 240) / 2);

      setOffset({
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, curOffset.x)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, curOffset.y)),
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [mode]);

  // Handle keyboard events: escape closes modal, arrows pan image, prevent window scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }

      const isScrollKey = [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "PageUp",
        "PageDown",
        "Home",
        "End",
      ].includes(e.code) || [" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);

      if (isScrollKey) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (mode === "crop") {
        const { offset: curOffset, zoom: curZoom, baseDim: curDim } = stateRef.current;
        const step = e.shiftKey ? 14 : 4;
        let nextX = curOffset.x;
        let nextY = curOffset.y;

        if (e.key === "ArrowLeft") {
          nextX -= step;
        } else if (e.key === "ArrowRight") {
          nextX += step;
        } else if (e.key === "ArrowUp") {
          nextY -= step;
        } else if (e.key === "ArrowDown") {
          nextY += step;
        } else {
          return;
        }

        const dispW = curDim.w * curZoom;
        const dispH = curDim.h * curZoom;
        const maxOffsetX = Math.max(0, (dispW - 240) / 2);
        const maxOffsetY = Math.max(0, (dispH - 240) / 2);

        setOffset({
          x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
          y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setRawImageSrc(src);
      setRawFileName(file.name);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setMode("crop");
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 240;
    const nh = img.naturalHeight || 240;
    // Scale image so its smaller dimension is at least 240px, ensuring 100% aperture coverage
    const scale = 240 / Math.min(nw, nh);
    const bw = Math.round(nw * scale);
    const bh = Math.round(nh * scale);
    const newDim = { w: bw, h: bh };
    setBaseDim(newDim);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Pointer drag handlers for cropping with pointer capture to prevent leaking events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    updateClampedOffset(nextX, nextY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Confirm crop and produce cropped image data URL with 100% fill and no black borders
  const handleConfirmCrop = () => {
    if (!rawImageSrc || !imageRef.current) return;

    const img = imageRef.current;
    const targetSize = 512;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = targetSize;
    outputCanvas.height = targetSize;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const dispW = baseDim.w * zoom;
    const dispH = baseDim.h * zoom;

    // Relative to the 240x240 aperture center
    const relX = offset.x - dispW / 2 + 120;
    const relY = offset.y - dispH / 2 + 120;

    const scale = targetSize / 240;

    ctx.drawImage(
      img,
      relX * scale,
      relY * scale,
      dispW * scale,
      dispH * scale
    );

    const croppedDataUri = outputCanvas.toDataURL("image/png");
    addArtifact({
      name: rawFileName.replace(/\.[^/.]+$/, "") + " [Cropped]",
      dataUri: croppedDataUri,
      width: targetSize,
      height: targetSize,
      sourceBench: "upload",
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={handleClose}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8E8E3] dark:border-[#292929]">
          <div className="flex items-center gap-2">
            {mode === "crop" ? (
              <Crop className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
            ) : (
              <ImageIcon className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
            )}
            <span className="font-medium text-sm text-[#181818] dark:text-[#F2F2F0]">
              {mode === "crop" ? "Adjust & Crop Target Image" : "Select or Upload Image Target"}
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1 rounded text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {mode === "choose" ? (
          <div className="p-5 space-y-6 overflow-y-auto">
            {/* Upload Area */}
            <div className="space-y-2">
              <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                UPLOAD NEW IMAGE
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("modal-file-upload")?.click()}
                className={`border border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center ${
                  dragOver
                    ? "border-[#2563EB] bg-[#2563EB]/5"
                    : "border-[#D7D7D1] dark:border-[#383838] hover:border-[#181818] dark:hover:border-[#F2F2F0] bg-[#FAFAF8] dark:bg-[#121212]"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-white dark:bg-[#1E1E1E] border border-[#E8E8E3] dark:border-[#292929] flex items-center justify-center mb-2 shadow-xs">
                  <Upload className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
                </div>
                <span className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">
                  Click to browse or drop image here
                </span>
                <span className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-1">
                  PNG, JPG, WEBP • Crop and zoom window appears next
                </span>
                <input
                  id="modal-file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Already Uploaded Artifacts */}
            {artifacts.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  SELECT FROM WORKSPACE ARTIFACTS ({artifacts.length})
                </div>
                <div className="border border-[#E8E8E3] dark:border-[#292929] rounded-md divide-y divide-[#E8E8E3] dark:divide-[#292929] max-h-48 overflow-y-auto">
                  {artifacts.map((art) => {
                    const isSelected = activeArtifact?.id === art.id;
                    return (
                      <div
                        key={art.id}
                        onClick={() => {
                          setActiveArtifactId(art.id);
                          onClose();
                        }}
                        className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer text-xs ${
                          isSelected
                            ? "bg-[#2563EB]/5 dark:bg-[#5B8CFF]/10"
                            : "hover:bg-[#F4F4F1] dark:hover:bg-[#1F1F1F]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {art.dataUri ? (
                            <img
                              src={art.dataUri}
                              alt={art.name}
                              className="h-8 w-8 rounded object-cover border border-[#E8E8E3] dark:border-[#292929] shrink-0"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <div className="font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                              {art.name}
                            </div>
                            <div className="font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                              {art.width} × {art.height} · {art.sourceBench}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[#2563EB] dark:text-[#5B8CFF] font-medium text-xs">
                            <Check className="h-4 w-4" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="h-6 text-xs">
                            Select
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Calibration Presets */}
            {presets.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  CALIBRATION STANDARDS
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        loadPresetById(p.id);
                        onClose();
                      }}
                      className="flex items-center gap-2 p-2 rounded-md border border-[#E8E8E3] dark:border-[#292929] hover:bg-[#F4F4F1] dark:hover:bg-[#1F1F1F] text-left transition-colors cursor-pointer"
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-7 w-7 rounded object-cover border border-[#E8E8E3] dark:border-[#292929] shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                          {p.name}
                        </div>
                        <div className="font-mono text-[10px] text-[#999993] dark:text-[#6A6A6A]">
                          {p.width} × {p.height}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Crop & Zoom Mode */
          <div className="p-5 space-y-4">
            <div className="text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
              Drag to reposition, use slider or wheel to zoom into the focal region:
            </div>

            {/* Crop Viewport */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full h-[320px] rounded-md bg-[#0F0F0F] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
            >
              {rawImageSrc && (
                <img
                  ref={imageRef}
                  src={rawImageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  draggable={false}
                  style={{
                    width: `${baseDim.w}px`,
                    height: `${baseDim.h}px`,
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: "center",
                    maxWidth: "none",
                    maxHeight: "none",
                    userSelect: "none",
                    transition: isDragging ? "none" : "transform 0.05s ease-out",
                  }}
                  className="pointer-events-none"
                />
              )}

              {/* Mask with 240x240 square aperture */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[240px] h-[240px] rounded-md border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] relative">
                  {/* Subtle Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div />
                  </div>
                  {/* Corner Target Markers */}
                  <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
                  <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
                  <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
                </div>
              </div>
            </div>

            {/* Viewport Info */}
            <div className="flex items-center justify-between text-[11px] text-[#6F6F6A] dark:text-[#A0A09B] font-mono px-1">
              <span>Square 1:1 Aperture (512×512 output)</span>
              <span>Constrained to image boundaries</span>
            </div>

            {/* Zoom Slider Control */}
            <div className="flex items-center gap-3 pt-1">
              <ZoomOut className="h-4 w-4 text-[#999993] dark:text-[#6A6A6A]" />
              <input
                type="range"
                min={1}
                max={3.5}
                step={0.05}
                value={zoom}
                onChange={(e) => {
                  const nextZoom = Number(e.target.value);
                  setZoom(nextZoom);
                  updateClampedOffset(offset.x, offset.y, nextZoom, baseDim);
                }}
                className="flex-1 cursor-pointer"
              />
              <ZoomIn className="h-4 w-4 text-[#999993] dark:text-[#6A6A6A]" />
              <span className="font-mono text-xs w-12 text-right text-[#6F6F6A] dark:text-[#A0A09B]">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                title="Reset zoom & position"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
              <Button
                variant="outline"
                size="md"
                onClick={() => setMode("choose")}
              >
                Back to gallery
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmCrop}
              >
                <Check className="h-4 w-4 mr-1.5" />
                <span>Confirm &amp; Use Target</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
