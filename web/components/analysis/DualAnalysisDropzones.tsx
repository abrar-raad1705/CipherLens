"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUpTrayIcon as Upload,
  LockClosedIcon as Lock,
  PhotoIcon,
  ScissorsIcon as Crop,
  ArrowPathIcon as RefreshCw,
  XMarkIcon as X,
  SparklesIcon as Sparkles,
  PlayIcon as Play,
  CheckCircleIcon as CheckCircle,
  ExclamationCircleIcon as AlertCircle,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { ChangeImageModal, SelectedImagePayload } from "@/components/upload/ChangeImageModal";
import { cn } from "@/lib/utils";

export interface AnalysisTargetImage {
  name: string;
  dataUri: string;
  width: number;
  height: number;
  sizeBytes?: number;
  id?: string;
}

export interface DualAnalysisDropzonesProps {
  plainImage: AnalysisTargetImage | null;
  cipherImage: AnalysisTargetImage | null;
  onPlainImageChange: (image: AnalysisTargetImage | null) => void;
  onCipherImageChange: (image: AnalysisTargetImage | null) => void;
  onRunAnalysis: () => void;
  onAutoDRPE: () => void;
  loading: boolean;
  autoRunning: boolean;
  hasRunAnalysis: boolean;
  error?: string | null;
}

interface ModalState {
  isOpen: boolean;
  target: "plain" | "cipher";
  mode: "choose" | "crop";
  imageSrc?: string | null;
  fileName?: string;
  title?: string;
}

