"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

interface CryptanalysisSummaryProps {
  entropyPlain?: number;
  entropyCipher?: number;
  npcr?: number;
  uaci?: number;
  mse?: number;
  psnr?: number | string;
  ssim?: number;
  className?: string;
}

export function CryptanalysisSummary({
  entropyPlain,
  entropyCipher,
  npcr,
  uaci,
  psnr,
  ssim,
  className = "",
}: CryptanalysisSummaryProps) {
  const isHighSecurity =
    entropyCipher !== undefined &&
    entropyCipher > 7.95 &&
    npcr !== undefined &&
    npcr > 99.0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall Security Verdict Banner */}
      <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-white dark:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#383838] text-[#0F7B6C] dark:text-[#4DAB9A]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3] flex items-center gap-2">
              <span>Quantitative Security Assessment</span>
              {isHighSecurity ? (
                <Badge variant="emerald">High Optical Security</Badge>
              ) : (
                <Badge variant="signal">Evaluating Security</Badge>
              )}
            </div>
            <p className="text-[11px] text-[#787774] dark:text-[#9B9B9B] mt-0.5">
              Entropy, spatial correlation destruction, and differential attack sensitivity benchmarks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#787774] dark:text-[#9B9B9B]">
          <span>Theoretical Ceilings:</span>
          <span className="font-mono text-[#37352F] dark:text-white">Entropy = 8.000</span>
          <span>•</span>
          <span className="font-mono text-[#37352F] dark:text-white">NPCR &gt; 99.6%</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Shannon Information Entropy */}
        <Card>
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase">
                Shannon Entropy
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F1EF] dark:bg-[#2A2A2A] text-[#787774] dark:text-[#9B9B9B] font-mono">
                Max 8.0
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#37352F] dark:text-[#E6E5E3]">
                {entropyCipher !== undefined ? entropyCipher.toFixed(4) : "—"}
              </span>
              <span className="text-[10px] text-[#9B9A97] dark:text-[#787774]">bits/symbol</span>
            </div>

            {/* Visual Entropy Bar */}
            <div className="w-full bg-[#E3E2E0] dark:bg-[#333333] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2383E2] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((entropyCipher || 0) / 8.0) * 100)}%`,
                }}
              />
            </div>

            <div className="text-[10px] text-[#787774] dark:text-[#9B9B9B] flex justify-between font-mono">
              <span>Plain: {entropyPlain !== undefined ? entropyPlain.toFixed(2) : "—"}</span>
              <span className={entropyCipher && entropyCipher > 7.95 ? "text-[#0F7B6C] dark:text-[#4DAB9A]" : ""}>
                {entropyCipher && entropyCipher > 7.95 ? "✓ Flat Random" : "Standard"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. NPCR Differential Attack Resistance */}
        <Card>
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase">
                Differential NPCR
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#DBEDDB] dark:bg-[#203D2E] text-[#1C3829] dark:text-[#4DAB9A] font-mono">
                &gt;99.6%
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#0F7B6C] dark:text-[#4DAB9A]">
                {npcr !== undefined ? `${npcr.toFixed(2)}%` : "—"}
              </span>
              <span className="text-[10px] text-[#9B9A97] dark:text-[#787774]">Pixel Change</span>
            </div>

            {/* Visual NPCR Bar */}
            <div className="w-full bg-[#E3E2E0] dark:bg-[#333333] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0F7B6C] dark:bg-[#4DAB9A] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (npcr || 0))}%` }}
              />
            </div>

            <div className="text-[10px] text-[#787774] dark:text-[#9B9B9B]">
              {npcr && npcr > 99 ? "✓ Immune to 1-pixel change" : "Standard sensitivity"}
            </div>
          </CardContent>
        </Card>

        {/* 3. UACI Average Intensity Change */}
        <Card>
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase">
                Differential UACI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D3E5EF] dark:bg-[#1E394B] text-[#183347] dark:text-[#529CCA] font-mono">
                ~33.4%
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#37352F] dark:text-[#E6E5E3]">
                {uaci !== undefined ? `${uaci.toFixed(2)}%` : "—"}
              </span>
              <span className="text-[10px] text-[#9B9A97] dark:text-[#787774]">Mean Variance</span>
            </div>

            {/* Visual UACI Bar */}
            <div className="w-full bg-[#E3E2E0] dark:bg-[#333333] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2383E2] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((uaci || 0) / 40) * 100)}%` }}
              />
            </div>

            <div className="text-[10px] text-[#787774] dark:text-[#9B9B9B]">
              {uaci && Math.abs(uaci - 33.46) < 2
                ? "✓ Ideal Avalanche Effect"
                : "Continuous diffusion"}
            </div>
          </CardContent>
        </Card>

        {/* 4. Quality & Similarity (SSIM / PSNR) */}
        <Card>
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase">
                Structural SSIM
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F1EF] dark:bg-[#2A2A2A] text-[#787774] dark:text-[#9B9B9B] font-mono">
                [-1, 1]
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-[#37352F] dark:text-[#E6E5E3]">
                {ssim !== undefined ? ssim.toFixed(4) : "—"}
              </span>
              <span className="text-[10px] text-[#9B9A97] dark:text-[#787774] font-mono">
                {typeof psnr === "number" ? `${psnr.toFixed(1)} dB` : psnr || ""}
              </span>
            </div>

            <div className="w-full bg-[#E3E2E0] dark:bg-[#333333] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#9065B0] dark:bg-[#9A6DD7] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, (ssim || 0) * 100))}%` }}
              />
            </div>

            <div className="text-[10px] text-[#787774] dark:text-[#9B9B9B]">
              {ssim !== undefined && ssim < 0.1
                ? "✓ Total Visual Obfuscation"
                : ssim !== undefined && ssim > 0.95
                ? "✓ High Fidelity Recovery"
                : "Comparative similarity"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
