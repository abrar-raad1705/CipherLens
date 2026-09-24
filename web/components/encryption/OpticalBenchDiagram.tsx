"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export interface PipelineStageSpec {
  id: string;
  tag: string;
  primary: string;
  secondary: string;
  type: "source" | "mask" | "transform" | "result";
}

export const PIPELINE_SPECS: Record<string, PipelineStageSpec[]> = {
  drpe: [
    {
      id: "original",
      tag: "SOURCE",
      primary: "Original",
      secondary: "f(x, y)",
      type: "source",
    },
    {
      id: "r1_phase",
      tag: "MASK 01",
      primary: "R₁",
      secondary: "Spatial Phase",
      type: "mask",
    },
    {
      id: "fourier_spectrum",
      tag: "FOURIER",
      primary: "FFT",
      secondary: "Frequency Plane",
      type: "transform",
    },
    {
      id: "r2_phase",
      tag: "MASK 02",
      primary: "R₂",
      secondary: "Fourier Phase",
      type: "mask",
    },
    {
      id: "ciphertext",
      tag: "OUTPUT",
      primary: "Ciphertext",
      secondary: "g(x, y)",
      type: "result",
    },
  ],
  fourier: [
    {
      id: "original",
      tag: "SOURCE",
      primary: "Original",
      secondary: "f(x, y)",
      type: "source",
    },
    {
      id: "fft_spectrum",
      tag: "TRANSFORM",
      primary: "FFT2",
      secondary: "Frequency Plane",
      type: "transform",
    },
    {
      id: "permuted_spectrum",
      tag: "PERMUTATION",
      primary: "π(k)",
      secondary: "Key Scramble",
      type: "mask",
    },
    {
      id: "ciphertext",
      tag: "OUTPUT",
      primary: "Ciphertext",
      secondary: "g(x, y)",
      type: "result",
    },
  ],
  dct: [
    {
      id: "original",
      tag: "SOURCE",
      primary: "Original",
      secondary: "f(x, y)",
      type: "source",
    },
    {
      id: "dct_basis",
      tag: "TRANSFORM",
      primary: "DCT2",
      secondary: "Cosine Basis",
      type: "transform",
    },
    {
      id: "scrambled_dct",
      tag: "PERMUTATION",
      primary: "π(k)",
      secondary: "Permuted Energy",
      type: "mask",
    },
    {
      id: "ciphertext",
      tag: "OUTPUT",
      primary: "Ciphertext",
      secondary: "g(x, y)",
      type: "result",
    },
  ],
  arnold: [
    {
      id: "original",
      tag: "SOURCE",
      primary: "Original",
      secondary: "f(x, y)",
      type: "source",
    },
    {
      id: "arnold_scramble",
      tag: "CHAOS MAP",
      primary: "CAT MAP",
      secondary: "Toral Shearing",
      type: "transform",
    },
    {
      id: "xor_diffusion",
      tag: "DIFFUSION",
      primary: "XOR ⊕",
      secondary: "Bit Mask",
      type: "mask",
    },
    {
      id: "ciphertext",
      tag: "OUTPUT",
      primary: "Ciphertext",
      secondary: "g(x, y)",
      type: "result",
    },
  ],
  spectral_hybrid: [
    {
      id: "original",
      tag: "SOURCE",
      primary: "Original",
      secondary: "f(x, y)",
      type: "source",
    },
    {
      id: "pixel_scramble",
      tag: "SCRAMBLE",
      primary: "π(k)",
      secondary: "Pixel Permute",
      type: "mask",
    },
    {
      id: "fft_spectrum",
      tag: "TRANSFORM",
      primary: "FFT2",
      secondary: "Frequency Plane",
      type: "transform",
    },
    {
      id: "ciphertext",
      tag: "OUTPUT",
      primary: "Ciphertext",
      secondary: "g(x, y)",
      type: "result",
    },
  ],
  feistel: [
    {
      id: "original",
      tag: "SOURCE",
      primary: "Original",
      secondary: "f(x, y)",
      type: "source",
    },
    {
      id: "left_half",
      tag: "SPLIT L",
      primary: "L₀",
      secondary: "Top Half",
      type: "mask",
    },
    {
      id: "right_half",
      tag: "SPLIT R",
      primary: "R₀",
      secondary: "Bottom Half",
      type: "mask",
    },
    {
      id: "ciphertext",
      tag: "OUTPUT",
      primary: "Ciphertext",
      secondary: "g(x, y)",
      type: "result",
    },
  ],
};

