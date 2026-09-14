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

          {/* Right Column: Prominent Research Target Card */}
          <div className="lg:col-span-5">
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="group/card relative rounded-2xl border border-[#E8E8E3] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#151515] p-5 shadow-sm space-y-4 transition-all hover:border-[#D0D0C8] dark:hover:border-[#383838]">
                {/* Header Label & Metadata */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono tracking-widest text-[#999993] dark:text-[#7A7A75] uppercase font-semibold">
                      ACTIVE TARGET
                    </span>
                  </div>
                  <div className="font-mono text-xs text-[#888882] dark:text-[#888882] tracking-tight bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-black/5 dark:border-white/5">
                    {activeArtifact.width} × {activeArtifact.height} px
                  </div>
                </div>

                {/* Big Format Image Display Frame */}
                <div
                  className="relative group/img w-full aspect-square max-h-[310px] rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#080808] flex items-center justify-center checkerboard-pattern shadow-inner cursor-pointer"
                  onClick={() => setIsChangeModalOpen(true)}
                  title="Click to change or crop image"
                >
                  <img
                    src={activeArtifact.dataUri}
                    alt={activeArtifact.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/img:scale-[1.02]"
                  />

                  {/* Subtle hover overlay hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="px-4 py-2 rounded-full bg-white/95 dark:bg-[#181818]/95 text-xs font-medium text-[#181818] dark:text-[#F2F2F0] shadow-xl flex items-center gap-2 transform translate-y-1 group-hover/img:translate-y-0 transition-transform duration-200">
                      <RefreshCw className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
                      <span>Change Image</span>
                    </div>
                  </div>
                </div>

                {/* Target Information & Action Row */}
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-start justify-between min-w-0">
                    <div className="min-w-0 flex-1 pr-3">
                      <div
                        className="text-base font-medium text-[#181818] dark:text-[#F2F2F0] truncate leading-snug"
                        title={activeArtifact.name}
                      >
                        {activeArtifact.name}
                      </div>
                      <div className="text-xs text-[#888882] dark:text-[#777772] capitalize mt-0.5">
                        Source: {activeArtifact.sourceBench || "upload"}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Button Row */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F0F0EB] dark:border-[#222222]">
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full text-sm font-medium"
                      onClick={() => setIsChangeModalOpen(true)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#6F6F6A] dark:text-[#A0A09B]" />
                      <span>Change</span>
                    </Button>
                    <Link href="/encryption/drpe" className="w-full">
                      <Button variant="primary" size="md" className="w-full text-sm font-medium">
                        Run DRPE
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : isMounted ? (
              <div
                onClick={() => setIsChangeModalOpen(true)}
                className="rounded-2xl border border-dashed border-[#D7D7D1] dark:border-[#333333] hover:border-[#2563EB] dark:hover:border-[#5B8CFF] bg-white dark:bg-[#141414] p-10 text-center cursor-pointer transition-all duration-200 space-y-4 group hover:shadow-sm"
              >
                <div className="h-14 w-14 mx-auto rounded-full bg-black/[0.04] dark:bg-white/[0.04] group-hover:bg-[#2563EB]/10 dark:group-hover:bg-[#5B8CFF]/15 flex items-center justify-center text-[#888880] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-all duration-200">
                  <ImageIcon className="h-7 w-7 transition-transform group-hover:scale-110" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-medium text-[#181818] dark:text-[#F2F2F0]">
                    No target image loaded
                  </div>
                  <div className="text-xs text-[#999993] dark:text-[#6A6A6A]">
                    Click to choose a preset or upload an image
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-2 pointer-events-none">
                  Choose Image
                </Button>
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
