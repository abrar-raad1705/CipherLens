"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
  ChartBarIcon as BarChart3,
  ChevronDownIcon as ChevronDown,
  Square3Stack3DIcon as Layers,
  ShieldCheckIcon as ShieldCheck,
} from "@heroicons/react/24/outline";
import { UniversityLogoHero } from "@/components/home/UniversityLogoHero";
import {
  DoodleArrow,
  DoodleUnderline,
} from "@/components/image/DoodleAnnotations";

export default function Home() {
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const container = document.getElementById("main-scroll-container");
      const scrollY = container
        ? container.scrollTop
        : window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = container
        ? container.scrollHeight
        : document.documentElement.scrollHeight;
      const clientHeight = container
        ? container.clientHeight
        : window.innerHeight;

      // Show down arrow whenever page is long and user is near the top
      const isScrollable = scrollHeight > clientHeight + 30;
      const isAtTop = scrollY < 50;

      setShowScrollButton(isScrollable && isAtTop);
    };

    const container = document.getElementById("main-scroll-container");
    if (container) {
      container.addEventListener("scroll", checkScroll, { passive: true });
    }
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    checkScroll();
    const timer1 = setTimeout(checkScroll, 100);
    const timer2 = setTimeout(checkScroll, 400);

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const scrollToEnd = () => {
    const section = document.getElementById("lab-experiments");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const experiments = [
    {
      step: "01",
      name: "IMAGE PROCESSING",
      desc: "Spatial 2D image filtering, Gaussian smoothing, median noise filtering, and Sobel edge gradients",
      href: "/processing/convolution",
      icon: Layers,
    },
    {
      step: "02",
      name: "ENCRYPTION & DECRYPTION",
      desc: "Double Random Phase Encoding (DRPE), Fourier phase scrambling, DCT permutation, and Arnold chaos",
      href: "/encryption",
      icon: ShieldCheck,
    },
    {
      step: "03",
      name: "ANALYSIS",
      desc: "Quantitative entropy, pixel correlation, NPCR, UACI differential analysis, MSE, PSNR, and SSIM metrics",
      href: "/analysis",
      icon: BarChart3,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Introductory Area: Hero + University Logo Optical Workbench Side-by-Side */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center pt-2 pb-4">
        {/* Left Column: Title & Mission */}
        <div className="lg:col-span-7 space-y-4">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-[#181818] dark:text-[#F2F2F0] leading-[1.16] pb-1">
            Computational Imaging Laboratory
          </h1>

          <p className="text-base text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-xl font-normal tracking-normal">
            Explore an extensive variety of 2D spatial image processing tools, visualize real-time spatial convolution, experiment with diverse optical encryption &amp; decryption methods, challenge security boundaries and visualize quantitative cryptanalysis.
          </p>
        </div>

        {/* Right Column: Interactive University Logo Display with Distant Side Doodle Annotations */}
        <div className="lg:col-span-5 flex justify-center py-6 sm:py-8">
          <div className="relative w-full max-w-[290px] sm:max-w-[300px] select-none">
            {/* DOODLE ANNOTATION 1: Top-Left (Team AC/DC) */}
            <div
              className="absolute -top-11 -left-14 sm:-left-20 z-20 flex flex-col items-start pointer-events-none"
              style={{ transform: "rotate(-4deg)" }}
            >
              <div className="relative inline-flex flex-col items-center">
                <span className="font-doodle text-base sm:text-lg font-bold tracking-wide text-[#181818] dark:text-[#F2F2F0] whitespace-nowrap">
                  Team AC/DC
                </span>
                <DoodleUnderline className="w-20 -mt-1 text-[#7A7A75] dark:text-[#9A9A95]" />
              </div>
              <DoodleArrow direction="top-left" className="-mt-1 ml-2 w-14 h-11" />
            </div>

            {/* DOODLE ANNOTATION 2: Top-Right (BUET) */}
            <div
              className="absolute -top-11 -right-12 sm:-right-16 z-20 flex flex-col items-end pointer-events-none"
              style={{ transform: "rotate(3deg)" }}
            >
              <div className="flex flex-col items-end">
                <span className="font-doodle text-base sm:text-lg font-bold tracking-wide text-[#181818] dark:text-[#F2F2F0]">
                  BUET
                </span>
                <DoodleUnderline className="w-16 -mt-1 text-[#7A7A75] dark:text-[#9A9A95]" />
              </div>
              <DoodleArrow direction="top-right" className="-mt-1 mr-2 w-14 h-11" />
            </div>

            {/* Main Interactive University Logo Hero Widget */}
            <UniversityLogoHero />

            {/* DOODLE ANNOTATION 3: Bottom-Center (Signals and Linear Systems - Larger Font Size) */}
            <div
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
              style={{ transform: "translateX(-50%) rotate(-1deg)" }}
            >
              <DoodleArrow direction="bottom-up" className="-mb-1 w-11 h-9" />
              <div className="flex flex-col items-center max-w-[320px]">
                <span className="font-doodle text-lg sm:text-xl font-bold tracking-wide text-[#181818] dark:text-[#F2F2F0] whitespace-nowrap">
                  Signals and Linear Systems
                </span>
                <DoodleUnderline className="w-44 -mt-1 text-[#7A7A75] dark:text-[#9A9A95]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Downward Floating Levitating Arrow Button */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <button
          onClick={scrollToEnd}
          aria-label="Scroll to experiments index"
          title="Scroll to experiments index"
          className="group relative flex items-center justify-center w-8.5 h-8.5 rounded-full bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border border-[#D5D5CF] dark:border-[#333333] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#2563EB] dark:hover:text-[#5B8CFF] hover:border-[#2563EB]/40 dark:hover:border-[#5B8CFF]/40 cursor-pointer animate-float-levitate transition-colors active:scale-95 shadow-sm"
        >
          <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5 text-[#555550] dark:text-[#A0A09B] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF]" />
        </button>
      </div>

      {/* Experiments Index */}
      <section id="lab-experiments" className="space-y-2 pt-2 scroll-mt-6">
        <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
          EXPERIMENTS INDEX
        </div>

        <div className="border-t border-[#E8E8E3] dark:border-[#292929] divide-y divide-[#E8E8E3] dark:divide-[#292929]">
          {experiments.map((exp) => {
            const Icon = exp.icon;
            return (
              <Link
                key={exp.step}
                href={exp.href}
                className="group flex items-baseline justify-between py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-3 px-3 rounded-md transition-colors"
              >
                <div className="flex items-baseline gap-5 sm:gap-7">
                  <span className="font-mono text-sm text-[#999993] dark:text-[#6A6A6A]">
                    {exp.step}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-base font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                      <Icon className="h-4 w-4 text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF]" />
                      <span>{exp.name}</span>
                    </div>
                    <div className="text-sm text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5 max-w-lg leading-relaxed">
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
  );
}