export const PIPELINE_CONNECTORS: Record<string, string[]> = {
  drpe: ["Mask 01", "FFT", "Mask 02", "IFFT"],
  fourier: ["FFT", "Permutation", "IFFT"],
  dct: ["DCT", "Permutation", "IDCT"],
  arnold: ["Pixel Scrambling", "Bit Mask", "XOR Diffusion"],
  spectral_hybrid: ["Pixel Scramble", "FFT Spectrum", "Kernel Convolution"],
  feistel: ["Block Splitting", "DCT Round F(R)", "Feistel Concatenation"],
};

export const DECRYPTION_PIPELINE_SPECS: Record<string, PipelineStageSpec[]> = {
  drpe: [
    {
      id: "ciphertext",
      tag: "INPUT",
      primary: "Cipher",
      secondary: "g(x, y)",
      type: "source",
    },
    {
      id: "r2_conj",
      tag: "DEMOD 01",
      primary: "R₂*",
      secondary: "Fourier Conj",
      type: "mask",
    },
    {
      id: "fourier_demod",
      tag: "IFFT",
      primary: "IFFT",
      secondary: "Frequency Plane",
      type: "transform",
    },
    {
      id: "r1_conj",
      tag: "DEMOD 02",
      primary: "R₁*",
      secondary: "Spatial Conj",
      type: "mask",
    },
    {
      id: "decrypted",
      tag: "OUTPUT",
      primary: "Decrypted",
      secondary: "f'(x, y)",
      type: "result",
    },
  ],
  fourier: [
    {
      id: "ciphertext",
      tag: "INPUT",
      primary: "Cipher",
      secondary: "g(x, y)",
      type: "source",
    },
    {
      id: "fft_spectrum",
      tag: "TRANSFORM",
      primary: "FFT2",
      secondary: "Frequency Plane",
      type: "transform",
    },
    {
      id: "inverse_perm",
      tag: "INVERSION",
      primary: "π⁻¹(k)",
      secondary: "Key Inversion",
      type: "mask",
    },
    {
      id: "decrypted",
      tag: "OUTPUT",
      primary: "Decrypted",
      secondary: "f'(x, y)",
      type: "result",
    },
  ],
  dct: [
    {
      id: "ciphertext",
      tag: "INPUT",
      primary: "Cipher",
      secondary: "g(x, y)",
      type: "source",
    },
    {
      id: "dct_coeffs",
      tag: "TRANSFORM",
      primary: "DCT2",
      secondary: "Cosine Basis",
      type: "transform",
    },
    {
      id: "inverse_perm",
      tag: "INVERSION",
      primary: "π⁻¹(k)",
      secondary: "Basis Inversion",
      type: "mask",
    },
    {
      id: "decrypted",
      tag: "OUTPUT",
      primary: "Decrypted",
      secondary: "f'(x, y)",
      type: "result",
    },
  ],
  arnold: [
    {
      id: "ciphertext",
      tag: "INPUT",
      primary: "Cipher",
      secondary: "g(x, y)",
      type: "source",
    },
    {
      id: "xor_invert",
      tag: "DIFFUSION",
      primary: "XOR ⊕",
      secondary: "Mask Invert",
      type: "mask",
    },
    {
      id: "inverse_arnold",
      tag: "CHAOS MAP",
      primary: "CAT⁻¹",
      secondary: "Toral Unshear",
      type: "transform",
    },
    {
      id: "decrypted",
      tag: "OUTPUT",
      primary: "Decrypted",
      secondary: "f'(x, y)",
      type: "result",
    },
  ],
  spectral_hybrid: [
    {
      id: "ciphertext",
      tag: "INPUT",
      primary: "Cipher",
      secondary: "g(x, y)",
      type: "source",
    },
    {
      id: "decrypted",
      tag: "OUTPUT",
      primary: "Decrypted",
      secondary: "f'(x, y)",
      type: "result",
    },
  ],
  feistel: [
    {
      id: "ciphertext",
      tag: "INPUT",
      primary: "Cipher",
      secondary: "g(x, y)",
      type: "source",
    },
    {
      id: "decrypted",
      tag: "OUTPUT",
      primary: "Decrypted",
      secondary: "f'(x, y)",
      type: "result",
    },
  ],
};

export const DECRYPTION_PIPELINE_CONNECTORS: Record<string, string[]> = {
  drpe: ["Conj R₂*", "Inverse FFT", "Conj R₁*", "Wavefront Readout"],
  fourier: ["FFT2", "Inverse Permute", "IFFT2"],
  dct: ["DCT2", "Inverse Permute", "IDCT2"],
  arnold: ["XOR Invert", "Toral Unshear", "Decrypted Output"],
  spectral_hybrid: ["Wiener Deconv", "Conjugate Phase", "Inverse Permute"],
  feistel: ["Reverse Rounds", "Inverse F(R)", "Decrypted Output"],
};

