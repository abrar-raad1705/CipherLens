"use client";

import React, { useState } from "react";
import { Info, Sparkles } from "lucide-react";

interface OpticalBenchDiagramProps {
  activeStage?: string;
  onSelectStage?: (stageKey: string) => void;
  className?: string;
}

export function OpticalBenchDiagram({
  activeStage = "ciphertext",
  onSelectStage,
  className = "",
}: OpticalBenchDiagramProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const stages = [
    {
      id: "original",
      label: "Object f(x, y)",
      sublabel: "Spatial Input",
      x: 70,
      description: "Input image amplitude placed at front focal plane of Lens 1.",
    },
    {
      id: "r1_phase",
      label: "Mask R1(x, y)",
      sublabel: "Spatial Phase",
      x: 175,
      description: "First random phase mask exp[i · 2π · R1] whitening spatial autocorrelation.",
    },
    {
      id: "fourier_spectrum",
      label: "Fourier Plane",
      sublabel: "Spectrum |F(u, v)|",
      x: 310,
      description: "Lens 1 transforms wavefront into continuous 2D spatial frequencies at light speed.",
    },
    {
      id: "r2_phase",
      label: "Mask R2(u, v)",
      sublabel: "Fourier Phase",
      x: 430,
      description: "Second random phase mask in frequency domain scattering spatial frequency coefficients.",
    },
    {
      id: "ciphertext",
      label: "Output C(x, y)",
      sublabel: "Complex Field",
      x: 565,
      description: "Lens 2 performs inverse Fourier transform, forming stationary complex white-noise ciphertext.",
    },
  ];

  const currentInfo = stages.find((s) => s.id === (hoveredStage || activeStage)) || stages[4];

  return (
    <div
      className={`p-4 rounded-lg bg-white dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] shadow-xs ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#F7F6F5] dark:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#383838] text-[#37352F] dark:text-[#E6E5E3]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
            4f Coherent Optical Bench Architecture
          </span>
          <span className="text-[10px] text-[#787774] dark:text-[#9B9B9B] bg-[#F7F6F5] dark:bg-[#2A2A2A] px-2 py-0.5 rounded border border-[#EDEDEB] dark:border-[#333333]">
            DRPE Simulator
          </span>
        </div>

        <div className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
          Click any plane to inspect stage
        </div>
      </div>

      {/* Clean Architectural Optical Bench Vector Diagram */}
      <div className="relative overflow-x-auto py-2">
        <svg
          viewBox="0 0 640 150"
          className="w-full h-auto min-w-[580px] font-sans select-none"
        >
          {/* Base rail */}
          <rect
            x="20"
            y="126"
            width="600"
            height="4"
            rx="2"
            className="fill-[#EDEDEB] dark:fill-[#2E2E2E]"
          />

          {/* Optical Axis */}
          <line
            x1="15"
            y1="62"
            x2="625"
            y2="62"
            strokeDasharray="4 4"
            className="stroke-[#D3D1CB] dark:stroke-[#383838]"
            strokeWidth="1"
          />

          {/* Focal Distance Markers */}
          <g className="fill-[#9B9A97] dark:fill-[#6A6A6A] text-[9px] font-mono text-anchor-middle" textAnchor="middle">
            <text x="140" y="142">f</text>
            <text x="245" y="142">f</text>
            <text x="375" y="142">f</text>
            <text x="495" y="142">f</text>
          </g>

          {/* Optical Beam Traces (Clean, quiet geometric lines) */}
          <g className="stroke-[#2383E2]/40 dark:stroke-[#529CCA]/40" strokeWidth="1" fill="none">
            {/* Parallel rays from Object to Lens 1 */}
            <line x1="70" y1="36" x2="242" y2="36" />
            <line x1="70" y1="88" x2="242" y2="88" />
            {/* Focal convergence to Fourier plane */}
            <line x1="242" y1="36" x2="310" y2="62" />
            <line x1="242" y1="88" x2="310" y2="62" />
            {/* Divergence to Lens 2 */}
            <line x1="310" y1="62" x2="498" y2="36" />
            <line x1="310" y1="62" x2="498" y2="88" />
            {/* Parallel rays to output ciphertext plane */}
            <line x1="498" y1="36" x2="565" y2="36" />
            <line x1="498" y1="88" x2="565" y2="88" />
          </g>

          {/* Lens 1 (x=242) */}
          <g>
            <path
              d="M 242 18 Q 252 62 242 106 Q 232 62 242 18"
              className="fill-[#F7F6F5] dark:fill-[#2A2A2A] stroke-[#787774] dark:stroke-[#9B9B9B]"
              strokeWidth="1.2"
            />
            <text
              x="242"
              y="120"
              textAnchor="middle"
              className="fill-[#787774] dark:fill-[#9B9B9B] text-[9px] font-medium"
            >
              Lens L1 (f)
            </text>
          </g>

          {/* Lens 2 (x=498) */}
          <g>
            <path
              d="M 498 18 Q 508 62 498 106 Q 488 62 498 18"
              className="fill-[#F7F6F5] dark:fill-[#2A2A2A] stroke-[#787774] dark:stroke-[#9B9B9B]"
              strokeWidth="1.2"
            />
            <text
              x="498"
              y="120"
              textAnchor="middle"
              className="fill-[#787774] dark:fill-[#9B9B9B] text-[9px] font-medium"
            >
              Lens L2 (f)
            </text>
          </g>

          {/* Optical Stages Plates */}
          {stages.map((st) => {
            const isSelected = activeStage === st.id;
            const isHovered = hoveredStage === st.id;
            return (
              <g
                key={st.id}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onSelectStage && onSelectStage(st.id)}
                onMouseEnter={() => setHoveredStage(st.id)}
                onMouseLeave={() => setHoveredStage(null)}
              >
                {/* Stage Plate Stand */}
                <rect
                  x={st.x - 1.5}
                  y="92"
                  width="3"
                  height="34"
                  className="fill-[#D3D1CB] dark:fill-[#383838]"
                />

                {/* Stage Card */}
                <rect
                  x={st.x - 22}
                  y="18"
                  width="44"
                  height="74"
                  rx="4"
                  className={`transition-colors ${
                    isSelected
                      ? "fill-[#EFEFED] dark:fill-[#2C2C2C] stroke-[#37352F] dark:stroke-[#E6E5E3] stroke-[1.5]"
                      : isHovered
                      ? "fill-[#F7F6F5] dark:fill-[#262626] stroke-[#9B9A97] dark:stroke-[#555555] stroke-1"
                      : "fill-white dark:fill-[#222222] stroke-[#EDEDEB] dark:stroke-[#2E2E2E] stroke-1"
                  }`}
                />

                {/* Intersection dot */}
                <circle
                  cx={st.x}
                  cy="62"
                  r={isSelected ? 4 : 2.5}
                  className={
                    isSelected
                      ? "fill-[#2383E2]"
                      : "fill-[#787774] dark:fill-[#9B9B9B]"
                  }
                />

                {/* Stage Title */}
                <text
                  x={st.x}
                  y="105"
                  textAnchor="middle"
                  className={`text-[9px] ${
                    isSelected
                      ? "fill-[#37352F] dark:fill-white font-semibold"
                      : "fill-[#787774] dark:fill-[#9B9B9B]"
                  }`}
                >
                  {st.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Stage Explanation HUD */}
      <div className="mt-2 p-2.5 rounded-md bg-[#F7F6F5] dark:bg-[#242424] border border-[#EDEDEB] dark:border-[#2E2E2E] flex items-start gap-2">
        <Info className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B] mt-0.5 flex-shrink-0" />
        <div className="text-xs text-[#37352F] dark:text-[#E6E5E3]">
          <strong>{currentInfo.label} ({currentInfo.sublabel}):</strong>{" "}
          <span className="text-[#787774] dark:text-[#9B9B9B]">{currentInfo.description}</span>
        </div>
      </div>
    </div>
  );
}
