"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Binary, ChevronDown, ImageIcon, Layers, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";
import { ChangeImageModal } from "@/components/upload/ChangeImageModal";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);

  const scrollToExperiments = () => {
    const el = document.getElementById("lab-experiments");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
        {/* Introductory Area: Hero + Target Image Display Side-by-Side */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Title & Mission */}
          <div className="lg:col-span-6 space-y-6">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] leading-[1.12]">
              Computational Imaging Laboratory
            </h1>

            <p className="text-lg text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-2xl font-normal">
              Explore 2D spatial filtering, 4f coherent optical wave encryption, and quantitative security cryptanalysis through an interactive scientific workbench.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link href="/workspace">
                <Button variant="primary" size="lg" className="px-5 py-2.5 text-base font-medium">
                  <span>Start with an image</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>

              {/* Bumping Downward Arrow Button that pokes user to slide to lower half */}
              <button
                onClick={scrollToExperiments}
                className="group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] rounded-lg border border-[#E8E8E3] dark:border-[#2A2A2A] bg-white/80 dark:bg-[#161616]/80 backdrop-blur-xs hover:border-[#D0D0C8] dark:hover:border-[#3A3A3A] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                title="Slide to explore lab modules"
              >
                <span>Explore modules</span>
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#2563EB] dark:text-[#5B8CFF] group-hover:bg-[#2563EB] group-hover:text-white dark:group-hover:bg-[#5B8CFF] dark:group-hover:text-[#101010] transition-colors">
                  <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Clean Closed-Border Image Showcase with Floating Property Pills & Sketched Doodle Arrows */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="relative w-full max-w-[380px] p-4 sm:p-6 select-none">
                {/* Floating Property Pill 1: Dimensions (Top Right) */}
                <div className="absolute -top-3 right-0 sm:right-2 z-10 flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full text-xs font-mono font-medium tracking-tight bg-white dark:bg-[#1A1A1A] text-[#181818] dark:text-[#F2F2F0] border border-[#D7D7D1] dark:border-[#383838] shadow-md transition-transform hover:scale-105">
                    📐 {activeArtifact.width} × {activeArtifact.height} px
                  </div>
                  {/* Sketched Doodle Arrow pointing down-left to image corner */}
                  <svg
                    className="w-8 h-8 text-[#999993] dark:text-[#6A6A6A] -scale-x-100 transform -rotate-12 hidden sm:block"
                    viewBox="0 0 40 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 6 8 C 16 10, 24 20, 22 34" strokeDasharray="2 0" />
                    <polyline points="16 28 22 34 28 30" />
                  </svg>
                </div>

                {/* Floating Property Pill 2: Color Space / Mode (Top Left) */}
                <div className="absolute -top-3 left-0 sm:left-2 z-10 flex items-center gap-2">
                  {/* Sketched Doodle Arrow pointing down-right to image corner */}
                  <svg
                    className="w-8 h-8 text-[#999993] dark:text-[#6A6A6A] transform rotate-12 hidden sm:block"
                    viewBox="0 0 40 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 8 8 C 18 10, 26 20, 24 34" strokeDasharray="2 0" />
                    <polyline points="18 28 24 34 30 30" />
                  </svg>
                  <div className="px-3 py-1 rounded-full text-xs font-mono font-medium tracking-tight bg-white dark:bg-[#1A1A1A] text-[#181818] dark:text-[#F2F2F0] border border-[#D7D7D1] dark:border-[#383838] shadow-md transition-transform hover:scale-105">
                    🎨 RGB Color
                  </div>
                </div>

                {/* The Closed Border Image Frame */}
                <div
                  onClick={() => setIsChangeModalOpen(true)}
                  className="group relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#181818] dark:border-[#F2F2F0] bg-[#0c0c0c] flex items-center justify-center checkerboard-pattern shadow-xl cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-[1.01]"
                  title="Click to change target image"
                >
                  <img
                    src={activeArtifact.dataUri}
                    alt={activeArtifact.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Interactive Hover Overlay with Change Prompt */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                    <div className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#181818] text-[#181818] dark:text-[#F2F2F0] font-medium text-xs shadow-xl flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <RefreshCw className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
                      <span>Click to Change</span>
                    </div>
                  </div>
                </div>

                {/* Floating Property Pill 3: Name & Origin (Bottom Centered) */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
                  {/* Sketched Doodle Arrow pointing up to image bottom */}
                  <svg
                    className="w-6 h-6 text-[#999993] dark:text-[#6A6A6A] -rotate-90 hidden sm:block"
                    viewBox="0 0 30 30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 6 15 C 14 14, 20 15, 26 15" strokeDasharray="2 0" />
                    <polyline points="20 9 26 15 20 21" />
                  </svg>
                  <div
                    className="max-w-[260px] truncate px-3.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-[#1A1A1A] text-[#181818] dark:text-[#F2F2F0] border border-[#D7D7D1] dark:border-[#383838] shadow-md transition-transform hover:scale-105"
                    title={activeArtifact.name}
                  >
                    🏷️ {activeArtifact.name}
                  </div>
                </div>
              </div>
            ) : isMounted ? (
              <div
                onClick={() => setIsChangeModalOpen(true)}
                className="w-full max-w-[340px] aspect-square rounded-2xl border-2 border-dashed border-[#D7D7D1] dark:border-[#333333] hover:border-[#2563EB] dark:hover:border-[#5B8CFF] bg-white dark:bg-[#141414] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 space-y-4 group shadow-xs hover:shadow-md"
              >
                <div className="h-14 w-14 rounded-full bg-black/[0.04] dark:bg-white/[0.04] group-hover:bg-[#2563EB]/10 dark:group-hover:bg-[#5B8CFF]/15 flex items-center justify-center text-[#888880] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-all duration-200">
                  <ImageIcon className="h-7 w-7 transition-transform group-hover:scale-110" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-medium text-[#181818] dark:text-[#F2F2F0]">
                    Select Target Image
                  </div>
                  <div className="text-xs text-[#999993] dark:text-[#6A6A6A]">
                    Click to choose a preset or upload an image
                  </div>
                </div>
                <Button variant="outline" size="sm" className="pointer-events-none">
                  Choose Image
                </Button>
              </div>
            ) : null}
          </div>
        </section>

      {/* Experiments Index */}
      <section id="lab-experiments" className="space-y-4 scroll-mt-20">
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
