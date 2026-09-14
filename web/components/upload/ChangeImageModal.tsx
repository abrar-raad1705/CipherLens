"use client";

import React, { useState, useRef } from "react";
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
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOver, setDragOver] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resetModalState = () => {
    setMode("choose");
    setRawImageSrc(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

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

  // Pan / drag handlers for cropping
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(3.5, Math.max(1, Number((prev + delta).toFixed(2)))));
  };

  // Confirm crop and produce cropped image data URL
  const handleConfirmCrop = () => {
    if (!rawImageSrc || !imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const box = containerRef.current.getBoundingClientRect();
    const size = Math.min(box.width, box.height);

    // Create 512x512 square canvas
    const outputCanvas = document.createElement("canvas");
    const targetSize = 512;
    outputCanvas.width = targetSize;
    outputCanvas.height = targetSize;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    const displayedWidth = img.width * zoom;
    const displayedHeight = img.height * zoom;

    const containerCenterX = box.width / 2;
    const containerCenterY = box.height / 2;

    const imgLeft = containerCenterX - displayedWidth / 2 + offset.x;
    const imgTop = containerCenterY - displayedHeight / 2 + offset.y;

    const cropWindowLeft = containerCenterX - size / 2;
    const cropWindowTop = containerCenterY - size / 2;

    const scaleFactor = targetSize / size;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetSize, targetSize);

    ctx.drawImage(
      img,
      (imgLeft - cropWindowLeft) * scaleFactor,
      (imgTop - cropWindowTop) * scaleFactor,
      displayedWidth * scaleFactor,
      displayedHeight * scaleFactor
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
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
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="relative w-full h-[320px] rounded-md bg-[#0F0F0F] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            >
              {rawImageSrc && (
                <img
                  ref={imageRef}
                  src={rawImageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: "center",
                    maxWidth: "none",
                    transition: isDragging ? "none" : "transform 0.05s ease-out",
                  }}
                  className="max-h-[280px] pointer-events-none"
                />
              )}

              {/* Mask with 240x240 square aperture */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[240px] h-[240px] rounded-md border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
              </div>
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
                onChange={(e) => setZoom(Number(e.target.value))}
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
