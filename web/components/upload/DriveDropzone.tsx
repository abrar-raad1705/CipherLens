"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUpTrayIcon as Upload,
  ArrowPathIcon as Processing,
  ExclamationCircleIcon as AlertCircle,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";
import { ChangeImageModal } from "./ChangeImageModal";
import { cn } from "@/lib/utils/cn";
import { convertToGrayscaleDataUri } from "@/lib/utils";

export interface UploadedImageInfo {
  name: string;
  dataUri: string;
  width: number;
  height: number;
  sizeBytes?: number;
}

interface DriveDropzoneProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  compact?: boolean;
  dropzoneClassName?: string;
  containerClassName?: string;
  titleClassName?: string;
  onImageUploaded: (image: UploadedImageInfo) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  openPickerSignal?: number;
}

export function DriveDropzone({
  title = "Drop your image here",
  description = "",
  actionLabel = "Browse files",
  compact = false,
  dropzoneClassName,
  containerClassName,
  titleClassName,
  onImageUploaded,
  inputRef: externalInputRef,
  openPickerSignal = 0,
}: DriveDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Prevent background scroll while processing popup is open
  useEffect(() => {
    if (!isProcessing) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isProcessing]);

  // Edit / Crop Image Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [modalFileName, setModalFileName] = useState<string>("image.png");
  const [modalDimensions, setModalDimensions] = useState<{ width: number; height: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeInputRef = externalInputRef || fileInputRef;

  useEffect(() => {
    if (openPickerSignal > 0) activeInputRef.current?.click();
  }, [openPickerSignal, activeInputRef]);

  // Prevent browser from opening files dropped outside the dropzone
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

  const handleProcessFile = (file: File) => {
    setIsDragOver(false);
    setErrorMessage(null);

    // Validate format
    const isImageMime = Boolean(file.type && file.type.startsWith("image/"));
    const isImageExt = /\.(png|jpe?g|webp|bmp|gif|tiff|svg)$/i.test(file.name);

    if (!isImageMime && !isImageExt) {
      setErrorMessage("Invalid file format. Please upload an image file (PNG, JPG, WEBP, etc.).");
      return;
    }

    setIsProcessing(true);
    setIsModalOpen(true);
    setProgress(12);

    let curProg = 12;
    const progressTimer = setInterval(() => {
      if (curProg < 90) {
        const step = Math.max(1, Math.round((92 - curProg) * 0.12));
        curProg = Math.min(90, curProg + step);
        setProgress(curProg);
      }
    }, 45);

    const finishWithProgress = async (onDone: () => void) => {
      clearInterval(progressTimer);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 260));
      onDone();
    };

    const reader = new FileReader();
    reader.onerror = () => {
      clearInterval(progressTimer);
      setIsProcessing(false);
      setIsModalOpen(false);
      setErrorMessage("Failed to read image file. Please try another image.");
    };

    reader.onload = async (e) => {
      try {
        const dataUri = e.target?.result as string;
        if (!dataUri) {
          clearInterval(progressTimer);
          setIsProcessing(false);
          setIsModalOpen(false);
          setErrorMessage("Empty image file received. Please try again.");
          return;
        }

        const grayUri = await convertToGrayscaleDataUri(dataUri);

        // Preload and measure image dimensions before opening modal to eliminate stutter/layout shifting
        const img = new Image();
        img.src = grayUri;
        if ("decode" in img) {
          try {
            await img.decode();
          } catch {
            // fallback
          }
        }
        const nw = img.naturalWidth || 512;
        const nh = img.naturalHeight || 512;

        await finishWithProgress(() => {
          setModalDimensions({ width: nw, height: nh });
          setModalImageSrc(grayUri);
          setModalFileName(file.name);
          setIsProcessing(false);
        });

        // Reset file input value safely so the same file can be re-selected if cancelled
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch {
        clearInterval(progressTimer);
        setIsProcessing(false);
        setIsModalOpen(false);
        setErrorMessage("Failed to process image. Please try again.");
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  return (
    <div className={containerClassName || (compact ? "w-full h-full animate-in fade-in duration-200" : "w-full max-w-[920px] mx-auto py-6 sm:py-8 animate-in fade-in duration-200")}>
      {/* Upload Dropzone Hero Area with subtle dashed border */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative group w-full cursor-pointer overflow-hidden select-none border-2 border-dashed transition-all duration-200",
          compact
            ? "h-full min-h-[340px] sm:min-h-[360px] rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-center"
            : "min-h-[410px] sm:min-h-[440px] rounded-2xl flex flex-col items-center justify-center p-8 sm:p-12 text-center",
          isDragOver
            ? "border-[#2563EB] dark:border-[#3B82F6] bg-blue-500/[0.05] dark:bg-blue-500/[0.09] ring-2 ring-blue-500/20 scale-[1.006]"
            : "border-[#DCDCD6] dark:border-[#242424] hover:border-[#2563EB]/70 dark:hover:border-[#3B82F6]/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] shadow-2xs",
          dropzoneClassName
        )}
      >
        {/* Full-bleed transparent native input for 100% reliable click & drag-and-drop */}
        <input
          ref={activeInputRef}
          type="file"
          accept="image/*, .png, .jpg, .jpeg, .webp, .bmp, .gif, .tiff, .svg"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
          disabled={isModalOpen || isProcessing}
          title=""
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleProcessFile(file);
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />

        <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto pointer-events-none text-center">
          {/* Large Blue Upload Icon in Dark-Blue Container */}
          <div
            className={cn(
              compact ? "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-all duration-300" : "w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl mx-auto flex items-center justify-center mb-5 transition-all duration-300",
              isDragOver
                ? "bg-[#2563EB] text-white scale-110 shadow-lg shadow-blue-500/25"
                : "bg-blue-500/10 dark:bg-[#1E293B]/70 text-[#2563EB] dark:text-[#60A5FA] group-hover:scale-105 group-hover:bg-blue-500/15 dark:group-hover:bg-[#1E293B]"
            )}
          >
            <Upload className={compact ? "h-8 w-8 sm:h-10 sm:w-10 stroke-[1.8]" : "h-9 w-9 sm:h-10 sm:w-10 stroke-[1.8]"} />
          </div>

          {/* Heading */}
          <h2
            className={cn(
              compact
                ? "text-base sm:text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5] mb-2"
                : "text-2xl sm:text-3xl font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5] mb-2",
              titleClassName
            )}
          >
            {isDragOver ? "Release to upload" : title}
          </h2>

          {/* Secondary Divider: "or" */}
          <div className="flex items-center gap-2.5 w-32 my-2.5">
            <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
            <span className="text-xs uppercase tracking-widest text-[#71717A] dark:text-[#71717A] font-medium">
              or
            </span>
            <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
          </div>

          {/* Dedicated Blue "Browse files" Button */}
          <div
            className={compact
              ? "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium shadow-xs group-hover:shadow-md transition-all active:scale-98"
              : "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium shadow-xs group-hover:shadow-md transition-all active:scale-98 mb-3"}
          >
            <Upload className="h-4 w-4 stroke-[2]" />
            <span>{actionLabel}</span>
          </div>

          {/* Small Supporting Text */}
          {description ? (
            <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#8E8E93] font-normal tracking-normal mt-2.5">
              {description}
            </p>
          ) : null}
        </div>

        {/* Top-positioned Error Callout with compact height */}
        {errorMessage && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 right-4 z-40 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#EEF0EB] dark:bg-[#1E1E1E] border border-[#DCDEC6]/70 dark:border-[#2C2C2C] text-[#1E1E1E] dark:text-[#E8E8E6] flex items-center justify-between gap-3 text-left pointer-events-auto shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-[#D92D20] text-white flex items-center justify-center shrink-0 shadow-xs">
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-[#EAEAE8] leading-tight break-words">
                {errorMessage}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-md text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#F1F3F4] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer shrink-0 transition-colors"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 
        Central Edit Image Dialogue & Smooth Preparing Pop-up:
        Shares a single continuous backdrop portal so the transition from
        Preparing -> Crop and Adjust is seamless, with zero backdrop flicker.
      */}
      <ChangeImageModal
        isOpen={isModalOpen}
        isPreparing={isProcessing}
        prepareProgress={progress}
        onClose={() => {
          setIsModalOpen(false);
          setIsProcessing(false);
          setModalImageSrc(null);
          setModalDimensions(null);
        }}
        initialMode="crop"
        initialImageSrc={modalImageSrc}
        initialFileName={modalFileName}
        initialDimensions={modalDimensions}
        title="Crop & Adjust Target Selection"
        onSelectImage={(cropped) => {
          setIsModalOpen(false);
          setIsProcessing(false);
          setModalImageSrc(null);
          setModalDimensions(null);
          onImageUploaded(cropped);
        }}
      />
    </div>
  );
}
