"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Sparkles } from "lucide-react";

interface PresetKernel {
  name: string;
  desc: string;
  size: 3 | 5;
  matrix: number[][];
}

const PRESET_KERNELS: PresetKernel[] = [
  {
    name: "Sharpen",
    desc: "Emphasize edges and high frequencies",
    size: 3,
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  },
  {
    name: "Laplacian",
    desc: "Second-order isotropic derivative",
    size: 3,
    matrix: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
  },
  {
    name: "Emboss",
    desc: "Directional 3D topographical relief",
    size: 3,
    matrix: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
    ],
  },
  {
    name: "Box Blur",
    desc: "Uniform unweighted spatial averaging",
    size: 3,
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
  },
  {
    name: "Edge Detect",
    desc: "Horizontal & vertical contour isolator",
    size: 3,
    matrix: [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0],
    ],
  },
  {
    name: "Gaussian 5×5",
    desc: "5×5 discrete binomial bell curve",
    size: 5,
    matrix: [
      [1, 4, 6, 4, 1],
      [4, 16, 24, 16, 4],
      [6, 24, 36, 24, 6],
      [4, 16, 24, 16, 4],
      [1, 4, 6, 4, 1],
    ],
  },
];

interface CustomKernelInputProps {
  kernelStr: string;
  onChange: (str: string) => void;
}

export function CustomKernelInput({ kernelStr, onChange }: CustomKernelInputProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  // Parse current matrix safely
  let matrix: number[][] = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ];
  try {
    const parsed = JSON.parse(kernelStr);
    if (
      Array.isArray(parsed) &&
      parsed.length >= 2 &&
      Array.isArray(parsed[0]) &&
      parsed[0].length === parsed.length
    ) {
      matrix = parsed;
    }
  } catch {
    // fallback matrix
  }

  const currentSize = matrix.length;

  const updateMatrixCell = (r: number, c: number, val: number) => {
    const newMatrix = matrix.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? val : cell))
    );
    onChange(JSON.stringify(newMatrix));
  };

  const setMatrixSize = (size: 3 | 5) => {
    if (size === currentSize) return;
    if (size === 3) {
      onChange(JSON.stringify(PRESET_KERNELS[0].matrix));
    } else {
      onChange(JSON.stringify(PRESET_KERNELS[5].matrix));
    }
  };

  const applyPreset = (preset: PresetKernel) => {
    onChange(JSON.stringify(preset.matrix));
  };

  const handleNormalize = () => {
    const sum = matrix.reduce((acc, row) => acc + row.reduce((rSum, v) => rSum + v, 0), 0);
    if (sum !== 0) {
      const normalized = matrix.map((row) =>
        row.map((v) => Number((v / sum).toFixed(4)))
      );
      onChange(JSON.stringify(normalized));
    }
  };

  const handleZeroReset = () => {
    const zero = Array.from({ length: currentSize }, () =>
      Array.from({ length: currentSize }, () => 0)
    );
    zero[Math.floor(currentSize / 2)][Math.floor(currentSize / 2)] = 1;
    onChange(JSON.stringify(zero));
  };

  const matrixSum = matrix.reduce(
    (acc, row) => acc + row.reduce((rSum, v) => rSum + (Number(v) || 0), 0),
    0
  );

  return (
    <div className="space-y-3.5">
      {/* Header bar: Tabs & Dimensions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-0.5 rounded-md bg-[#F4F4F1] dark:bg-[#1E1E1E] border border-[#E8E8E3] dark:border-[#292929]">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
              activeTab === "visual"
                ? "bg-white dark:bg-[#141414] text-[#181818] dark:text-[#F2F2F0] shadow-xs"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            }`}
          >
            Visual Grid
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
              activeTab === "json"
                ? "bg-white dark:bg-[#141414] text-[#181818] dark:text-[#F2F2F0] shadow-xs"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            }`}
          >
            Raw JSON
          </button>
        </div>

        {/* Matrix Size Toggle (3x3 or 5x5) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMatrixSize(3)}
            className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
              currentSize === 3
                ? "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#5B8CFF]/15 dark:text-[#5B8CFF] font-medium border border-[#2563EB]/30 dark:border-[#5B8CFF]/30"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] border border-transparent"
            }`}
          >
            3×3
          </button>
          <button
            type="button"
            onClick={() => setMatrixSize(5)}
            className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
              currentSize === 5
                ? "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#5B8CFF]/15 dark:text-[#5B8CFF] font-medium border border-[#2563EB]/30 dark:border-[#5B8CFF]/30"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] border border-transparent"
            }`}
          >
            5×5
          </button>
        </div>
      </div>

      {/* Visual Interactive Matrix Grid */}
      {activeTab === "visual" ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#121212] flex flex-col items-center">
            <div
              className="grid gap-1.5 w-full max-w-[280px]"
              style={{
                gridTemplateColumns: `repeat(${currentSize}, minmax(0, 1fr))`,
              }}
            >
              {matrix.map((row, r) =>
                row.map((cell, c) => {
                  const isCenter =
                    r === Math.floor(currentSize / 2) &&
                    c === Math.floor(currentSize / 2);
                  return (
                    <input
                      key={`${r}-${c}`}
                      type="number"
                      step="any"
                      value={cell}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateMatrixCell(r, c, isNaN(val) ? 0 : val);
                      }}
                      className={`w-full text-center py-1.5 px-0.5 text-xs font-mono rounded border transition-colors outline-none focus:ring-1 focus:ring-[#2563EB] dark:focus:ring-[#5B8CFF] ${
                        isCenter
                          ? "bg-white dark:bg-[#1C1C1C] border-[#2563EB]/40 dark:border-[#5B8CFF]/40 text-[#2563EB] dark:text-[#5B8CFF] font-semibold"
                          : "bg-white dark:bg-[#181818] border-[#E8E8E3] dark:border-[#2D2D2D] text-[#181818] dark:text-[#F2F2F0]"
                      }`}
                      title={`Row ${r + 1}, Col ${c + 1}${isCenter ? " (Kernel Center)" : ""}`}
                    />
                  );
                })
              )}
            </div>

            {/* Matrix Metadata & Quick Tools */}
            <div className="flex items-center justify-between w-full max-w-[280px] pt-2.5 mt-2 border-t border-[#E8E8E3] dark:border-[#292929] text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
              <span>
                Sum: <strong className="text-[#181818] dark:text-[#F2F2F0]">{matrixSum.toFixed(2)}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNormalize}
                  title="Scale elements so total matrix sum equals 1.0"
                  className="hover:text-[#2563EB] dark:hover:text-[#5B8CFF] underline cursor-pointer"
                >
                  Normalize
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleZeroReset}
                  title="Reset to identity delta impulse"
                  className="hover:text-[#2563EB] dark:hover:text-[#5B8CFF] underline cursor-pointer"
                >
                  Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Raw JSON Editor */
        <div className="space-y-1.5">
          <textarea
            value={kernelStr}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]"
            className="w-full bg-[#FAFAF8] dark:bg-[#121212] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0] font-mono text-xs p-2.5 rounded-md outline-none focus:border-[#2563EB] dark:focus:border-[#5B8CFF]"
          />
        </div>
      )}

      {/* Preset Kernels Selector */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-mono text-[#999993] dark:text-[#6A6A6A] uppercase tracking-wider">
          Standard Kernels
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_KERNELS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-2 py-1 text-xs rounded border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#161616] hover:bg-[#F4F4F1] dark:hover:bg-[#202020] hover:border-[#D0D0C8] dark:hover:border-[#383838] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] transition-colors cursor-pointer"
              title={preset.desc}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
