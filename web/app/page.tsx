"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
  ChartBarIcon as BarChart3,
  Square3Stack3DIcon as Layers,
  ShieldCheckIcon as ShieldCheck,
} from "@heroicons/react/24/outline";
import { UniversityLogoHero } from "@/components/home/UniversityLogoHero";

export default function Home() {
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
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center pt-0">
        {/* Left Column: Title & Mission */}
        <div className="lg:col-span-7 space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] leading-[1.12]">
            Computational Imaging Laboratory
          </h1>

          <p className="text-base text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-xl font-normal">
            Explore 2D spatial filtering, 4f coherent optical wave encryption, and quantitative security cryptanalysis through an interactive scientific workbench.
          </p>
        </div>

        {/* Right Column: Interactive University Logo Optical Workbench Display */}
        <div className="lg:col-span-5 flex justify-center">
          <UniversityLogoHero />
        </div>
      </section>

      {/* Experiments Index */}
      <section id="lab-experiments" className="space-y-2 pt-1">
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