export function DualAnalysisDropzones({
  plainImage,
  cipherImage,
  onPlainImageChange,
  onCipherImageChange,
  onRunAnalysis,
  onAutoDRPE,
  loading,
  autoRunning,
  hasRunAnalysis,
  error,
}: DualAnalysisDropzonesProps) {
  // Drag states for dropzones
  const [plainIsDragOver, setPlainIsDragOver] = useState(false);
  const [cipherIsDragOver, setCipherIsDragOver] = useState(false);

  // Local validation error messages
  const [plainError, setPlainError] = useState<string | null>(null);
  const [cipherError, setCipherError] = useState<string | null>(null);

  // Modal control
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    target: "plain",
    mode: "choose",
  });

  // Hidden native file inputs
  const plainFileInputRef = useRef<HTMLInputElement | null>(null);
  const cipherFileInputRef = useRef<HTMLInputElement | null>(null);

  // Hover target for global paste shortcut
  const hoveredTargetRef = useRef<"plain" | "cipher" | null>(null);

  // Format file size nicely
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Prevent browser default file drop behavior globally
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // Process file upload from input, drag-drop, or paste
  const processFile = React.useCallback(
    (file: File, target: "plain" | "cipher") => {
      if (target === "plain") setPlainError(null);
      else setCipherError(null);

      const isImageMime = file.type.startsWith("image/");
      const isImageExt = /\.(png|jpe?g|webp|bmp|gif|tiff|svg)$/i.test(file.name);

      if (!isImageMime && !isImageExt) {
        const msg = "Please select a valid image file (PNG, JPG, BMP).";
        if (target === "plain") setPlainError(msg);
        else setCipherError(msg);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        const msg = "File size exceeds 25 MB limit.";
        if (target === "plain") setPlainError(msg);
        else setCipherError(msg);
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        const msg = "Failed to read image file. Please try again.";
        if (target === "plain") setPlainError(msg);
        else setCipherError(msg);
      };

      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        if (!dataUri) return;

        const img = new Image();
        img.onload = () => {
          const payload: AnalysisTargetImage = {
            name: file.name,
            dataUri,
            width: img.naturalWidth || 512,
            height: img.naturalHeight || 512,
            sizeBytes: file.size,
          };
          if (target === "plain") onPlainImageChange(payload);
          else onCipherImageChange(payload);
        };
        img.onerror = () => {
          const payload: AnalysisTargetImage = {
            name: file.name,
            dataUri,
            width: 512,
            height: 512,
            sizeBytes: file.size,
          };
          if (target === "plain") onPlainImageChange(payload);
          else onCipherImageChange(payload);
        };
        img.src = dataUri;
      };

      reader.readAsDataURL(file);
    },
    [onPlainImageChange, onCipherImageChange]
  );

  // Support paste anywhere on the page
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const dest =
              hoveredTargetRef.current ||
              (!plainImage ? "plain" : !cipherImage ? "cipher" : "plain");
            processFile(file, dest);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [plainImage, cipherImage, processFile]);

  // Modal helpers
  const openCropModal = (target: "plain" | "cipher") => {
    const img = target === "plain" ? plainImage : cipherImage;
    if (!img) return;
    setModalState({
      isOpen: true,
      target,
      mode: "crop",
      imageSrc: img.dataUri,
      fileName: img.name,
      title: target === "plain" ? "Crop & Calibrate Plaintext" : "Crop & Calibrate Ciphertext",
    });
  };

  const openChooseModal = (target: "plain" | "cipher") => {
    const img = target === "plain" ? plainImage : cipherImage;
    setModalState({
      isOpen: true,
      target,
      mode: "choose",
      imageSrc: null,
      fileName: img?.name || (target === "plain" ? "plaintext.png" : "ciphertext.png"),
      title: target === "plain" ? "Pick Plaintext Ground Truth" : "Pick Ciphertext Target",
    });
  };

  const handleModalSelect = (payload: SelectedImagePayload) => {
    const targetImage: AnalysisTargetImage = {
      name: payload.name,
      dataUri: payload.dataUri,
      width: payload.width,
      height: payload.height,
      sizeBytes: payload.sizeBytes,
    };
    if (modalState.target === "plain") {
      onPlainImageChange(targetImage);
    } else {
      onCipherImageChange(targetImage);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Drag event handlers for Plain dropzone
  const handlePlainDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPlainIsDragOver(true);
  };

  const handlePlainDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    setPlainIsDragOver(true);
  };

  const handlePlainDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setPlainIsDragOver(false);
  };

  const handlePlainDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPlainIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0], "plain");
    }
  };

  // Drag event handlers for Cipher dropzone
  const handleCipherDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCipherIsDragOver(true);
  };

  const handleCipherDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    setCipherIsDragOver(true);
  };

  const handleCipherDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCipherIsDragOver(false);
  };

  const handleCipherDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCipherIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0], "cipher");
    }
  };

  // Status Indicator rendering
  const renderStatus = () => {
    if (!plainImage && !cipherImage) {
      return (
        <span className="flex items-center gap-2 text-xs sm:text-sm text-[#71717A] dark:text-[#909096]">
          <span className="w-2 h-2 rounded-full bg-[#A1A1AA] dark:bg-[#52525B] shrink-0" />
          <span>Drop or select a plaintext and ciphertext pair to begin analysis.</span>
        </span>
      );
    }
    if (plainImage && !cipherImage) {
      return (
        <span className="flex items-center gap-2 text-xs sm:text-sm text-[#2563EB] dark:text-[#5B8CFF] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF] animate-pulse shrink-0" />
          <span>Plaintext loaded. Drop ciphertext or click &quot;Auto DRPE &amp; Analyze&quot; to simulate.</span>
        </span>
      );
    }
    if (!plainImage && cipherImage) {
      return (
        <span className="flex items-center gap-2 text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse shrink-0" />
          <span>Ciphertext loaded. Please drop or select plaintext ground truth.</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2 text-xs sm:text-sm text-[#059669] dark:text-[#34D399] font-medium">
        <CheckCircle className="h-4 w-4 shrink-0 text-[#059669] dark:text-[#34D399]" />
        <span>Ready for cryptanalysis.</span>
        {hasRunAnalysis && (
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] border border-emerald-500/20">
            Analysis Complete
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={plainFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/bmp, image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file, "plain");
          if (plainFileInputRef.current) plainFileInputRef.current.value = "";
        }}
      />
      <input
        ref={cipherFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/bmp, image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file, "cipher");
          if (cipherFileInputRef.current) cipherFileInputRef.current.value = "";
        }}
      />

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {/* ================= LEFT COLUMN: PLAINTEXT ================= */}
        <div
          className="flex flex-col space-y-2.5"
          onMouseEnter={() => {
            hoveredTargetRef.current = "plain";
          }}
          onMouseLeave={() => {
            if (hoveredTargetRef.current === "plain") hoveredTargetRef.current = null;
          }}
        >
          {/* Column Header / Badge */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-blue-500/10 dark:bg-blue-500/20 text-[#2563EB] dark:text-[#5B8CFF] border border-blue-500/20">
              <PhotoIcon className="h-3.5 w-3.5 shrink-0" />
              <span>PLAINTEXT (GROUND TRUTH)</span>
            </div>
            {plainImage && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#059669] dark:text-[#34D399]">
                <CheckCircle className="h-3 w-3" />
                <span>Target Loaded</span>
              </span>
            )}
          </div>

          {/* Plain Dropzone / Preview Card */}
          {!plainImage ? (
            <div
              tabIndex={0}
              onDragEnter={handlePlainDragEnter}
              onDragOver={handlePlainDragOver}
              onDragLeave={handlePlainDragLeave}
              onDrop={handlePlainDrop}
              onClick={() => plainFileInputRef.current?.click()}
              className={cn(
                "rounded-2xl border-2 border-dashed border-[#DCDCD6] dark:border-[#242424] hover:border-[#2563EB]/70 dark:hover:border-[#3B82F6]/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] p-6 sm:p-8 flex flex-col items-center justify-center text-center select-none cursor-pointer transition-all duration-200 min-h-[260px] sm:min-h-[290px] outline-none",
                plainIsDragOver &&
                  "border-[#2563EB] dark:border-[#3B82F6] bg-blue-500/[0.05] dark:bg-blue-500/[0.09] ring-2 ring-blue-500/20 scale-[1.006]"
              )}
            >
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-[#1E293B]/70 text-[#2563EB] dark:text-[#60A5FA] flex items-center justify-center mb-3">
                <Upload className="h-7 w-7 stroke-[1.8]" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5]">
                Drop plaintext image here
              </h3>

              {/* Divider: or */}
              <div className="flex items-center gap-2.5 w-28 my-2">
                <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
                <span className="text-[10px] uppercase tracking-widest text-[#71717A] dark:text-[#71717A] font-medium">
                  or
                </span>
                <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 my-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    plainFileInputRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Browse file</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openChooseModal("plain");
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#171717] hover:bg-[#F4F4F1] dark:hover:bg-[#222222] text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] text-xs font-medium shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <PhotoIcon className="h-3.5 w-3.5 text-[#6F6F6A] dark:text-[#A0A09B]" />
                  <span>Pick from Artifacts</span>
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-[#71717A] dark:text-[#8E8E93] font-normal tracking-normal mt-1.5">
                PNG, JPG, BMP • Max 25 MB
              </p>
            </div>
          ) : (
            <div
              onDragEnter={handlePlainDragEnter}
              onDragOver={handlePlainDragOver}
              onDragLeave={handlePlainDragLeave}
              onDrop={handlePlainDrop}
              className={cn(
                "rounded-2xl border bg-white dark:bg-[#141414] p-4 shadow-2xs flex flex-col justify-between min-h-[260px] sm:min-h-[290px] transition-all duration-200",
                plainIsDragOver
                  ? "border-[#2563EB] dark:border-[#3B82F6] ring-2 ring-blue-500/20 scale-[1.006]"
                  : "border-[#E8E8E3] dark:border-[#292929]"
              )}
            >
              {/* Centered Thumbnail */}
              <div className="relative h-36 sm:h-44 w-full rounded-xl overflow-hidden bg-[#0C0C0C] border border-black/10 dark:border-white/10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plainImage.dataUri}
                  alt={plainImage.name}
                  className="max-h-full max-w-full object-contain select-none"
                />
              </div>

              {/* Metadata Row */}
              <div className="mt-3 flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0] truncate"
                    title={plainImage.name}
                  >
                    {plainImage.name}
                  </div>
                  <div className="text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5 truncate">
                    {plainImage.width} × {plainImage.height} px
                    {plainImage.sizeBytes ? ` • ${formatFileSize(plainImage.sizeBytes)}` : ""}
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="mt-3 pt-3 border-t border-[#E8E8E3] dark:border-[#292929] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => openCropModal("plain")}
                    className="h-8 text-xs font-medium cursor-pointer"
                    title="Crop and edit plaintext ground truth"
                  >
                    <Crop className="h-3.5 w-3.5 mr-1 text-[#2563EB] dark:text-[#5B8CFF]" />
                    <span>Crop / Edit</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => openChooseModal("plain")}
                    className="h-8 text-xs cursor-pointer"
                    title="Change plaintext image"
                  >
                    <RefreshCw className="h-3 w-3 mr-1 text-[#6F6F6A] dark:text-[#A0A09B]" />
                    <span>Change</span>
                  </Button>
                </div>

                {/* Remove [X] Button: NO red box overlay, red text on hover */}
                <button
                  type="button"
                  onClick={() => onPlainImageChange(null)}
                  className="p-1.5 rounded-lg text-[#6F6F6A] dark:text-[#A0A09B] hover:text-red-500 dark:hover:text-red-400 bg-transparent hover:bg-transparent transition-colors cursor-pointer outline-none"
                  title="Remove plaintext image"
                  aria-label="Remove plaintext image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Plain Upload Error */}
          {plainError && (
            <div className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{plainError}</span>
              </div>
              <button
                type="button"
                onClick={() => setPlainError(null)}
                className="p-1 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-red-500 dark:hover:text-red-400 bg-transparent hover:bg-transparent transition-colors cursor-pointer outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: CIPHERTEXT ================= */}
        <div
          className="flex flex-col space-y-2.5"
          onMouseEnter={() => {
            hoveredTargetRef.current = "cipher";
          }}
          onMouseLeave={() => {
            if (hoveredTargetRef.current === "cipher") hoveredTargetRef.current = null;
          }}
        >
          {/* Column Header / Badge */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>CIPHERTEXT (ENCRYPTED TARGET)</span>
            </div>
            {cipherImage && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#059669] dark:text-[#34D399]">
                <CheckCircle className="h-3 w-3" />
                <span>Target Loaded</span>
              </span>
            )}
          </div>

          {/* Cipher Dropzone / Preview Card */}
          {!cipherImage ? (
            <div
              tabIndex={0}
              onDragEnter={handleCipherDragEnter}
              onDragOver={handleCipherDragOver}
              onDragLeave={handleCipherDragLeave}
              onDrop={handleCipherDrop}
              onClick={() => cipherFileInputRef.current?.click()}
              className={cn(
                "rounded-2xl border-2 border-dashed border-[#DCDCD6] dark:border-[#242424] hover:border-purple-500/70 dark:hover:border-purple-400/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] p-6 sm:p-8 flex flex-col items-center justify-center text-center select-none cursor-pointer transition-all duration-200 min-h-[260px] sm:min-h-[290px] outline-none",
                cipherIsDragOver &&
                  "border-purple-500 dark:border-purple-400 bg-purple-500/[0.05] dark:bg-purple-500/[0.09] ring-2 ring-purple-500/20 scale-[1.006]"
              )}
            >
              {/* Icon Container */}
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 dark:bg-[#2A1D3D]/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Lock className="h-7 w-7 stroke-[1.8]" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5]">
                Drop ciphertext image here
              </h3>

              {/* Divider: or */}
              <div className="flex items-center gap-2.5 w-28 my-2">
                <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
                <span className="text-[10px] uppercase tracking-widest text-[#71717A] dark:text-[#71717A] font-medium">
                  or
                </span>
                <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 my-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cipherFileInputRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Browse file</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openChooseModal("cipher");
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#171717] hover:bg-[#F4F4F1] dark:hover:bg-[#222222] text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] text-xs font-medium shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer"
                >
                  <PhotoIcon className="h-3.5 w-3.5 text-[#6F6F6A] dark:text-[#A0A09B]" />
                  <span>Pick from Artifacts</span>
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-[#71717A] dark:text-[#8E8E93] font-normal tracking-normal mt-1.5">
                PNG, JPG, BMP • Max 25 MB
              </p>
            </div>
          ) : (
            <div
              onDragEnter={handleCipherDragEnter}
              onDragOver={handleCipherDragOver}
              onDragLeave={handleCipherDragLeave}
              onDrop={handleCipherDrop}
              className={cn(
                "rounded-2xl border bg-white dark:bg-[#141414] p-4 shadow-2xs flex flex-col justify-between min-h-[260px] sm:min-h-[290px] transition-all duration-200",
                cipherIsDragOver
                  ? "border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/20 scale-[1.006]"
                  : "border-[#E8E8E3] dark:border-[#292929]"
              )}
            >
              {/* Centered Thumbnail */}
              <div className="relative h-36 sm:h-44 w-full rounded-xl overflow-hidden bg-[#0C0C0C] border border-black/10 dark:border-white/10 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cipherImage.dataUri}
                  alt={cipherImage.name}
                  className="max-h-full max-w-full object-contain select-none"
                />
              </div>

              {/* Metadata Row */}
              <div className="mt-3 flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0] truncate"
                    title={cipherImage.name}
                  >
                    {cipherImage.name}
                  </div>
                  <div className="text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5 truncate">
                    {cipherImage.width} × {cipherImage.height} px
                    {cipherImage.sizeBytes ? ` • ${formatFileSize(cipherImage.sizeBytes)}` : ""}
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="mt-3 pt-3 border-t border-[#E8E8E3] dark:border-[#292929] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => openChooseModal("cipher")}
                    className="h-8 text-xs cursor-pointer"
                    title="Change ciphertext image"
                  >
                    <RefreshCw className="h-3 w-3 mr-1 text-[#6F6F6A] dark:text-[#A0A09B]" />
                    <span>Change</span>
                  </Button>
                </div>

                {/* Remove [X] Button: NO red box overlay, red text on hover */}
                <button
                  type="button"
                  onClick={() => onCipherImageChange(null)}
                  className="p-1.5 rounded-lg text-[#6F6F6A] dark:text-[#A0A09B] hover:text-red-500 dark:hover:text-red-400 bg-transparent hover:bg-transparent transition-colors cursor-pointer outline-none"
                  title="Remove ciphertext image"
                  aria-label="Remove ciphertext image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Cipher Upload Error */}
          {cipherError && (
            <div className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{cipherError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCipherError(null)}
                className="p-1 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-red-500 dark:hover:text-red-400 bg-transparent hover:bg-transparent transition-colors cursor-pointer outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Optional Top-Level Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= ACTION BAR (EXECUTION CONTROLS) ================= */}
      <div className="rounded-xl border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#141414] p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Left Side: Status Indicator */}
        <div className="min-w-0 flex items-center">{renderStatus()}</div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={onAutoDRPE}
            disabled={!plainImage || autoRunning || loading}
            className="cursor-pointer text-xs font-medium"
            title="Automatically encrypt plaintext using DRPE simulation and run cryptanalysis"
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-blue-500" />
            <span>{autoRunning ? "Simulating..." : "Auto DRPE & Analyze"}</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={onRunAnalysis}
            disabled={!plainImage || !cipherImage || loading || autoRunning}
            className="cursor-pointer text-xs font-medium"
            title="Execute full quantitative security cryptanalysis"
          >
            <Play className="h-4 w-4 mr-1.5 fill-current" />
            <span>{loading ? "Computing..." : "Run Analysis"}</span>
          </Button>
        </div>
      </div>

      {/* Unified Image Modal (Artifact Gallery & Crop Calibration) */}
      <ChangeImageModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        initialMode={modalState.mode}
        initialImageSrc={modalState.imageSrc}
        initialFileName={modalState.fileName}
        title={modalState.title}
        skipCrop={modalState.mode !== "crop" && modalState.target === "cipher"}
        onSelectImage={handleModalSelect}
      />
    </div>
  );
}

export default DualAnalysisDropzones;