interface OpticalBenchDiagramProps {
  algorithm?: string;
  mode?: "encrypt" | "decrypt";
  activeStage?: string;
  onSelectStage?: (stageKey: string) => void;
  className?: string;
  hasExecuted?: boolean;
  isExecuting?: boolean;
  sourcePreviewSrc?: string;
  outputPreviewSrc?: string;
  stagePreviews?: Record<string, string> | null;
  layout?: "horizontal" | "vertical";
}

export function OpticalBenchDiagram({
  algorithm = "drpe",
  mode = "encrypt",
  activeStage,
  onSelectStage,
  className = "",
  hasExecuted = false,
  isExecuting = false,
  sourcePreviewSrc,
  outputPreviewSrc,
  stagePreviews,
}: OpticalBenchDiagramProps) {
  const specMap = mode === "decrypt" ? DECRYPTION_PIPELINE_SPECS : PIPELINE_SPECS;
  const connMap = mode === "decrypt" ? DECRYPTION_PIPELINE_CONNECTORS : PIPELINE_CONNECTORS;
  const stages = specMap[algorithm] || specMap.drpe;
  const connectorLabels = connMap[algorithm] || connMap.drpe;
  const resolvedActiveStage = activeStage || (mode === "decrypt" ? "decrypted" : "ciphertext");
  const activeIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === resolvedActiveStage)
  );

  const fillPercent = stages.length > 1 ? (activeIndex / (stages.length - 1)) * 100 : 0;

  return (
    <div className={cn("w-full select-none relative py-1", className)}>
      <div className="w-full px-2 sm:px-4">
        {/* Relative inner container for continuous line from start to end */}
        <div className="relative z-10 flex items-start justify-between w-full">
          {/* Continuous Pipeline Track from Start Node Center to Last Node Center */}
          <div
            className="absolute top-[24px] h-[2px] -translate-y-1/2 z-0 pointer-events-none"
            style={{
              left: `${50 / stages.length}%`,
              right: `${50 / stages.length}%`,
            }}
          >
            {/* Inactive Base Track */}
            <div className="absolute inset-0 bg-[#E5E5DE] dark:bg-[#252525]" />

            {/* Active Continuous Beam - Fills Continuously from Start Node to Active/Last Node */}
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-400 transition-[width] duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              style={{
                width: `${fillPercent}%`,
              }}
            />

            {/* Continuous Execution Wave during processing */}
            {isExecuting && (
              <>
                <div className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-400 animate-pipeline-continuous-fill shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <div className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white dark:via-blue-200 to-transparent animate-pipeline-beam-continuous" />
              </>
            )}
          </div>

          {stages.map((st, idx) => {
            const isSelected = resolvedActiveStage === st.id;
            const isPastOrCurrent = idx <= activeIndex;
            const isSource = st.type === "source";
            const isResult = st.type === "result";
            const isTransform = st.type === "transform";
            const isMask = st.type === "mask";

            // Determine stage preview image if available
            let previewUri: string | undefined = undefined;
            if (stagePreviews?.[st.id]) {
              previewUri = stagePreviews[st.id];
            } else if (isSource) {
              previewUri = sourcePreviewSrc;
            } else if (isResult) {
              previewUri = outputPreviewSrc || stagePreviews?.decrypted || stagePreviews?.ciphertext;
            }

            const hasPreview = Boolean(previewUri && (hasExecuted || isSource));

            // Segment connecting THIS node (idx) to the NEXT node (idx + 1)
            const hasNextSegment = idx < stages.length - 1;
            // Segment is illuminated/colored if the active selection reaches or passes next node
            const isSegmentActive = idx < activeIndex;

            return (
              <div
                key={st.id}
                className="relative flex-1 flex flex-col items-center group"
              >
                {/* Floating Connector Label at midpoint between this node and next node */}
                {hasNextSegment && connectorLabels[idx] && (
                  <div className="absolute top-[24px] left-full -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none select-none">
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
                      <span
                        className={cn(
                          "text-[11px] sm:text-xs tracking-tight transition-colors whitespace-nowrap",
                          isSegmentActive
                            ? "text-blue-600 dark:text-blue-400 font-medium"
                            : "text-[#6F6F6A] dark:text-[#A0A09B]"
                        )}
                      >
                        {connectorLabels[idx]}
                      </span>
                    </div>
                  </div>
                )}

              {/* Node Interactive Button */}
              <button
                type="button"
                onClick={() => onSelectStage && onSelectStage(st.id)}
                className="relative z-10 flex flex-col items-center focus:outline-none cursor-pointer transition-all duration-150"
              >
                {/* Fixed-size circular node graphic (w-12 h-12 everywhere for clean baseline alignment) */}
                <div
                  className={cn(
                    "relative w-12 h-12 flex items-center justify-center transition-all duration-200 rounded-full border shadow-2xs overflow-hidden",
                    // State colors & illumination
                    isSelected
                      ? "border-blue-500 dark:border-blue-400 bg-white dark:bg-[#161616] ring-3 ring-blue-500/25 dark:ring-blue-400/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                      : isPastOrCurrent && hasExecuted
                      ? "border-blue-400 dark:border-blue-500/70 bg-white dark:bg-[#141414] group-hover:border-blue-400"
                      : hasExecuted
                      ? "border-[#D0D0C8] dark:border-[#333333] bg-white dark:bg-[#151515] group-hover:border-blue-400/60 dark:group-hover:border-blue-500/60"
                      : "border-[#E0E0DA] dark:border-[#282828] bg-[#FAFAF8] dark:bg-[#131313] opacity-80 group-hover:opacity-100"
                  )}
                >
                  {/* Real Image Preview when available */}
                  {hasPreview ? (
                    <div className="w-full h-full p-0.5 rounded-full overflow-hidden bg-black/5 dark:bg-black/40">
                      <img
                        src={previewUri}
                        alt={st.secondary}
                        className={cn(
                          "w-full h-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105",
                          isSource ? "filter grayscale contrast-110 group-hover:filter-none" : ""
                        )}
                      />
                    </div>
                  ) : isMask ? (
                    // Fallback subtle phase/noise pattern
                    <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      <div
                        className={cn(
                          "absolute inset-1 rounded-full transition-opacity",
                          isSelected
                            ? "opacity-40"
                            : isPastOrCurrent && hasExecuted
                            ? "opacity-30"
                            : "opacity-20 group-hover:opacity-30"
                        )}
                        style={{
                          backgroundImage: `radial-gradient(#3b82f6 0.75px, transparent 0.75px), radial-gradient(#60a5fa 0.75px, transparent 0.75px)`,
                          backgroundSize: "4px 4px",
                          backgroundPosition: "0 0, 2px 2px",
                        }}
                      />
                      <span
                        className={cn(
                          "font-mono text-xs font-semibold z-10 transition-colors",
                          isSelected
                            ? "text-blue-600 dark:text-blue-400 font-bold"
                            : isPastOrCurrent && hasExecuted
                            ? "text-blue-900/80 dark:text-blue-200/90"
                            : "text-[#6F6F6A] dark:text-[#A0A09B]"
                        )}
                      >
                        {st.primary}
                      </span>
                    </div>
                  ) : isTransform ? (
                    // Fallback transform node aperture
                    <div className="relative w-full h-full rounded-full flex items-center justify-center">
                      <div
                        className={cn(
                          "absolute inset-1.5 rounded-full border border-dashed transition-colors",
                          isSelected
                            ? "border-blue-500/70 dark:border-blue-400/70"
                            : isPastOrCurrent && hasExecuted
                            ? "border-blue-400/40 dark:border-blue-500/40"
                            : "border-[#D0D0C8] dark:border-[#383838] group-hover:border-blue-400/40"
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono text-xs tracking-tight font-bold z-10 transition-colors",
                          isSelected
                            ? "text-blue-600 dark:text-blue-400"
                            : isPastOrCurrent && hasExecuted
                            ? "text-blue-900 dark:text-blue-200"
                            : "text-[#181818] dark:text-[#F2F2F0]"
                        )}
                      >
                        {st.primary}
                      </span>
                    </div>
                  ) : (
                    // Default icon / label
                    <span
                      className={cn(
                        "font-mono text-[11px] font-bold transition-colors",
                        isSelected
                          ? "text-blue-600 dark:text-blue-400"
                          : isPastOrCurrent && hasExecuted
                          ? "text-blue-900 dark:text-blue-200"
                          : "text-[#6F6F6A] dark:text-[#A0A09B]"
                      )}
                    >
                      {st.primary}
                    </span>
                  )}
                </div>

                {/* Vertically Aligned Label Container with Full Text Visibility */}
                <div className="flex flex-col items-center text-center mt-2 w-full max-w-[130px] sm:max-w-[150px]">
                  {/* Primary Function / Stage Name */}
                  <div className="min-h-[1.25rem] flex items-center justify-center w-full">
                    <span
                      className={cn(
                        "text-[11px] sm:text-xs tracking-tight transition-colors whitespace-nowrap block",
                        isSelected
                          ? "text-blue-600 dark:text-blue-400 font-semibold"
                          : isPastOrCurrent && hasExecuted
                          ? "text-[#181818] dark:text-[#F2F2F0] font-medium"
                          : "text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0]"
                      )}
                    >
                      {st.secondary}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
