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

            <div className="pt-2 flex items-center gap-4">
              <Link href="/workspace">
                <Button variant="primary" size="lg" className="px-5 py-2.5 text-base font-medium">
                  <span>Start with an image</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Clean Closed-Border Image Showcase with Floating Doodle Badges & Looping Sketched Arrows */}
          <div className="lg:col-span-6 flex justify-center py-6 sm:py-8">
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="relative w-full max-w-[370px] select-none">
                {/* FLOATING DOODLE BADGE 1: Dimensions (Top Right) with Loop Doodle Arrow */}
                <div className="absolute -top-14 -right-4 sm:-right-8 z-20 flex flex-col items-end pointer-events-none">
                  <div className="pointer-events-auto px-3.5 py-1 rounded-full text-base sm:text-lg font-doodle font-bold tracking-wide bg-white dark:bg-[#1A1A1A] text-[#181818] dark:text-[#F2F2F0] border border-[#D7D7D1] dark:border-[#383838] shadow-md transition-transform hover:scale-105">
                    {activeArtifact.width} × {activeArtifact.height} px
                  </div>
                  {/* Sketched Doodle Arrow with a graceful loop curving down into the top-right corner of the image */}
                  <svg
                    className="w-16 h-14 text-[#6F6F6A] dark:text-[#A0A09B] -mt-1 mr-3 overflow-visible pointer-events-none"
                    viewBox="0 0 60 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Looping curve: starts at badge tail, loops gracefully, points arrow at top-right corner */}
                    <path
                      d="M 45 4 C 40 16, 12 10, 20 25 C 24 33, 10 40, 4 44"
                    />
                    <polyline points="10 38 4 44 11 47" />
                  </svg>
                </div>

                {/* FLOATING DOODLE BADGE 2: Color Space (Top Left) with Loop Doodle Arrow */}
                <div className="absolute -top-14 -left-4 sm:-left-8 z-20 flex flex-col items-start pointer-events-none">
                  <div className="pointer-events-auto px-3.5 py-1 rounded-full text-base sm:text-lg font-doodle font-bold tracking-wide bg-white dark:bg-[#1A1A1A] text-[#181818] dark:text-[#F2F2F0] border border-[#D7D7D1] dark:border-[#383838] shadow-md transition-transform hover:scale-105">
                    RGB Color
                  </div>
                  {/* Sketched Doodle Arrow with a playful loop pointing down into top-left corner */}
                  <svg
                    className="w-16 h-14 text-[#6F6F6A] dark:text-[#A0A09B] -mt-1 ml-3 overflow-visible pointer-events-none"
                    viewBox="0 0 60 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Looping curve: starts at badge tail, loops gracefully, points arrow at top-left corner */}
                    <path
                      d="M 15 4 C 20 16, 48 10, 40 25 C 36 33, 50 40, 56 44"
                    />
                    <polyline points="50 38 56 44 49 47" />
                  </svg>
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

                {/* FLOATING DOODLE BADGE 3: Name & Origin (Bottom Centered) with Loop Doodle Arrow */}
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
                  {/* Sketched Doodle Arrow with a playful loop pointing UP into bottom center of frame */}
                  <svg
                    className="w-12 h-10 text-[#6F6F6A] dark:text-[#A0A09B] -mb-1 overflow-visible pointer-events-none"
                    viewBox="0 0 40 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M 20 38 C 14 26, 28 22, 22 14 C 20 10, 20 6, 20 2"
                    />
                    <polyline points="15 8 20 2 25 8" />
                  </svg>
                  <div
                    className="pointer-events-auto max-w-[280px] truncate px-4 py-1 rounded-full text-base sm:text-lg font-doodle font-bold tracking-wide bg-white dark:bg-[#1A1A1A] text-[#181818] dark:text-[#F2F2F0] border border-[#D7D7D1] dark:border-[#383838] shadow-md transition-transform hover:scale-105"
                    title={activeArtifact.name}
                  >
                    {activeArtifact.name}
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
