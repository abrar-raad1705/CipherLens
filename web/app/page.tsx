"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();

  const experiments = [
    {
      step: "01",
      name: "CONVOLUTION",
      desc: "Spatial image processing",
      href: "/processing/convolution",
    },
    {
      step: "02",
      name: "ENCRYPTION",
      desc: "Transform-domain experimentation",
      href: "/encryption/drpe",
    },
    {
      step: "03",
      name: "ANALYSIS",
      desc: "Quantitative evaluation",
      href: "/analysis",
    },
  ];

  return (
    <div className="max-w-2xl py-8 sm:py-12 space-y-16">
      {/* Introductory Area */}
      <section className="space-y-6">
        <div className="space-y-1">
          <div className="text-[11px] font-mono tracking-widest text-[#999993] dark:text-[#6A6A6A] uppercase">
            BAT SIGNAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#181818] dark:text-[#F2F2F0]">
            Computational Imaging Laboratory
          </h1>
        </div>

        <p className="text-sm text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-lg">
          Explore image processing, encryption and quantitative analysis through an interactive optical simulation workbench.
        </p>

        <div>
          <Link href="/workspace">
            <Button variant="primary" size="md">
              <span>Start with an image</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Experiments Index */}
      <section className="space-y-4">
        <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
          EXPERIMENTS
        </div>

        <div className="border-t border-[#E8E8E3] dark:border-[#292929] divide-y divide-[#E8E8E3] dark:divide-[#292929]">
          {experiments.map((exp) => (
            <Link
              key={exp.step}
              href={exp.href}
              className="group flex items-baseline justify-between py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-sm transition-colors"
            >
              <div className="flex items-baseline gap-6 sm:gap-8">
                <span className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A]">
                  {exp.step}
                </span>
                <div>
                  <div className="text-sm font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                    {exp.name}
                  </div>
                  <div className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                    {exp.desc}
                  </div>
                </div>
              </div>

              <div className="text-xs text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Current Image (Only display if an image is already loaded) */}
      {isMounted && activeArtifact && activeArtifact.dataUri && (
        <section className="space-y-3 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
          <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            CURRENT TARGET
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeArtifact.dataUri}
                alt={activeArtifact.name}
                className="h-10 w-10 object-contain rounded border border-[#E8E8E3] dark:border-[#292929] shrink-0 bg-[#F4F4F1] dark:bg-[#1F1F1F]"
              />
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                  {activeArtifact.name}
                </div>
                <div className="font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                  {activeArtifact.width} × {activeArtifact.height} · {activeArtifact.sourceBench}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
