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
      className={cn("relative p-5 select-none", className)}
    >
      {/* Hand-drawn SVG border layer with uniform distance from image on all sides */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none text-[#181818] dark:text-[#EFEFEA] opacity-90 overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Primary sketched stroke with slight organic wobble and uniform ~2.2% perimeter margin */}
        <path
          d="M 5,2.2 
             C 25,1.9 75,2.3 95,2.1 
             C 97.6,2.3 98.0,4.8 97.8,10 
             C 97.6,32 97.9,68 97.7,90 
             C 97.5,95.2 95.2,97.7 90,97.8 
             C 68,97.9 32,97.6 10,97.8 
             C 4.8,97.6 2.3,95.2 2.2,90 
             C 2.3,68 2.0,32 2.2,10 
             C 2.4,4.8 4.8,2.3 10,2.2 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Subtle secondary trace mimicking fine pen hesitation / double stroke */}
        <path
          d="M 5.2,2.5 
             C 30,2.2 70,2.6 94.8,2.3 
             C 97.4,2.5 97.7,5.2 97.5,12 
             C 97.3,38 97.6,68 97.4,89.5 
             C 97.2,94.8 94.8,97.4 89.5,97.5"
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
    // Rounder path with inside loop-de-loop curving from top-left text down to the corner
    return (
      <svg
        className={cn("w-16 h-14 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
        viewBox="0 0 64 56"
        fill="none"
      >
        {/* Rounder curve with complete inside loop */}
        <path
          d="M 12,4 
             C 18,12 36,12 38,22 
             C 39.5,29 28,30 27,23 
             C 26,16 38,18 44,28 
             C 48,35 50,42 53,49"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Hand-drawn arrowhead pointing to top-left image corner */}
        <path
          d="M 46,45 L 53,49 L 55,42"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (direction === "top-right") {
    // Rounder path with inside loop-de-loop curving from top-right text down to the corner
    return (
      <svg
        className={cn("w-16 h-14 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
        viewBox="0 0 64 56"
        fill="none"
      >
        {/* Rounder curve with complete inside loop */}
        <path
          d="M 52,4 
             C 46,12 28,12 26,22 
             C 24.5,29 36,30 37,23 
             C 38,16 26,18 20,28 
             C 16,35 14,42 11,49"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Hand-drawn arrowhead pointing to top-right image corner */}
        <path
          d="M 18,45 L 11,49 L 9,42"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // bottom-up: Rounder path with an inside loop pointing up into bottom edge of image
  return (
    <svg
      className={cn("w-12 h-14 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
      viewBox="0 0 48 56"
      fill="none"
    >
      {/* Rounder vertical curve with inside loop */}
      <path
        d="M 24,52 
           C 28,42 38,36 34,26 
           C 30,19 19,20 20,28 
           C 21,34 31,30 26,18 
           C 24,14 24,8 24,5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hand-drawn arrowhead pointing upward */}
      <path
        d="M 18,11 L 24,5 L 30,11"
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
