"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon as Check,
  ClockIcon as Clock,
  ScissorsIcon as Crop,
  PhotoIcon as ImageIcon,
  ArrowPathIcon as RotateCcw,
  TrashIcon as Trash,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";
import { cn } from "@/lib/utils/cn";

export interface SelectedImagePayload {
  name: string;
  dataUri: string;
  width: number;
  height: number;
  sizeBytes?: number;
}

export interface ChangeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (image: SelectedImagePayload) => void;
  initialMode?: "choose" | "crop";
  initialImageSrc?: string | null;
  initialFileName?: string;
  title?: string;
  skipCrop?: boolean;
}

type DragHandle = "move" | "nw" | "ne" | "sw" | "se" | null;

interface DragState {
  handle: DragHandle;
  startX: number;
  startY: number;
  startBox: { x: number; y: number; w: number; h: number };
}

export function ChangeImageModal({
  isOpen,
  onClose,
  onSelectImage,
  initialMode,
  initialImageSrc,
  initialFileName,
  title,
  skipCrop = false,
}: ChangeImageModalProps) {
  const {
    artifacts,
    presets,
    loadPresetById,
    addArtifact,
    setActiveArtifactId,
    removeArtifact,
  } = useWorkspace();

  // Mode: "choose" (gallery/upload) or "crop" (resizable selection box)
  const [mode, setMode] = useState<"choose" | "crop">("choose");
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [rawFileName, setRawFileName] = useState<string>("image.png");

  // Cropper state
  const [naturalDim, setNaturalDim] = useState<{ w: number; h: number }>({ w: 512, h: 512 });
  const [imgDim, setImgDim] = useState<{ w: number; h: number }>({ w: 320, h: 320 });
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 240,
    h: 240,
  });
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "free">("1:1");
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  // Prevent background scroll and interaction when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;

    const scrollContainer = document.getElementById("main-scroll-container");
    const originalContainerOverflow = scrollContainer ? scrollContainer.style.overflow : "";

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    if (scrollContainer) {
      scrollContainer.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      if (scrollContainer) {
        scrollContainer.style.overflow = originalContainerOverflow;
      }
    };
  }, [isOpen]);

  const resetModalState = () => {
    setMode("choose");
    setRawImageSrc(null);
    dragStateRef.current = null;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialImageSrc) {
        setRawImageSrc(initialImageSrc);
        setRawFileName(initialFileName || "image.png");
        setMode("crop");
      } else if (initialMode) {
        setMode(initialMode);
      } else {
        setMode("choose");
      }
    } else {
      resetModalState();
    }
  }, [isOpen, initialImageSrc, initialFileName, initialMode]);

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  // Keyboard navigation
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

      // Keyboard arrow nudging for cropBox
      if (mode === "crop") {
        const step = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;
        else if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;

        if (dx !== 0 || dy !== 0) {
          setCropBox((prev) => {
            const nextX = Math.max(0, Math.min(imgDim.w - prev.w, prev.x + dx));
            const nextY = Math.max(0, Math.min(imgDim.h - prev.h, prev.y + dy));
            return { ...prev, x: nextX, y: nextY };
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, mode, imgDim]);

  // Load and calibrate image inside container whenever rawImageSrc changes
  useEffect(() => {
    if (!rawImageSrc) return;

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || 512;
      const nh = img.naturalHeight || 512;
      setNaturalDim({ w: nw, h: nh });

      const maxW = 540;
      const maxH = 360;
      const scale = Math.min(maxW / nw, maxH / nh, 1);
      const dispW = Math.max(120, Math.round(nw * scale));
      const dispH = Math.max(120, Math.round(nh * scale));
      setImgDim({ w: dispW, h: dispH });

      const side = Math.min(dispW, dispH);
      const boxX = Math.round((dispW - side) / 2);
      const boxY = Math.round((dispH - side) / 2);
      setCropBox({ x: boxX, y: boxY, w: side, h: side });
      setAspectRatio("1:1");
    };
    img.src = rawImageSrc;
  }, [rawImageSrc]);

  if (!isOpen) return null;


  // Start dragging handle (corner or move)
  const handleStartDrag = (e: React.PointerEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
    };
    setIsDragging(true);
  };

  // Dragging interaction logic
  const handlePointerMove = (e: React.PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds || !ds.handle) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    const { startBox } = ds;
    const minSize = 32;

    if (ds.handle === "move") {
      const nextX = Math.max(0, Math.min(imgDim.w - startBox.w, startBox.x + dx));
      const nextY = Math.max(0, Math.min(imgDim.h - startBox.h, startBox.y + dy));
      setCropBox({ ...startBox, x: nextX, y: nextY });
      return;
    }

    if (aspectRatio === "1:1") {
      // 1:1 Square resizing with bounds clamping
      if (ds.handle === "se") {
        const delta = Math.round((dx + dy) / 2);
        const maxDelta = Math.min(imgDim.w - (startBox.x + startBox.w), imgDim.h - (startBox.y + startBox.h));
        const maxShrink = startBox.w - minSize;
        const clampedDelta = Math.max(-maxShrink, Math.min(maxDelta, delta));
        const newSide = startBox.w + clampedDelta;
        setCropBox({ x: startBox.x, y: startBox.y, w: newSide, h: newSide });
      } else if (ds.handle === "nw") {
        const delta = Math.round((-dx - dy) / 2);
        const maxExpansion = Math.min(startBox.x, startBox.y);
        const maxShrink = startBox.w - minSize;
        const clampedDelta = Math.max(-maxShrink, Math.min(maxExpansion, delta));
        const newSide = startBox.w + clampedDelta;
        setCropBox({
          x: startBox.x - clampedDelta,
          y: startBox.y - clampedDelta,
          w: newSide,
          h: newSide,
        });
      } else if (ds.handle === "ne") {
        const delta = Math.round((dx - dy) / 2);
        const maxExpansion = Math.min(imgDim.w - (startBox.x + startBox.w), startBox.y);
        const maxShrink = startBox.w - minSize;
        const clampedDelta = Math.max(-maxShrink, Math.min(maxExpansion, delta));
        const newSide = startBox.w + clampedDelta;
        setCropBox({
          x: startBox.x,
          y: startBox.y - clampedDelta,
          w: newSide,
          h: newSide,
        });
      } else if (ds.handle === "sw") {
        const delta = Math.round((-dx + dy) / 2);
        const maxExpansion = Math.min(startBox.x, imgDim.h - (startBox.y + startBox.h));
        const maxShrink = startBox.w - minSize;
        const clampedDelta = Math.max(-maxShrink, Math.min(maxExpansion, delta));
        const newSide = startBox.w + clampedDelta;
        setCropBox({
          x: startBox.x - clampedDelta,
          y: startBox.y,
          w: newSide,
          h: newSide,
        });
      }
    } else {
      // Free form resizing
      let newX = startBox.x;
      let newY = startBox.y;
      let newW = startBox.w;
      let newH = startBox.h;

      if (ds.handle === "se") {
        newW = Math.max(minSize, Math.min(imgDim.w - startBox.x, startBox.w + dx));
        newH = Math.max(minSize, Math.min(imgDim.h - startBox.y, startBox.h + dy));
      } else if (ds.handle === "sw") {
        const maxDx = startBox.w - minSize;
        const clampedDx = Math.max(-startBox.x, Math.min(maxDx, dx));
        newX = startBox.x + clampedDx;
        newW = startBox.w - clampedDx;
        newH = Math.max(minSize, Math.min(imgDim.h - startBox.y, startBox.h + dy));
      } else if (ds.handle === "ne") {
        newW = Math.max(minSize, Math.min(imgDim.w - startBox.x, startBox.w + dx));
        const maxDy = startBox.h - minSize;
        const clampedDy = Math.max(-startBox.y, Math.min(maxDy, dy));
        newY = startBox.y + clampedDy;
        newH = startBox.h - clampedDy;
      } else if (ds.handle === "nw") {
        const maxDx = startBox.w - minSize;
        const clampedDx = Math.max(-startBox.x, Math.min(maxDx, dx));
        newX = startBox.x + clampedDx;
        newW = startBox.w - clampedDx;
        const maxDy = startBox.h - minSize;
        const clampedDy = Math.max(-startBox.y, Math.min(maxDy, dy));
        newY = startBox.y + clampedDy;
        newH = startBox.h - clampedDy;
      }

      setCropBox({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStateRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      dragStateRef.current = null;
      setIsDragging(false);
    }
  };

  // Confirm crop and produce cropped image data URL
  const handleConfirmCrop = () => {
    if (!rawImageSrc || !imageRef.current) return;

    const img = imageRef.current;
    const sourceX = (cropBox.x / imgDim.w) * naturalDim.w;
    const sourceY = (cropBox.y / imgDim.h) * naturalDim.h;
    const sourceW = (cropBox.w / imgDim.w) * naturalDim.w;
    const sourceH = (cropBox.h / imgDim.h) * naturalDim.h;

    const outW = Math.max(1, Math.round(sourceW));
    const outH = Math.max(1, Math.round(sourceH));

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outW;
    outputCanvas.height = outH;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outW, outH);

    const croppedDataUri = outputCanvas.toDataURL("image/png");

    if (onSelectImage) {
      onSelectImage({
        name: rawFileName.replace(/\.[^/.]+$/, "") + " [Cropped]",
        dataUri: croppedDataUri,
        width: outW,
        height: outH,
      });
      handleClose();
      return;
    }

    addArtifact({
      name: rawFileName.replace(/\.[^/.]+$/, "") + " [Cropped]",
      dataUri: croppedDataUri,
      width: outW,
      height: outH,
      sourceBench: "upload",
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("cipherlens_user_has_selected", "true");
    }

    onClose();
  };

  // Live dimension calculations
  const curPixelW = naturalDim.w > 0 && imgDim.w > 0 ? Math.round((cropBox.w / imgDim.w) * naturalDim.w) : 512;
  const curPixelH = naturalDim.h > 0 && imgDim.h > 0 ? Math.round((cropBox.h / imgDim.h) * naturalDim.h) : 512;

  // Scroll to zoom the crop selection box
  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Determine zoom factor: scrolling up zooms in (selection shrinks to show closer area), scrolling down zooms out
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    const minSize = 32;

    if (aspectRatio === "1:1") {
      const curSide = cropBox.w;
      const newSide = Math.round(curSide * zoomFactor);
      const clampedSide = Math.max(minSize, Math.min(imgDim.w, imgDim.h, newSide));
      const deltaSide = clampedSide - curSide;

      // Zoom towards center of the current crop box
      const newX = Math.max(0, Math.min(imgDim.w - clampedSide, Math.round(cropBox.x - deltaSide / 2)));
      const newY = Math.max(0, Math.min(imgDim.h - clampedSide, Math.round(cropBox.y - deltaSide / 2)));

      setCropBox({
        x: newX,
        y: newY,
        w: clampedSide,
        h: clampedSide,
      });
    } else {
      const newW = Math.round(cropBox.w * zoomFactor);
      const newH = Math.round(cropBox.h * zoomFactor);
      const clampedW = Math.max(minSize, Math.min(imgDim.w, newW));
      const clampedH = Math.max(minSize, Math.min(imgDim.h, newH));
      const deltaW = clampedW - cropBox.w;
      const deltaH = clampedH - cropBox.h;

      const newX = Math.max(0, Math.min(imgDim.w - clampedW, Math.round(cropBox.x - deltaW / 2)));
      const newY = Math.max(0, Math.min(imgDim.h - clampedH, Math.round(cropBox.y - deltaH / 2)));

      setCropBox({
        x: newX,
        y: newY,
        w: clampedW,
        h: clampedH,
      });
    }
  };

  if (!isOpen || !isMounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8E8E3] dark:border-[#292929]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-[#2563EB] dark:text-[#5B8CFF] border border-blue-500/20 shadow-xs flex items-center justify-center shrink-0">
              {mode === "crop" ? (
                <Crop className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
            <span className="text-base font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0]">
              {mode === "crop"
                ? "Crop & Adjust Target Selection"
                : title && title !== "Choose from Artifacts & Benchmarks" && title !== "Select Image Target"
                ? title
                : "Artifacts and Benchmarks"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {mode === "choose" && (
              <span className="text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                {skipCrop ? "Click to select" : "Click to select or crop"}
              </span>
            )}
            <button
              onClick={handleClose}
              className="p-1 rounded text-[#6F6F6A] dark:text-[#A0A09B] hover:text-red-500 dark:hover:text-red-400 bg-transparent hover:bg-transparent transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {mode === "choose" ? (
          <div className="p-5 space-y-6 overflow-y-auto">
            {/* Artifacts: Photo Gallery Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                  <span>Artifacts</span>
                </div>
              </div>

              {artifacts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto p-1">
                  {artifacts.map((art, index) => {
                    const isRecent = index === 0;
                    return (
                      <div
                        key={art.id}
                        title={art.name}
                        onClick={() => {
                          if (onSelectImage) {
                            onSelectImage({
                              name: art.name,
                              dataUri: art.dataUri,
                              width: art.width,
                              height: art.height,
                            });
                            handleClose();
                            return;
                          }
                          setActiveArtifactId(art.id);
                          if (typeof window !== "undefined") {
                            localStorage.setItem("cipherlens_user_has_selected", "true");
                          }
                          onClose();
                        }}
                        className={cn(
                          "group relative aspect-square rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer bg-[#0A0A0A]",
                          isRecent
                            ? "border-[#2563EB] dark:border-[#5B8CFF] ring-2 ring-[#2563EB]/50 dark:ring-[#5B8CFF]/50 shadow-md"
                            : "border-[#E8E8E3] dark:border-[#292929] hover:border-[#888888] dark:hover:border-[#666666]"
                        )}
                      >
                        {/* Thumbnail Image */}
                        {art.dataUri ? (
                          <img
                            src={art.dataUri}
                            alt={art.name}
                            title={art.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6A6A6A]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}

                        {/* Top badges: Recent Badge */}
                        {isRecent && (
                          <div className="absolute top-2 left-2 pointer-events-none z-10">
                            <div className="px-2 py-0.5 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF] text-white text-[10px] font-medium flex items-center gap-1 shadow-md">
                              <Clock className="h-3 w-3" />
                              <span>Recent</span>
                            </div>
                          </div>
                        )}

                        {/* Hover Overlay with metadata, crop button & delete button */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-white">
                          <div className="flex justify-end gap-1.5 pointer-events-auto">
                            {!skipCrop && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (art.dataUri) {
                                    setRawImageSrc(art.dataUri);
                                    setRawFileName(art.name);
                                    setMode("crop");
                                  }
                                }}
                                className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-transform active:scale-95 shadow-sm cursor-pointer"
                                title={`Crop ${art.name}`}
                              >
                                <Crop className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeArtifact(art.id);
                              }}
                              className="p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white/90 hover:text-white border border-white/20 transition-all active:scale-95 shadow-sm cursor-pointer"
                              title={`Delete ${art.name}`}
                              aria-label={`Delete ${art.name}`}
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="min-w-0" title={art.name}>
                            <div className="text-xs font-medium line-clamp-2 break-all drop-shadow-sm" title={art.name}>
                              {art.name}
                            </div>
                            <div className="text-[11px] text-white/80 drop-shadow-sm font-normal">
                              {art.width} × {art.height} px
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 border border-dashed border-[#E8E8E3] dark:border-[#292929] rounded-lg text-center space-y-1.5">
                  <ImageIcon className="h-8 w-8 text-[#999993] dark:text-[#6A6A6A] mx-auto" />
                  <div className="text-xs font-medium text-[#181818] dark:text-[#F2F2F0]">
                    No artifacts yet
                  </div>
                  <div className="text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                    Pick a calibration benchmark below to save artifacts
                  </div>
                </div>
              )}
            </div>

            {/* Calibration Standards / Presets */}
            {presets.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E8E8E3] dark:border-[#292929]">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                    <span>Calibration Benchmarks</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto p-1">
                  {presets.map((preset) => {
                    return (
                      <div
                        key={preset.id}
                        title={preset.name}
                        onClick={() => {
                          if (onSelectImage) {
                            onSelectImage({
                              name: preset.name,
                              dataUri: preset.image,
                              width: preset.width,
                              height: preset.height,
                            });
                            handleClose();
                            return;
                          }
                          loadPresetById(preset.id);
                          if (typeof window !== "undefined") {
                            localStorage.setItem("cipherlens_user_has_selected", "true");
                          }
                          onClose();
                        }}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-[#E8E8E3] dark:border-[#292929] hover:border-[#888888] dark:hover:border-[#666666] transition-all duration-200 cursor-pointer bg-[#0A0A0A]"
                      >
                        {/* Thumbnail Image */}
                        {preset.image ? (
                          <img
                            src={preset.image}
                            alt={preset.name}
                            title={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6A6A6A]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}

                        {/* Hover Overlay with metadata & crop button */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 text-white">
                          <div className="flex justify-end pointer-events-auto">
                            {!skipCrop && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (preset.image) {
                                    setRawImageSrc(preset.image);
                                    setRawFileName(preset.name);
                                    setMode("crop");
                                  }
                                }}
                                className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-transform active:scale-95 shadow-sm cursor-pointer"
                                title={`Crop ${preset.name}`}
                              >
                                <Crop className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="min-w-0" title={preset.name}>
                            <div className="text-xs font-medium line-clamp-2 break-words drop-shadow-sm" title={preset.name}>
                              {preset.name}
                            </div>
                            <div className="text-[11px] text-white/80 drop-shadow-sm font-normal">
                              {preset.width} × {preset.height} px
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Resizable Crop Mode */
          <div className="p-5 space-y-4">
            {/* Viewport Box */}
            <div
              ref={containerRef}
              className="relative w-full h-[360px] rounded-lg bg-[#0D0D0D] overflow-hidden flex items-center justify-center select-none touch-none cursor-crosshair"
              onWheel={handleWheelZoom}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {rawImageSrc && (
                <div
                  style={{ width: `${imgDim.w}px`, height: `${imgDim.h}px` }}
                  className="relative select-none overflow-hidden shadow-2xl"
                >
                  {/* Natural Image Canvas/Image */}
                  <img
                    ref={imageRef}
                    src={rawImageSrc}
                    alt="Crop target"
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none select-none block"
                  />

                  {/* Resizable & Draggable Selection Box */}
                  <div
                    style={{
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.w}px`,
                      height: `${cropBox.h}px`,
                      transition: isDragging ? "none" : "all 0.05s ease-out",
                    }}
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] select-none"
                  >
                    {/* Center Drag Handle (Move selection around) */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, "move")}
                      className="absolute inset-0 cursor-move"
                      title="Drag to reposition selection"
                    >
                      {/* Rule of Thirds Guide Lines */}
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
                    </div>

                    {/* Live Dimension Badge Floating on Selection Border */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#181818]/95 border border-white/20 text-[#F2F2F0] text-xs font-medium tracking-normal shadow-xl pointer-events-none whitespace-nowrap z-30 flex items-center gap-1.5">
                      <span>{curPixelW} × {curPixelH} px</span>
                    </div>

                    {/* 4 Draggable Corner Handles */}
                    {/* Top-Left */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, "nw")}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#181818] rounded-xs shadow-lg cursor-nwse-resize hover:scale-125 transition-transform z-30 active:scale-125"
                      title="Drag corner to resize"
                    />
                    {/* Top-Right */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, "ne")}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#181818] rounded-xs shadow-lg cursor-nesw-resize hover:scale-125 transition-transform z-30 active:scale-125"
                      title="Drag corner to resize"
                    />
                    {/* Bottom-Left */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, "sw")}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#181818] rounded-xs shadow-lg cursor-nesw-resize hover:scale-125 transition-transform z-30 active:scale-125"
                      title="Drag corner to resize"
                    />
                    {/* Bottom-Right */}
                    <div
                      onPointerDown={(e) => handleStartDrag(e, "se")}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#181818] rounded-xs shadow-lg cursor-nwse-resize hover:scale-125 transition-transform z-30 active:scale-125"
                      title="Drag corner to resize"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Selection Toolbar */}
            <div className="flex items-center justify-between pt-1">
              {/* Aspect Ratio Mode */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant={aspectRatio === "1:1" ? "primary" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5 font-medium"
                  onClick={() => {
                    setAspectRatio("1:1");
                    const side = Math.min(cropBox.w, cropBox.h);
                    setCropBox({ ...cropBox, w: side, h: side });
                  }}
                >
                  1:1 Square
                </Button>
                <Button
                  variant={aspectRatio === "free" ? "primary" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5 font-medium"
                  onClick={() => setAspectRatio("free")}
                >
                  Free Form
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {naturalDim.w >= 512 && naturalDim.h >= 512 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 font-medium text-[#6F6F6A] dark:text-[#A0A09B]"
                    onClick={() => {
                      setAspectRatio("1:1");
                      const targetW = Math.round((512 / naturalDim.w) * imgDim.w);
                      const targetH = Math.round((512 / naturalDim.h) * imgDim.h);
                      const side = Math.min(targetW, targetH, imgDim.w, imgDim.h);
                      const boxX = Math.round((imgDim.w - side) / 2);
                      const boxY = Math.round((imgDim.h - side) / 2);
                      setCropBox({ x: boxX, y: boxY, w: side, h: side });
                    }}
                    title="Set selection to 512×512 natural pixels"
                  >
                    512×512
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 font-medium text-[#6F6F6A] dark:text-[#A0A09B]"
                  onClick={() => {
                    setAspectRatio("free");
                    setCropBox({ x: 0, y: 0, w: imgDim.w, h: imgDim.h });
                  }}
                  title="Select entire image"
                >
                  Full image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 font-medium"
                  onClick={() => {
                    const side = Math.min(imgDim.w, imgDim.h);
                    const boxX = Math.round((imgDim.w - side) / 2);
                    const boxY = Math.round((imgDim.h - side) / 2);
                    setCropBox({ x: boxX, y: boxY, w: side, h: side });
                    setAspectRatio("1:1");
                  }}
                  title="Reset selection"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
              <Button
                variant="outline"
                size="md"
                onClick={initialImageSrc ? handleClose : () => setMode("choose")}
              >
                {initialImageSrc ? "Cancel" : "Back to gallery"}
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
    </div>,
    document.body
  );
}
