"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import {
  SparklesIcon,
  LockClosedIcon,
  AdjustmentsHorizontalIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

type DisplayMode = "fourier" | "convolution" | "dct";

export function UniversityLogoHero() {
  const [mode, setMode] = useState<DisplayMode>("fourier");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Pos states (0 to 100)
  const targetPosRef = useRef<number>(50);
  const currentPosRef = useRef<number>(50);
  const [displaySplitPos, setDisplaySplitPos] = useState<number>(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Smooth rAF loop for 60fps / 120fps buttery physics
  useEffect(() => {
    const updatePhysics = () => {
      const diffPos = targetPosRef.current - currentPosRef.current;
      if (Math.abs(diffPos) > 0.05) {
        currentPosRef.current += diffPos * 0.25; // smooth interpolation factor
        setDisplaySplitPos(currentPosRef.current);
      } else if (currentPosRef.current !== targetPosRef.current) {
        currentPosRef.current = targetPosRef.current;
        setDisplaySplitPos(currentPosRef.current);
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pctX = (x / rect.width) * 100;

    targetPosRef.current = Math.max(2, Math.min(98, pctX));
  }, []);

  // Global mousemove / touchmove during drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleGlobalMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
      window.addEventListener("touchmove", handleGlobalTouchMove, { passive: true });
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("touchend", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging, updatePosition]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updatePosition(e.clientX);
  };

  return (
    <div className="w-full max-w-[340px] sm:max-w-[350px] select-none space-y-2">
      {/* Mode Selector Header Tabs */}
      <div className="flex items-center justify-between p-1 rounded-xl bg-[#F0F0ED] dark:bg-[#1A1A1A] border border-[#E2E2DC] dark:border-[#2C2C2C]">
        <button
          onClick={() => setMode("fourier")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            mode === "fourier"
              ? "bg-white dark:bg-[#252525] text-[#181818] dark:text-[#F2F2F0] shadow-xs border border-black/5 dark:border-white/10"
              : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
          )}
        >
          <SparklesIcon className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
          <span>Fourier Plane</span>
        </button>

        <button
          onClick={() => setMode("convolution")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            mode === "convolution"
              ? "bg-white dark:bg-[#252525] text-[#181818] dark:text-[#F2F2F0] shadow-xs border border-black/5 dark:border-white/10"
              : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
          )}
        >
          <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
          <span>Convolution</span>
        </button>

        <button
          onClick={() => setMode("dct")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            mode === "dct"
              ? "bg-white dark:bg-[#252525] text-[#181818] dark:text-[#F2F2F0] shadow-xs border border-black/5 dark:border-white/10"
              : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
          )}
        >
          <LockClosedIcon className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
          <span>DCT Cipher</span>
        </button>
      </div>

      {/* Main Interactive Display Box */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative aspect-square w-full rounded-2xl overflow-hidden border border-[#DCDCD6] dark:border-[#2C2C2C] bg-[#0A0A0B] shadow-xl group cursor-col-resize touch-none select-none"
      >
        {/* Layer 1: Base Spatial Logo */}
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black">
          <img
            src="/university_logo.png"
            alt="University Logo Spatial Domain"
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Layer 2: Transform Overlay (Fourier Spectrum) */}
        {mode === "fourier" && (
          <div
            className="absolute inset-0 overflow-hidden bg-black will-change-[clip-path]"
            style={{ clipPath: `inset(0 0 0 ${displaySplitPos}%)` }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src="/university_logo_fourier.png"
                alt="2D Fourier Spectrum"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
            {/* Overlay Label for Right Side */}
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-[#5B8CFF] backdrop-blur-xs">
              |F(u,v)| 2D Fourier
            </div>
          </div>
        )}

        {/* Layer 2: Transform Overlay (Convolution Filter) */}
        {mode === "convolution" && (
          <div
            className="absolute inset-0 overflow-hidden bg-black will-change-[clip-path]"
            style={{ clipPath: `inset(0 0 0 ${displaySplitPos}%)` }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src="/university_logo_convoluted.png"
                alt="Convoluted Spatial Filter"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
            {/* Overlay Label for Right Side */}
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-[#5B8CFF] backdrop-blur-xs">
              h(x,y) * f(x,y) Convoluted
            </div>
          </div>
        )}

        {/* Layer 2: Transform Overlay (Permuted DCT Energy Cipher) */}
        {mode === "dct" && (
          <div
            className="absolute inset-0 overflow-hidden bg-black will-change-[clip-path]"
            style={{ clipPath: `inset(0 0 0 ${displaySplitPos}%)` }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src="/university_logo_dct.png"
                alt="Permuted DCT Energy Cipher"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
            {/* Overlay Label for Right Side */}
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-[#5B8CFF] backdrop-blur-xs">
              E_DCT(u,v) Permuted Cipher
            </div>
          </div>
        )}

        {/* Split View Divider Line & Drag Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] pointer-events-none z-10 will-change-[left]"
          style={{ left: `${displaySplitPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-11 rounded-full bg-white dark:bg-[#1A1A1C] border border-black/20 dark:border-white/20 shadow-xl flex items-center justify-center gap-1">
            <div className="w-0.5 h-3.5 bg-[#555550] dark:bg-[#888880] rounded-full" />
            <div className="w-0.5 h-3.5 bg-[#555550] dark:bg-[#888880] rounded-full" />
          </div>
        </div>

        {/* Spatial domain label on Left Side */}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-white/80 backdrop-blur-xs pointer-events-none z-10">
          f(x,y) Spatial
        </div>
      </div>

      {/* Footer Mathematical Context Banner */}
      <div className="px-3 py-2 rounded-xl bg-white/60 dark:bg-[#141414]/60 border border-[#E0E0DA] dark:border-[#262626] flex items-center justify-between text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <CubeIcon className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
          <span>
            {mode === "fourier" && "2D Optical Fourier Spectrum |F(u,v)|"}
            {mode === "convolution" && "Point Spread Function Convolution"}
            {mode === "dct" && "2D Permuted DCT Energy Cipher E_DCT"}
          </span>
        </div>
        <span className="text-[10px] font-medium tracking-tight text-[#999993] dark:text-[#777770]">
          Hover or Drag to sweep
        </span>
      </div>
    </div>
  );
}
