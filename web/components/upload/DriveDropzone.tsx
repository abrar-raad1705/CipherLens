"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUpTrayIcon as Upload,
  ExclamationCircleIcon as AlertCircle,
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
  onImageUploaded: (image: UploadedImageInfo) => void;
}

export function DriveDropzone({
  title = "Drop your image here",
  description = "Maximum 25 MB",
  actionLabel = "Browse files",
  compact = false,
  dropzoneClassName,
  containerClassName,
  onImageUploaded,
}: DriveDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit / Crop Image Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [modalFileName, setModalFileName] = useState<string>("image.png");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setErrorMessage(null);

    // Validate format
    const isImageMime = file.type.startsWith("image/");
    const isImageExt = /\.(png|jpe?g|webp|bmp|gif|tiff|svg)$/i.test(file.name);

    if (!isImageMime && !isImageExt) {
      setErrorMessage("Please select a valid image file (PNG, JPG, WEBP, BMP).");
      return;
    }

    // 25 MB limit
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage("File size exceeds 25 MB limit. Please select a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMessage("Failed to read image file. Please try another image.");
    };

    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      if (!dataUri) {
        setErrorMessage("Empty image file received. Please try again.");
        return;
      }

      const grayUri = await convertToGrayscaleDataUri(dataUri);

      // Open the Edit Image Dialogue with the selected grayscale image
      setModalImageSrc(grayUri);
      setModalFileName(file.name);
      setIsModalOpen(true);

      // Reset file input value safely so the same file can be re-selected if cancelled
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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
          dropzoneClassName || (compact
            ? "relative group w-full h-full min-h-[340px] sm:min-h-[360px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 sm:p-10 text-center select-none"
            : "relative group w-full min-h-[410px] sm:min-h-[440px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none"),
          isDragOver
            ? "border-[#2563EB] dark:border-[#3B82F6] bg-blue-500/[0.05] dark:bg-blue-500/[0.09] ring-2 ring-blue-500/20 scale-[1.006]"
            : "border-[#DCDCD6] dark:border-[#242424] hover:border-[#2563EB]/70 dark:hover:border-[#3B82F6]/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] shadow-2xs"
        )}
      >
        {/* Full-bleed transparent native input for 100% reliable click & drag-and-drop */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/bmp, image/gif, image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
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
              compact ? "w-16 h-16 sm:w-18 sm:h-18 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-all duration-300" : "w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl mx-auto flex items-center justify-center mb-5 transition-all duration-300",
              isDragOver
                ? "bg-[#2563EB] text-white scale-110 shadow-lg shadow-blue-500/25"
                : "bg-blue-500/10 dark:bg-[#1E293B]/70 text-[#2563EB] dark:text-[#60A5FA] group-hover:scale-105 group-hover:bg-blue-500/15 dark:group-hover:bg-[#1E293B]"
            )}
          >
            <Upload className={compact ? "h-8 w-8 sm:h-9 sm:w-9 stroke-[1.8]" : "h-9 w-9 sm:h-10 sm:w-10 stroke-[1.8]"} />
          </div>

          {/* Heading */}
          <h2 className={compact ? "text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5] mb-1.5" : "text-2xl sm:text-3xl font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5] mb-2"}>
            {isDragOver ? "Release to upload" : title}
          </h2>

          {/* Secondary Divider: "or" */}
          <div className={compact ? "flex items-center gap-2 w-28 my-2" : "flex items-center gap-2.5 w-32 my-2.5"}>
            <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
            <span className="text-[10px] uppercase tracking-widest text-[#71717A] dark:text-[#71717A] font-medium">
              or
            </span>
            <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
          </div>

          {/* Dedicated Blue "Browse files" Button */}
          <div
            className={compact
              ? "inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium shadow-xs group-hover:shadow-md transition-all active:scale-98 mb-2"
              : "inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium shadow-xs group-hover:shadow-md transition-all active:scale-98 mb-3"}
          >
            <Upload className={compact ? "h-3.5 w-3.5 stroke-[2]" : "h-4 w-4 stroke-[2]"} />
            <span>{actionLabel}</span>
          </div>

          {/* Small Supporting Text */}
          <p className="text-xs text-[#71717A] dark:text-[#8E8E93] font-normal tracking-normal">
            {description}
          </p>
        </div>

        {/* Error Callout */}
        {errorMessage && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-40 mt-6 p-3 rounded-xl border border-[#FCA5A5] dark:border-[#991B1B]/40 bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 text-[#B91C1C] dark:text-[#FCA5A5] text-xs flex items-center justify-between text-left max-w-md w-full pointer-events-auto"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs underline hover:opacity-80 ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* 
        Central Edit Image Dialogue:
        Opens immediately upon file selection or drop so the user can adjust,
        crop (1:1 square, freeform, 512x512 calibration), and confirm.
      */}
      <ChangeImageModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalImageSrc(null);
        }}
        initialMode="crop"
        initialImageSrc={modalImageSrc}
        initialFileName={modalFileName}
        title="Crop & Adjust Target Selection"
        onSelectImage={(cropped) => {
          setIsModalOpen(false);
          setModalImageSrc(null);
          onImageUploaded(cropped);
        }}
      />
    </div>
  );
}
