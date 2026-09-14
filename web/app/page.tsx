"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Binary, ImageIcon, Layers, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";
import { ChangeImageModal } from "@/components/upload/ChangeImageModal";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isImgHovered, setIsImgHovered] = useState(false);

  const experiments = [
    {
      step: "01",
      name: "CONVOLUTION",
      desc: "Spatial image filtering, Gaussian blurring, Sobel edge gradients, and Wiener deconvolution",
      href: "/processing/convolution",
      icon: Layers,
    },
    {
      step: "02",
      name: "ENCRYPTION",
      desc: "Double Random Phase Encoding (DRPE), Fourier transform scrambling, DCT, and Arnold chaos",
      href: "/encryption/drpe",
      icon: ShieldCheck,
    },
    {
      step: "03",
      name: "ANALYSIS",
      desc: "Information entropy, differential attack resistance (NPCR/UACI), and adjacent pixel correlation",
      href: "/analysis",
      icon: Binary,
    },
  ];

  return (
    <>
      <div className="max-w-6xl py-8 sm:py-14 space-y-20">
        {/* Introductory Area: Hero + Target Image Card Side-by-Side */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Title & Mission */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] leading-[1.12]">
              Computational Imaging Laboratory
            </h1>

            <p className="text-lg text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-2xl font-normal">
              Explore 2D spatial filtering, 4f coherent optical wave encryption, and quantitative security cryptanalysis through an interactive scientific workbench.
            </p>

            <div className="pt-2 flex items-center gap-4">
              <Link href="/workspace">
                <Button variant="primary" size="lg" className="px-5 py-2.5 text-base font-medium">
                  <span>Start with an image</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Refined Research Target Card */}
          <div className="lg:col-span-5">
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="relative rounded-2xl border border-[#E8E8E3] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-5 shadow-sm space-y-4 transition-all">
                {/* Header Label & Target Status */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#7A7A75] uppercase font-semibold">
                    ACTIVE TARGET
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#059669]/10 dark:bg-[#34D399]/15 text-[#059669] dark:text-[#34D399] text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#059669] dark:bg-[#34D399]" />
                    <span>Loaded</span>
                  </div>
                </div>

                {/* Target Media Row */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Thumbnail with Hover to Inspect */}
                  <div
                    className="relative group shrink-0 cursor-pointer"
                    onMouseEnter={() => setIsImgHovered(true)}
                    onMouseLeave={() => setIsImgHovered(false)}
                    onClick={() => setIsChangeModalOpen(true)}
                    title="Hover to view large preview · Click to change"
                  >
                    <div className="h-20 w-20 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#0c0c0c] flex items-center justify-center checkerboard-pattern group-hover:ring-2 group-hover:ring-[#2563EB]/50 transition-all shadow-xs">
                      <img
                        src={activeArtifact.dataUri}
                        alt={activeArtifact.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Target Details */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div
                      className="text-base font-medium text-[#181818] dark:text-[#F2F2F0] truncate leading-tight"
                      title={activeArtifact.name}
                    >
                      {activeArtifact.name}
                    </div>

                    <div className="font-mono text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                      {activeArtifact.width} × {activeArtifact.height} px
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#888882] dark:text-[#777772]">
                      <span className="capitalize">{activeArtifact.sourceBench || "upload"}</span>
                      <span>·</span>
                      <span className="text-[11px]">Hover preview</span>
                    </div>
                  </div>
                </div>

                {/* Buttons Row */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-[#F0F0EB] dark:border-[#222222]">
                  <Button
                    variant="outline"
                    size="md"
                    className="flex-1 text-sm font-medium"
                    onClick={() => setIsChangeModalOpen(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#6F6F6A] dark:text-[#A0A09B]" />
                    <span>Change</span>
                  </Button>
                  <Link href="/encryption/drpe" className="flex-1">
                    <Button variant="primary" size="md" className="w-full text-sm font-medium">
                      Run DRPE
                    </Button>
                  </Link>
                </div>

                {/* Big Frame Inspection Popover */}
                {isImgHovered && (
                  <div
                    className="absolute right-0 top-full mt-3 z-50 p-3.5 rounded-2xl border border-[#E8E8E3] dark:border-[#2D2D2D] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
                    style={{ width: "360px" }}
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#0c0c0c] flex items-center justify-center checkerboard-pattern">
                      <img
                        src={activeArtifact.dataUri}
                        alt={activeArtifact.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="mt-3 px-1 flex items-center justify-between text-xs">
                      <div className="truncate font-medium text-[#181818] dark:text-[#F2F2F0] pr-2 text-sm">
                        {activeArtifact.name}
                      </div>
                      <div className="shrink-0 font-mono text-xs text-[#8E8E88] dark:text-[#888882]">
                        {activeArtifact.width} × {activeArtifact.height} px
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : isMounted ? (
              <div
                onClick={() => setIsChangeModalOpen(true)}
                className="rounded-2xl border border-dashed border-[#D7D7D1] dark:border-[#333333] hover:border-[#999993] dark:hover:border-[#555555] bg-white dark:bg-[#141414] p-8 text-center cursor-pointer transition-all space-y-3 group"
              >
                <div className="h-12 w-12 mx-auto rounded-full bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center text-[#888880] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">
                  No target image loaded
                </div>
                <div className="text-xs text-[#999993] dark:text-[#6A6A6A]">
                  Click to choose a preset or upload an image
                </div>
              </div>
            ) : null}
          </div>
        </section>

      {/* Experiments Index */}
      <section className="space-y-4">
        <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
          EXPERIMENTS
        </div>

        <div className="border-t border-[#E8E8E3] dark:border-[#292929] divide-y divide-[#E8E8E3] dark:divide-[#292929]">
          {experiments.map((exp) => {
            const Icon = exp.icon;
            return (
              <Link
                key={exp.step}
                href={exp.href}
                className="group flex items-baseline justify-between py-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-3 px-3 rounded-md transition-colors"
              >
                <div className="flex items-baseline gap-6 sm:gap-8">
                  <span className="font-mono text-sm text-[#999993] dark:text-[#6A6A6A]">
                    {exp.step}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-base font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                      <Icon className="h-4 w-4 text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF]" />
                      <span>{exp.name}</span>
                    </div>
                    <div className="text-sm text-[#6F6F6A] dark:text-[#A0A09B] mt-1 max-w-lg leading-relaxed">
                      {exp.desc}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] group-hover:translate-x-1 transition-all">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      </div>

      {/* Change Image Modal */}
      <ChangeImageModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
      />
    </>
  );
}
