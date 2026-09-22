"use client";

import React from "react";
import { CheckIcon as Check } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils/cn";

export interface DownloadProgressCardProps {
  progress: number; // 0 to 100
  isCompleted?: boolean;
  fileName: string;
  fileSize?: string;
  thumbnailSrc?: string;
  statusLabel?: string;
  estimatedSecondsRemaining?: number | null;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

export function DownloadProgressCard({
  progress,
  isCompleted: isCompletedProp,
  fileName,
  fileSize = "2.4 MB",
  thumbnailSrc,
  statusLabel,
  estimatedSecondsRemaining,
  className,
  showBadge = true,
  badgeText = "PNG",
}: DownloadProgressCardProps) {
  const isCompleted = isCompletedProp ?? progress >= 100;
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  // SVG circular ring geometry
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={cn("w-full space-y-3.5 animate-in fade-in zoom-in-95 duration-200", className)}>
      {/* Floating Modern Elevated Card */}
      <div className="relative p-4 rounded-xl border border-[#E8E8E3] dark:border-[#27272a] bg-white dark:bg-[#141417] shadow-lg flex items-center justify-between gap-3.5 transition-all duration-300 hover:border-blue-500/40 dark:hover:border-blue-500/40">
        {/* Left: Thumbnail & File Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-14 rounded-lg bg-[#F4F4F1] dark:bg-[#1c1c21] border border-[#E0E0DA] dark:border-[#2e2e38] overflow-hidden shrink-0 flex items-center justify-center shadow-inner group">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt="File Preview"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-blue-600 dark:text-blue-400">
                  {badgeText}
                </span>
              </div>
            )}
            {showBadge && (
              <span className="absolute bottom-0.5 right-0.5 font-mono text-[8px] font-bold bg-[#2563EB] dark:bg-[#3b82f6] text-white px-1 rounded-xs">
                {badgeText}
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="font-sans text-xs sm:text-sm font-semibold text-[#181818] dark:text-[#f4f4f5] truncate max-w-[180px] sm:max-w-[220px]" title={fileName}>
              {fileName}
            </div>
            <div className="font-mono text-[11px] text-[#71717A] dark:text-[#71717a] flex items-center gap-1.5 flex-wrap">
              <span>{fileSize}</span>
              <span>·</span>
              <span className={isCompleted ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#2563EB] dark:text-[#3b82f6] font-medium"}>
                {isCompleted
                  ? "Ready"
                  : `${clampedProgress}%`}
              </span>
              {!isCompleted && typeof estimatedSecondsRemaining === "number" && estimatedSecondsRemaining > 0 && (
                <>
                  <span>·</span>
                  <span className="text-[#999993] dark:text-[#71717a]">
                    ~{estimatedSecondsRemaining.toFixed(1)}s
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sleek Modern Circular Progress Ring */}
        <div className="relative shrink-0 flex items-center justify-center">
          {isCompleted ? (
            <div className="w-12 h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all duration-200">
              <Check className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* SVG Radial Progress Ring */}
              <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 64 64">
                {/* Track Circle */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="currentColor"
                  className="text-[#E8E8E3] dark:text-[#27272a]"
                  strokeWidth="3.5"
                  fill="none"
                />
                {/* Animated Active Progress Circle */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-150 ease-out"
                />
              </svg>
              {/* Percentage inside ring */}
              <span className="absolute font-mono text-[10px] font-semibold text-[#181818] dark:text-[#f4f4f5]">
                {clampedProgress}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sleek Subtext / Hint Status (No technical jargon) */}
      <div className="text-center font-mono text-xs text-[#71717A] dark:text-[#71717a] flex items-center justify-center gap-2">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            isCompleted
              ? "bg-emerald-500"
              : "bg-[#2563EB] dark:bg-[#3b82f6] animate-ping"
          )}
        />
        <span>
          {statusLabel || (isCompleted ? "Download ready" : "Preparing cryptographic image...")}
        </span>
      </div>
    </div>
  );
}
