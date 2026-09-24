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
      className={cn("relative p-2 sm:p-2.5 select-none", className)}
    >
      {/* Hand-drawn SVG border layer with organic doodle pen style */}
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
      <div className="relative w-full h-full rounded-md overflow-hidden flex items-center justify-center">
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
  direction?: "top-left" | "top-right" | "bottom-up" | "side-left" | "side-right";
  className?: string;
}

export function DoodleArrow({ direction = "top-right", className }: DoodleArrowProps) {
  if (direction === "side-left") {
    // Curving from left side text to the right into image edge
    return (
      <svg
        className={cn("w-14 h-10 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
        viewBox="0 0 56 40"
        fill="none"
      >
        <path
          d="M 4,12 C 16,8 28,14 36,22 C 40,26 46,28 50,28"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 43,23 L 50,28 L 44,32"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (direction === "side-right") {
    // Curving from right side text to the left into image edge
    return (
      <svg
        className={cn("w-14 h-10 text-[#6F6F6A] dark:text-[#A0A09B] overflow-visible", className)}
        viewBox="0 0 56 40"
        fill="none"
      >
        <path
          d="M 52,12 C 40,8 28,14 20,22 C 16,26 10,28 6,28"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 13,23 L 6,28 L 12,32"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

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
