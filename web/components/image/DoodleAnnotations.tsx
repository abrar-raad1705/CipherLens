"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * DoodleFrame
 * Provides an organic, subtly hand-sketched border around scientific imagery.
 * Uses a slightly irregular SVG path with natural marker-pen stroke characteristics.
 */
interface DoodleFrameProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function DoodleFrame({ children, className, onClick, title }: DoodleFrameProps) {
  return (
    <div
      onClick={onClick}
      title={title}
      className={cn("relative p-3 select-none", className)}
    >
      {/* Hand-drawn SVG border layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none text-[#181818] dark:text-[#EFEFEA] opacity-90 overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Primary sketched stroke with slight organic wobble */}
        <path
          d="M 6,3 
             C 25,2.4 75,2.8 94,3.2 
             C 97.4,3.4 97.8,6.8 97.5,12 
             C 97.2,35 97.6,72 97.3,92 
             C 97.1,96.5 94.2,97.2 88,97.4 
             C 65,97.7 28,97.2 8,97 
             C 3.5,96.8 2.6,94.2 2.8,88 
             C 3.2,65 2.7,28 3.1,8 
             C 3.3,4.2 4.5,3.2 8,3 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Subtle secondary trace mimicking fine pen hesitation / double stroke */}
        <path
          d="M 5.8,3.5 
             C 30,3.1 70,3.3 94.2,3.6 
             C 97.1,3.8 97.5,7 97.2,14
             C 97,40 97.4,70 97.1,91.8
             C 96.9,96.2 94,97 87.5,97.2"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeOpacity="0.35"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Clean inner content / actual image container */}
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-[#0A0A0A] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/**
 * DoodleUnderline
 * A quick, hand-drawn sketch underline for research notebook labels.
 */
export function DoodleUnderline({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-full h-2 text-[#7A7A75] dark:text-[#9A9A95] overflow-visible", className)}
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M 1,4 C 28,6 68,2 99,5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * DoodleArrow
 * Hand-drawn research notebook annotation arrow with natural wobble and curvature.
 */
interface DoodleArrowProps {
  direction?: "top-left" | "top-right" | "bottom-up";
  className?: string;
}

export function DoodleArrow({ direction = "top-right", className }: DoodleArrowProps) {
  if (direction === "top-left") {
    // Curves from top-left annotation down-right toward top-left corner of the frame
    return (
      <svg
        className={cn("w-14 h-12 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
        viewBox="0 0 56 48"
        fill="none"
      >
        <path
          d="M 8,6 C 18,12 34,16 38,28 C 41,36 44,42 46,45"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Hand-drawn arrowhead */}
        <path
          d="M 39,40 L 46,45 L 48,37"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (direction === "top-right") {
    // Curves from top-right annotation down-left toward top-right corner of the frame
    return (
      <svg
        className={cn("w-14 h-12 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
        viewBox="0 0 56 48"
        fill="none"
      >
        <path
          d="M 48,6 C 38,12 22,16 18,28 C 15,36 12,42 10,45"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Hand-drawn arrowhead */}
        <path
          d="M 17,40 L 10,45 L 8,37"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // bottom-up: Points from bottom annotation up into the bottom edge of the frame
  return (
    <svg
      className={cn("w-8 h-12 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
      viewBox="0 0 32 48"
      fill="none"
    >
      <path
        d="M 16,44 C 18,34 14,22 16,7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hand-drawn arrowhead */}
      <path
        d="M 10,13 L 16,6 L 22,13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * DoodleSparkle
 * Tiny hand-drawn research doodle star / sparkle for notebook margin flavor.
 */
export function DoodleSparkle({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-4 h-4 text-[#888882] dark:text-[#7A7A75] select-none", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M 12 2 C 12 8 8 12 2 12 C 8 12 12 16 12 22 C 12 16 16 12 22 12 C 16 12 12 8 12 2 Z" />
    </svg>
  );
}
