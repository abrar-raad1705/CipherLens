"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface CryptanalysisSummaryProps {
  entropyPlain?: number;
  entropyCipher?: number;
  npcr?: number;
  uaci?: number;
  mse?: number;
  psnr?: number | string;
  ssim?: number;
  correlationCipher?: number;
  className?: string;
}

export function CryptanalysisSummary({
  entropyCipher,
  npcr,
  uaci,
  ssim,
  correlationCipher,
  className = "",
}: CryptanalysisSummaryProps) {
  const metrics = [
    {
      label: "Entropy",
      value: entropyCipher !== undefined ? entropyCipher.toFixed(4) : "—",
      ceiling: "8.000 bits max",
    },
    {
      label: "NPCR",
      value: npcr !== undefined ? `${npcr.toFixed(2)}%` : "—",
      ceiling: "> 99.60% ideal",
    },
    {
      label: "UACI",
      value: uaci !== undefined ? `${uaci.toFixed(2)}%` : "—",
      ceiling: "~ 33.46% ideal",
    },
    {
      label: "Correlation",
      value: correlationCipher !== undefined ? correlationCipher.toFixed(4) : (ssim !== undefined ? ssim.toFixed(4) : "—"),
      ceiling: "~ 0.0000 uncorrelated",
    },
  ];

  return (
    <div className={cn("py-5 border-y border-[#E8E8E3] dark:border-[#292929]", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1.5">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              {m.label}
            </div>
            <div className="text-2xl sm:text-3xl font-mono text-[#181818] dark:text-[#F2F2F0]">
              {m.value}
            </div>
            <div className="text-xs font-mono text-[#999993] dark:text-[#6A6A6A]">
              {m.ceiling}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
