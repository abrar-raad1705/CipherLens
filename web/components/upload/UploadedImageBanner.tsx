"use client";

import React, { useState } from "react";
import {
  CheckCircleIcon as CheckCircle2,
  ArrowPathIcon as RefreshCw,
  TrashIcon as Trash2,
  PhotoIcon as ImageIcon,
  ScissorsIcon as Crop,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { UploadedImageInfo } from "./DriveDropzone";
import { ChangeImageModal } from "./ChangeImageModal";

interface UploadedImageBannerProps {
  image: UploadedImageInfo;
  operationType: "encryption" | "decryption";
  onChangeImage: (newImage: UploadedImageInfo) => void;
  onRemoveImage: () => void;
}

export function UploadedImageBanner({
  image,
  operationType,
  onChangeImage,
  onRemoveImage,
}: UploadedImageBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"choose" | "crop">("crop");
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleOpenCropper = () => {
    setModalSrc(image.dataUri);
    setModalMode("crop");
    setIsModalOpen(true);
  };

  const handleOpenChange = () => {
    setModalSrc(null);
    setModalMode("choose");
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#151515] p-2.5 sm:p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Thumbnail Preview */}
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-[#0C0C0C] flex items-center justify-center checkerboard-pattern shadow-2xs">
            {image.dataUri ? (
              <img
                src={image.dataUri}
                alt={image.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-[#6F6F6A]" />
            )}
          </div>

          {/* Info & Status */}
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#999993] dark:text-[#6A6A6A]">
                {operationType === "encryption" ? "Input Plaintext" : "Target Ciphertext"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#059669] dark:text-[#34D399]">
                <CheckCircle2 className="h-3 w-3" />
                <span>Uploaded</span>
              </span>
            </div>

            <div className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0] truncate max-w-[280px] sm:max-w-md" title={image.name}>
              {image.name}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
              <span>{image.width} × {image.height} px</span>
              <span>•</span>
              <span>{formatFileSize(image.sizeBytes)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {/* Crop / Edit with exact central cropping modal */}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleOpenCropper}
            className="h-8 text-xs font-medium"
            title="Crop and adjust image selection"
          >
            <Crop className="h-3.5 w-3.5 mr-1 text-[#2563EB] dark:text-[#5B8CFF]" />
            <span>Crop / Edit</span>
          </Button>

          {/* Change Image */}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleOpenChange}
            className="h-8 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1 text-[#6F6F6A] dark:text-[#A0A09B]" />
            <span>Change</span>
          </Button>

          {/* Remove */}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onRemoveImage}
            className="h-8 text-xs text-[#DC2626] dark:text-[#F87171] hover:bg-rose-500/10 cursor-pointer"
            title="Remove this image and start over"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Remove</span>
          </Button>
        </div>
      </div>

      {/* Central Image Editing Modal */}
      <ChangeImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMode={modalMode}
        initialImageSrc={modalSrc}
        initialFileName={image.name}
        title={operationType === "encryption" ? "Edit Encryption Image" : "Edit Decryption Ciphertext"}
        onSelectImage={(newImg) => {
          onChangeImage(newImg);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
