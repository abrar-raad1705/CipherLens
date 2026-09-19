"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Check, Binary, Sparkles, Crosshair, Box, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-image";

export default function AnimationShowcasePage() {
  const { activeArtifact } = useWorkspace();
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedOpt, setSelectedOpt] = useState<number>(1);

  // Fallback test image if none uploaded yet
  const sampleImage =
    activeArtifact?.dataUri ||
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80";

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E3] dark:border-[#292929]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#2563EB] dark:hover:text-[#5B8CFF] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              OVERVIEW
            </Link>
            <span className="text-xs text-[#999993]">/</span>
            <span className="text-xs font-mono text-[#2563EB] dark:text-[#5B8CFF]">PLAYGROUND</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#181818] dark:text-[#F2F2F0] tracking-tight">
            Signal Lab Experimental Playground
          </h1>
          <p className="text-xs sm:text-sm text-[#6F6F6A] dark:text-[#A0A09B] mt-1">
            Interactive test bench for animations, components, algorithms, and sandbox features.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 gap-1.5 font-mono text-xs"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 text-[#D97706]" />
                <span>Pause Animations</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-[#16A34A]" />
                <span>Play Animations</span>
              </>
            )}
          </Button>

          <Link href="/encryption">
            <Button size="sm" variant="primary" className="h-8 font-mono text-xs">
              Go to Encryption
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of 4 Animation Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* =========================================================================
            OPTION 1: Precision Beam Scanner
           ========================================================================= */}
        <Card
          className={`flex flex-col border transition-all overflow-hidden ${
            selectedOpt === 1
              ? "border-[#2563EB] dark:border-[#5B8CFF] ring-1 ring-[#2563EB]/20"
              : "border-[#E8E8E3] dark:border-[#292929]"
          }`}
        >
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E3] dark:border-[#292929] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
              <div>
                <div className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0]">
                  Option 1: Precision Beam Scanner
                </div>
                <div className="text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                  Laboratory-grade laser sweep · Recommended
                </div>
              </div>
            </div>
            <Button
              size="xs"
              variant={selectedOpt === 1 ? "primary" : "outline"}
              onClick={() => setSelectedOpt(1)}
              className="h-6 text-[11px] font-mono px-2"
            >
              {selectedOpt === 1 ? <Check className="h-3 w-3 mr-1" /> : null}
              {selectedOpt === 1 ? "Selected" : "Select"}
            </Button>
          </CardHeader>

          <CardContent className="relative flex-1 min-h-[300px] flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-hidden">
            {/* Base Image */}
            <div className="relative max-h-[260px] max-w-full rounded-sm overflow-hidden border border-[#E8E8E3] dark:border-[#292929]">
              <img
                src={sampleImage}
                alt="Option 1"
                className="max-h-[260px] w-auto object-contain transition-opacity duration-300 opacity-80"
              />

              {/* Laser Beam Scanner Overlay */}
              {isPlaying && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* Thin Scanning Beam */}
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563EB] dark:via-[#5B8CFF] to-transparent shadow-[0_0_12px_#2563EB]"
                    style={{
                      animation: "beamSweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                    }}
                  />
                  {/* Subtle Light Scrim Following Beam */}
                  <div
                    className="absolute left-0 right-0 h-16 bg-gradient-to-b from-[#2563EB]/10 to-transparent"
                    style={{
                      animation: "beamSweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                    }}
                  />
                </div>
              )}

              {/* Minimal Monospace Status Pill */}
              {isPlaying && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-2.5 py-1 rounded bg-[#181818]/90 dark:bg-black/90 border border-white/20 shadow-md backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5B8CFF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2563EB]"></span>
                  </span>
                  <span className="font-mono text-[10px] text-white tracking-wider uppercase font-medium">
                    OPTICAL DRPE PHASE SWEEP ···
                  </span>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-3 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#151515] text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
            A single, ultra-thin 1px horizontal laser beam sweeps smoothly downward. Zero clutter, mimics physical optical Fourier wavefront modulation.
          </div>
        </Card>

        {/* =========================================================================
            OPTION 2: Monochrome Geometric Crosshair Grid
           ========================================================================= */}
        <Card
          className={`flex flex-col border transition-all overflow-hidden ${
            selectedOpt === 2
              ? "border-[#2563EB] dark:border-[#5B8CFF] ring-1 ring-[#2563EB]/20"
              : "border-[#E8E8E3] dark:border-[#292929]"
          }`}
        >
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E3] dark:border-[#292929] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
              <div>
                <div className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0]">
                  Option 2: Geometric Crosshair Grid
                </div>
                <div className="text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                  Technical telemetry & coordinate matrix
                </div>
              </div>
            </div>
            <Button
              size="xs"
              variant={selectedOpt === 2 ? "primary" : "outline"}
              onClick={() => setSelectedOpt(2)}
              className="h-6 text-[11px] font-mono px-2"
            >
              {selectedOpt === 2 ? <Check className="h-3 w-3 mr-1" /> : null}
              {selectedOpt === 2 ? "Selected" : "Select"}
            </Button>
          </CardHeader>

          <CardContent className="relative flex-1 min-h-[300px] flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-hidden">
            {/* Base Image */}
            <div className="relative max-h-[260px] max-w-full rounded-sm overflow-hidden border border-[#E8E8E3] dark:border-[#292929]">
              <img
                src={sampleImage}
                alt="Option 2"
                className="max-h-[260px] w-auto object-contain transition-opacity duration-300 opacity-75"
              />

              {/* Overlay Grid */}
              {isPlaying && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Subtle 3x3 Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/20">
                    <div className="border-r border-b border-dashed border-white/25"></div>
                    <div className="border-r border-b border-dashed border-white/25"></div>
                    <div className="border-b border-dashed border-white/25"></div>
                    <div className="border-r border-b border-dashed border-white/25"></div>
                    <div className="border-r border-b border-dashed border-white/25 flex items-center justify-center">
                      {/* Center Crosshair Marker */}
                      <div className="w-6 h-6 relative flex items-center justify-center">
                        <div className="absolute w-full h-[1px] bg-blue-500 animate-pulse"></div>
                        <div className="absolute h-full w-[1px] bg-blue-500 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full border border-blue-400"></div>
                      </div>
                    </div>
                    <div className="border-b border-dashed border-white/25"></div>
                    <div className="border-r border-dashed border-white/25"></div>
                    <div className="border-r border-dashed border-white/25"></div>
                    <div></div>
                  </div>

                  {/* Corner Coordinates */}
                  <div className="absolute top-1.5 left-2 font-mono text-[9px] text-white/70">
                    LOC: [000, 000]
                  </div>
                  <div className="absolute bottom-1.5 right-2 font-mono text-[9px] text-white/70">
                    DIM: [512×512]
                  </div>

                  {/* Bottom Center Status Pill */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818]/90 dark:bg-black/90 border border-white/20 shadow-md backdrop-blur-md">
                    <span className="font-mono text-[10px] text-white tracking-wider uppercase font-medium">
                      DIFFUSION MATRIX COMPUTE
                    </span>
                    <span className="font-mono text-[10px] text-blue-400 animate-pulse">
                      [RUNNING]
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-3 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#151515] text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
            A subtle dashed coordinate grid with micro corner telemetry ticks and a minimal center crosshair reticle.
          </div>
        </Card>

        {/* =========================================================================
            OPTION 3: Micro Quantum Phase Noise Overlay (Glitch Shimmer)
           ========================================================================= */}
        <Card
          className={`flex flex-col border transition-all overflow-hidden ${
            selectedOpt === 3
              ? "border-[#2563EB] dark:border-[#5B8CFF] ring-1 ring-[#2563EB]/20"
              : "border-[#E8E8E3] dark:border-[#292929]"
          }`}
        >
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E3] dark:border-[#292929] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Binary className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
              <div>
                <div className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0]">
                  Option 3: Quantum Spectral Shimmer
                </div>
                <div className="text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                  Mathematical phase dispersion shimmer
                </div>
              </div>
            </div>
            <Button
              size="xs"
              variant={selectedOpt === 3 ? "primary" : "outline"}
              onClick={() => setSelectedOpt(3)}
              className="h-6 text-[11px] font-mono px-2"
            >
              {selectedOpt === 3 ? <Check className="h-3 w-3 mr-1" /> : null}
              {selectedOpt === 3 ? "Selected" : "Select"}
            </Button>
          </CardHeader>

          <CardContent className="relative flex-1 min-h-[300px] flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-hidden">
            {/* Base Image */}
            <div className="relative max-h-[260px] max-w-full rounded-sm overflow-hidden border border-[#E8E8E3] dark:border-[#292929]">
              <img
                src={sampleImage}
                alt="Option 3"
                className="max-h-[260px] w-auto object-contain transition-opacity duration-300 opacity-85"
              />

              {/* Shimmer / Dispersion Wave Overlay */}
              {isPlaying && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* Subtle Diagonal Shimmer Wave */}
                  <div
                    className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/15 dark:via-white/10 to-transparent skew-x-12"
                    style={{
                      animation: "shimmerMove 2s infinite linear",
                    }}
                  />

                  {/* Micro Phase Perturbation Status */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded bg-[#181818]/90 dark:bg-black/90 border border-blue-500/40 shadow-md backdrop-blur-md">
                    <span className="font-mono text-[10px] text-white tracking-tight">
                      TRANSFORMING SPECTRUM
                    </span>
                    <span className="font-mono text-[10px] text-[#A0A09B]">
                      π[F(u,v)]
                    </span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-[#5B8CFF] animate-bounce delay-75"></span>
                      <span className="w-1 h-1 rounded-full bg-[#5B8CFF] animate-bounce delay-150"></span>
                      <span className="w-1 h-1 rounded-full bg-[#5B8CFF] animate-bounce delay-300"></span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-3 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#151515] text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
            A soft mathematical light refraction shimmer passes diagonally over the image while preserving image visibility.
          </div>
        </Card>

        {/* =========================================================================
            OPTION 4: Corner Bracket Framing & Micro Dot Loader
           ========================================================================= */}
        <Card
          className={`flex flex-col border transition-all overflow-hidden ${
            selectedOpt === 4
              ? "border-[#2563EB] dark:border-[#5B8CFF] ring-1 ring-[#2563EB]/20"
              : "border-[#E8E8E3] dark:border-[#292929]"
          }`}
        >
          <CardHeader className="py-3 px-4 border-b border-[#E8E8E3] dark:border-[#292929] flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
              <div>
                <div className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0]">
                  Option 4: Corner Bracket Framing
                </div>
                <div className="text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                  Swiss minimalism · Dieter Rams inspired
                </div>
              </div>
            </div>
            <Button
              size="xs"
              variant={selectedOpt === 4 ? "primary" : "outline"}
              onClick={() => setSelectedOpt(4)}
              className="h-6 text-[11px] font-mono px-2"
            >
              {selectedOpt === 4 ? <Check className="h-3 w-3 mr-1" /> : null}
              {selectedOpt === 4 ? "Selected" : "Select"}
            </Button>
          </CardHeader>

          <CardContent className="relative flex-1 min-h-[300px] flex items-center justify-center p-4 bg-[#FAFAF8] dark:bg-[#101010] overflow-hidden">
            {/* Base Image */}
            <div className="relative max-h-[260px] max-w-full rounded-sm overflow-hidden border border-[#E8E8E3] dark:border-[#292929] p-2">
              <img
                src={sampleImage}
                alt="Option 4"
                className="max-h-[240px] w-auto object-contain transition-opacity duration-300 opacity-90"
              />

              {/* 4 Corner L-Brackets */}
              {isPlaying && (
                <div className="absolute inset-2 pointer-events-none">
                  {/* Top-Left */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#2563EB] dark:border-[#5B8CFF]" />
                  {/* Top-Right */}
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#2563EB] dark:border-[#5B8CFF]" />
                  {/* Bottom-Left */}
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#2563EB] dark:border-[#5B8CFF]" />
                  {/* Bottom-Right */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#2563EB] dark:border-[#2563EB] dark:border-[#5B8CFF]" />

                  {/* Micro Minimalist Center Badge */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/95 dark:bg-[#181818]/95 border border-[#E8E8E3] dark:border-[#292929] shadow-md backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping" />
                      <span className="font-mono text-[11px] font-medium text-[#181818] dark:text-[#F2F2F0] tracking-wider">
                        ENCRYPTING
                      </span>
                      <span className="font-mono text-xs text-[#6F6F6A] dark:text-[#A0A09B] tracking-widest animate-pulse">
                        ···
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-3 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#151515] text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
            Ultra-clean corner brackets with a sharp, high-contrast monospace status pill. Maximum elegance and restraint.
          </div>
        </Card>
      </div>

      {/* CSS Keyframes for the animations */}
      <style jsx global>{`
        @keyframes beamSweep {
          0% {
            top: -10%;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            top: 105%;
            opacity: 0;
          }
        }

        @keyframes shimmerMove {
          0% {
            transform: translateX(-100%) skewX(-15deg);
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
          }
        }
      `}</style>
    </div>
  );
}
