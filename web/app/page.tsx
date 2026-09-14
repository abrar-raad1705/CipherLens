"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Binary, ChevronDown, ImageIcon, Layers, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";
import { ChangeImageModal } from "@/components/upload/ChangeImageModal";
import { cn } from "@/lib/utils/cn";
import {
  DoodleFrame,
  DoodleArrow,
  DoodleUnderline,
} from "@/components/image/DoodleAnnotations";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      // Only show when the page is scrollable and user is at the top of the website
      const isScrollable = scrollHeight > clientHeight + 40;
      const isAtTop = scrollY < 40;

      setShowScrollButton(isScrollable && isAtTop);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const scrollToEnd = () => {
    const footer = document.getElementById("page-footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({
        top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
        behavior: "smooth",
      });
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

          {/* Right Column: Research Notebook Annotation Layer with Hand-Drawn Frame */}
          <div className="lg:col-span-5 flex justify-center py-8 sm:py-10">
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="relative w-full max-w-[360px] select-none">
                {/* DOODLE ANNOTATION 1: Color Mode (Top Left) */}
                <div
                  className="absolute -top-12 -left-6 sm:-left-10 z-20 flex flex-col items-start"
                  style={{ transform: "rotate(-2deg)" }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-doodle text-lg sm:text-xl font-bold tracking-wide text-[#2563EB] dark:text-[#5B8CFF]">
                      RGB Color
                    </span>
                    <DoodleUnderline className="w-20 -mt-1 text-[#2563EB]/70 dark:text-[#5B8CFF]/70" />
                  </div>
                  <DoodleArrow direction="top-left" className="-mt-1 ml-2 pointer-events-none" />
                </div>

                {/* DOODLE ANNOTATION 2: Dimensions (Top Right) */}
                <div
                  className="absolute -top-12 -right-6 sm:-right-10 z-20 flex flex-col items-end"
                  style={{ transform: "rotate(1.5deg)" }}
                >
                  <div className="flex flex-col items-end">
                    <span className="font-doodle text-lg sm:text-xl font-bold tracking-wide text-[#181818] dark:text-[#F2F2F0]">
                      {activeArtifact.width} × {activeArtifact.height} px
                    </span>
                    <DoodleUnderline className="w-24 -mt-1 text-[#7A7A75] dark:text-[#9A9A95]" />
                  </div>
                  <DoodleArrow direction="top-right" className="-mt-1 mr-2 pointer-events-none" />
                </div>

                {/* Hand-Drawn Frame Encasing Clean Realistic Image */}
                <DoodleFrame
                  onClick={() => setIsChangeModalOpen(true)}
                  title="Click image to change or crop"
                  className="w-full aspect-square group cursor-pointer"
                >
                  <img
                    src={activeArtifact.dataUri}
                    alt={activeArtifact.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />

                  {/* Subtle Research Annotation Hover Prompt */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1.5px]">
                    <div className="px-3.5 py-1.5 rounded-md bg-white/95 dark:bg-[#181818]/95 border border-black/10 dark:border-white/10 text-xs font-medium text-[#181818] dark:text-[#F2F2F0] shadow-xl flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 text-[#2563EB] dark:text-[#5B8CFF]" />
                      <span>Click to Change</span>
                    </div>
                  </div>
                </DoodleFrame>

                {/* DOODLE ANNOTATION 3: Image Name & Origin (Bottom Center) */}
                <div
                  className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
                  style={{ transform: "translateX(-50%) rotate(-1deg)" }}
                >
                  <DoodleArrow direction="bottom-up" className="-mb-1 pointer-events-none" />
                  <div className="flex flex-col items-center max-w-[280px]">
                    <span
                      className="font-doodle text-lg sm:text-xl font-bold tracking-wide text-[#181818] dark:text-[#F2F2F0] truncate max-w-full"
                      title={activeArtifact.name}
                    >
                      {activeArtifact.name}
                    </span>
                    <DoodleUnderline className="w-28 -mt-1 text-[#7A7A75] dark:text-[#9A9A95]" />
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

      {/* Downward Scroll Arrow in the middle down side (visible only when at top of website) */}
      <div
        className={cn(
          "fixed bottom-7 left-1/2 -translate-x-1/2 md:left-[calc(50%+115px)] z-30 transition-all duration-300 ease-out",
          showScrollButton
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        )}
      >
        <button
          onClick={scrollToEnd}
          aria-label="Scroll to end of website"
          title="Scroll to end of website"
          className="group flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/85 dark:bg-[#161616]/85 backdrop-blur-md border border-[#E0E0DA] dark:border-[#2A2A2A] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:border-[#C0C0B8] dark:hover:border-[#3E3E3E] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all cursor-pointer animate-gentle-bob active:scale-95"
        >
          <ChevronDown className="h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform group-hover:translate-y-0.5 text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF]" />
        </button>
      </div>

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
