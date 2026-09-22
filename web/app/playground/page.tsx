"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon as ArrowLeft,
  KeyIcon as KeyRound,
  XMarkIcon as X,
  ArrowRightIcon as ArrowRight,
  ShieldCheckIcon as ShieldCheck,
  CheckCircleIcon as CheckCircle2,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

export default function PlaygroundPage() {
  const [selectedPresetAlgo, setSelectedPresetAlgo] = useState<"drpe" | "fourier" | "dct" | "arnold">("drpe");

  const sampleKeyData = {
    drpe: {
      fileName: "bird [Cropped]_drpe_key.txt",
      algo: "DRPE",
      params: "Seed1: 1234 · Seed2: 5678",
      shortParams: "S1:1234 · S2:5678",
    },
    fourier: {
      fileName: "target_phase_fourier_key.txt",
      algo: "FOURIER",
      params: "Phase Seed: 3557",
      shortParams: "Seed: 3557",
    },
    dct: {
      fileName: "butterfly_dct_matrix.txt",
      algo: "DCT",
      params: "Basis Seed: 42",
      shortParams: "Seed: 42",
    },
    arnold: {
      fileName: "secret_arnold_cat_xor.txt",
      algo: "ARNOLD",
      params: "Iterations: 10 · XOR: 0xAA (170)",
      shortParams: "Itr: 10 · XOR: 170",
    },
  }[selectedPresetAlgo];

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/decryption"
              className="inline-flex items-center gap-1 font-mono text-xs text-[#a1a1aa] hover:text-[#3b82f6] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              DECRYPTION BENCH
            </Link>
            <span className="text-xs text-[#52525b]">/</span>
            <span className="font-mono text-xs text-[#3b82f6] font-medium">
              PLAYGROUND · KEY SECTION DESIGNS
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-semibold text-[#f4f4f5] tracking-tight">
            Loaded Key Section: 3 Design Concepts
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#a1a1aa] mt-1 max-w-2xl">
            Preview the loaded key file state inside the exact container dimensions (~300px sidebar width) of the Decryption Bench.
          </p>
        </div>

        {/* Algo switcher to test responsiveness across key types */}
        <div className="flex items-center gap-1.5 bg-[#161616] p-1.5 rounded-xl border border-[#242424]">
          <span className="text-[10px] font-mono text-[#71717A] uppercase px-2">Sample Key:</span>
          {(["drpe", "fourier", "dct", "arnold"] as const).map((algo) => (
            <button
              key={algo}
              type="button"
              onClick={() => setSelectedPresetAlgo(algo)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer ${
                selectedPresetAlgo === algo
                  ? "bg-[#2563EB] text-white font-semibold shadow-xs"
                  : "text-[#8E8E93] hover:text-white hover:bg-white/5"
              }`}
            >
              {algo}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Designs Displayed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* ================= OPTION A ================= */}
        <div className="rounded-2xl border border-emerald-500/30 bg-[#121214] p-5 space-y-4 shadow-lg shadow-emerald-950/10">
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-semibold text-emerald-400">OPTION A</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RECOMMENDED
                </span>
              </div>
              <h3 className="font-sans text-sm font-semibold text-zinc-100 mt-1">
                Cyberpunk Cryptographic Card
              </h3>
            </div>
          </div>

          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Maintains the identical height &amp; visual weight of the empty upload dropzone. Subtle emerald aura, glowing icon badge, and a pill algorithm tag.
          </p>

          {/* Actual Sidebar Simulation */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider">
              Live Sidebar Simulation:
            </span>
            <div className="w-full max-w-[320px] mx-auto p-3.5 rounded-xl border border-[#242424] bg-[#161616] space-y-3 shadow-xs">
              <div className="pb-1 border-b border-[#242424]">
                <div className="text-[11px] font-mono tracking-wider text-[#6A6A6A] uppercase font-medium">
                  DECRYPTION KEY CONTROLS
                </div>
              </div>

              {/* OPTION A COMPONENT */}
              <div className="pt-0.5 pb-2.5 border-b border-[#242424]">
                <div className="rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-emerald-900/10 to-transparent py-3 px-3 transition-all shadow-xs flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8.5 h-8.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-2xs">
                      <KeyRound className="h-4.5 w-4.5 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-100 truncate max-w-[130px]" title={sampleKeyData.fileName}>
                          {sampleKeyData.fileName}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {sampleKeyData.algo}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400/90 truncate mt-0.5">
                        {sampleKeyData.params}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    title="Remove key file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mock Slider underneath */}
              <div className="space-y-1.5 opacity-60 pointer-events-none">
                <div className="flex justify-between text-[11px] font-mono text-[#8E8E93]">
                  <span>Spatial Phase Mask (R₁*)</span>
                  <span>1234</span>
                </div>
                <div className="w-full h-1 bg-[#242424] rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-[#3B82F6]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= OPTION B ================= */}
        <div className="rounded-2xl border border-[#27272a] bg-[#121214] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="font-mono text-xs font-semibold text-blue-400">OPTION B</span>
              </div>
              <h3 className="font-sans text-sm font-semibold text-zinc-100 mt-1">
                Stealth Dark Minimalist
              </h3>
            </div>
          </div>

          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Ultra-sleek charcoal card with a 1px hairline border, electric pulsing emerald dot indicator, and high-contrast clean typography.
          </p>

          {/* Actual Sidebar Simulation */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider">
              Live Sidebar Simulation:
            </span>
            <div className="w-full max-w-[320px] mx-auto p-3.5 rounded-xl border border-[#242424] bg-[#161616] space-y-3 shadow-xs">
              <div className="pb-1 border-b border-[#242424]">
                <div className="text-[11px] font-mono tracking-wider text-[#6A6A6A] uppercase font-medium">
                  DECRYPTION KEY CONTROLS
                </div>
              </div>

              {/* OPTION B COMPONENT */}
              <div className="pt-0.5 pb-2.5 border-b border-[#242424]">
                <div className="rounded-lg border border-[#2d2d2d] bg-[#191919] py-3 px-3 transition-all flex items-start justify-between gap-2.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
                      <span className="text-xs font-medium text-zinc-100 truncate max-w-[170px]" title={sampleKeyData.fileName}>
                        {sampleKeyData.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 pl-4">
                      <span className="text-zinc-300 font-semibold">{sampleKeyData.algo}:</span>
                      <span className="truncate">{sampleKeyData.params}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    title="Remove key file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mock Slider underneath */}
              <div className="space-y-1.5 opacity-60 pointer-events-none">
                <div className="flex justify-between text-[11px] font-mono text-[#8E8E93]">
                  <span>Spatial Phase Mask (R₁*)</span>
                  <span>1234</span>
                </div>
                <div className="w-full h-1 bg-[#242424] rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-[#3B82F6]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= OPTION C ================= */}
        <div className="rounded-2xl border border-[#27272a] bg-[#121214] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-mono text-xs font-semibold text-amber-400">OPTION C</span>
              </div>
              <h3 className="font-sans text-sm font-semibold text-zinc-100 mt-1">
                Floating Token with Replace Action
              </h3>
            </div>
          </div>

          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Horizontal token layout. Features an integrated &quot;Replace&quot; button so you can swap cryptographic keys immediately without clearing first.
          </p>

          {/* Actual Sidebar Simulation */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-mono uppercase text-[#71717A] tracking-wider">
              Live Sidebar Simulation:
            </span>
            <div className="w-full max-w-[320px] mx-auto p-3.5 rounded-xl border border-[#242424] bg-[#161616] space-y-3 shadow-xs">
              <div className="pb-1 border-b border-[#242424]">
                <div className="text-[11px] font-mono tracking-wider text-[#6A6A6A] uppercase font-medium">
                  DECRYPTION KEY CONTROLS
                </div>
              </div>

              {/* OPTION C COMPONENT */}
              <div className="pt-0.5 pb-2.5 border-b border-[#242424]">
                <div className="rounded-lg border border-dashed border-[#333333] hover:border-zinc-500 bg-[#141414] py-3 px-3 flex items-center justify-between gap-2 select-none transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <KeyRound className="h-4 w-4 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate max-w-[110px]" title={sampleKeyData.fileName}>
                        {sampleKeyData.fileName}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">
                        {sampleKeyData.algo} · {sampleKeyData.shortParams}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-2 py-1 rounded text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 cursor-pointer shadow-2xs">
                      Replace
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      title="Clear key file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mock Slider underneath */}
              <div className="space-y-1.5 opacity-60 pointer-events-none">
                <div className="flex justify-between text-[11px] font-mono text-[#8E8E93]">
                  <span>Spatial Phase Mask (R₁*)</span>
                  <span>1234</span>
                </div>
                <div className="w-full h-1 bg-[#242424] rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-[#3B82F6]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
