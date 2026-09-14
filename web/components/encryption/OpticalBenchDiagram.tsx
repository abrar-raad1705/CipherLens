"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

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
  const stages = [
    { id: "original", label: "ORIGINAL", sub: "f(x, y)" },
    { id: "r1_phase", label: "R₁", sub: "Phase Mask" },
    { id: "fourier_spectrum", label: "FFT", sub: "Lens L1" },
    { id: "r2_phase", label: "R₂", sub: "Fourier Mask" },
    { id: "ciphertext", label: "OUTPUT", sub: "Ciphertext" },
  ];

  return (
    <div className={cn("py-4 select-none", className)}>
      {/* Scientific Diagram: ORIGINAL ── R₁ ── FFT ── R₂ ── OUTPUT */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-2">
        {stages.map((st, idx) => {
          const isSelected = activeStage === st.id;
          const isLast = idx === stages.length - 1;

          return (
            <React.Fragment key={st.id}>
              {/* Stage Node */}
              <button
                onClick={() => onSelectStage && onSelectStage(st.id)}
                className="group flex flex-col items-center cursor-pointer transition-colors focus:outline-none"
              >
                <div
                  className={cn(
                    "font-mono text-xs px-2.5 py-1 rounded transition-colors border",
                    isSelected
                      ? "border-[#2563EB] text-[#2563EB] dark:border-[#5B8CFF] dark:text-[#5B8CFF] bg-[#2563EB]/5 font-medium"
                      : "border-[#E8E8E3] dark:border-[#292929] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] bg-white dark:bg-[#171717]"
                  )}
                >
                  {st.label}
                </div>
                <span className="font-mono text-[9px] text-[#999993] dark:text-[#6A6A6A] mt-1">
                  {st.sub}
                </span>
              </button>

              {/* Thin Connecting Line */}
              {!isLast && (
                <div className="flex-1 mx-2 h-px bg-[#D7D7D1] dark:bg-[#383838]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
