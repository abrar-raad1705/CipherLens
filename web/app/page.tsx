"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Binary, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();

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
    <div className="max-w-3xl py-8 sm:py-12 space-y-16">
      {/* Introductory Area */}
      <section className="space-y-6">
        <div className="space-y-1.5">
          <div className="text-xs font-mono tracking-widest text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CIPHERLENS
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-[#181818] dark:text-[#F2F2F0]">
            Computational Imaging Laboratory
          </h1>
        </div>

        <p className="text-base text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-xl">
          Explore 2D spatial filtering, 4f coherent optical wave encryption, and quantitative security cryptanalysis through an interactive scientific workbench.
        </p>

        <div>
          <Link href="/workspace">
            <Button variant="primary" size="md">
              <span>Start with an image</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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

      {/* Current Image (Only display if an image is already loaded) */}
      {isMounted && activeArtifact && activeArtifact.dataUri && (
        <section className="space-y-3 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CURRENT TARGET
          </div>

          <div className="flex items-center justify-between p-4 rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={activeArtifact.dataUri}
                alt={activeArtifact.name}
                className="h-12 w-12 object-contain rounded border border-[#E8E8E3] dark:border-[#292929] shrink-0 bg-[#F4F4F1] dark:bg-[#1F1F1F]"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                  {activeArtifact.name}
                </div>
                <div className="font-mono text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  {activeArtifact.width} × {activeArtifact.height} · {activeArtifact.sourceBench}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="/workspace">
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </Link>
              <Link href="/encryption/drpe">
                <Button variant="primary" size="sm">
                  Run DRPE
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
