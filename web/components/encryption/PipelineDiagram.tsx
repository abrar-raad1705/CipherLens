"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";

export interface PipelineStage {
  id: string;
  label: string;
  sub: string;
  description?: string;
  color?: string; // e.g. 'blue', 'cyan', 'emerald', 'amber'
}

interface PipelineDiagramProps {
  stages: PipelineStage[];
  activeStage?: string;
  onSelectStage?: (stageId: string) => void;
  className?: string;
  hasExecuted?: boolean;
}

export function PipelineDiagram({
  stages,
  activeStage,
  onSelectStage,
  className = "",
  hasExecuted = false,
}: PipelineDiagramProps) {
  return (
    <div className={cn("py-2.5 px-3 select-none", className)}>
      <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
        {stages.map((st, idx) => {
          const isSelected = activeStage === st.id;
          const isLast = idx === stages.length - 1;

          return (
            <React.Fragment key={st.id}>
              {/* Stage Node */}
              <button
                type="button"
                onClick={() => onSelectStage && onSelectStage(st.id)}
                className="group flex flex-col items-center cursor-pointer transition-all focus:outline-none"
              >
                <div
                  className={cn(
                    "font-mono text-xs px-3.5 py-1.5 rounded-md transition-all border flex items-center gap-1.5 shadow-xs",
                    isSelected
                      ? "border-[#2563EB] dark:border-[#5B8CFF] text-[#2563EB] dark:text-[#5B8CFF] bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 font-semibold ring-1 ring-[#2563EB]/20 dark:ring-[#5B8CFF]/30"
                      : "border-[#E8E8E3] dark:border-[#292929] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:border-[#D0D0CA] dark:hover:border-[#383838] bg-white dark:bg-[#141414]"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      isSelected
                        ? "bg-[#2563EB] dark:bg-[#5B8CFF]"
                        : hasExecuted
                        ? "bg-[#059669] dark:bg-[#34D399]"
                        : "bg-[#999993] dark:text-[#6A6A6A]"
                    )}
                  />
                  <span>{st.label}</span>
                </div>
                <span className="font-mono text-[10px] text-[#999993] dark:text-[#7A7A75] mt-1.5 font-medium tracking-tight whitespace-nowrap">
                  {st.sub}
                </span>
              </button>

              {/* Connecting Flow Line */}
              {!isLast && (
                <div className="flex-1 mx-2 sm:mx-3 flex items-center justify-center relative min-w-[20px]">
                  <div className="w-full h-px bg-gradient-to-r from-[#D7D7D1] via-[#B8B8B0] to-[#D7D7D1] dark:from-[#292929] dark:via-[#3E3E3E] dark:to-[#292929]" />
                  <ChevronRight className="h-3 w-3 text-[#B0B0A8] dark:text-[#4A4A48] absolute" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
