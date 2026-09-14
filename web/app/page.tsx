"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Compass,
  Database,
  Layers,
  Lightbulb,
  Play,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/use-image";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();

  const benches = [
    {
      step: "01",
      title: "Workspace & Targets",
      href: "/workspace",
      icon: Database,
      badge: "BENCH 01",
      badgeVariant: "default" as const,
      tagline: "Calibration Imagery & Pipeline Artifacts",
      description:
        "Upload custom imagery or load synthetic optical calibration targets. Manage intermediate computational artifacts across all research benches.",
      features: ["Drag & Drop Upload", "Synthetic Zone Plates", "Resolution Test Targets"],
    },
    {
      step: "02",
      title: "Spatial Filtering Lab",
      href: "/processing/convolution",
      icon: Layers,
      badge: "BENCH 02",
      badgeVariant: "cyan" as const,
      tagline: "Convolutions, Gradients & Wiener Deblur",
      description:
        "Execute 2D spatial convolutions, Gaussian blurring, Median noise rejection, Sobel edge gradients, and Wiener deconvolution restoration.",
      features: ["Split Comparison Canvas", "Difference Heatmaps", "Custom 2D Matrix Kernels"],
    },
    {
      step: "03",
      title: "Optical Cryptosystems",
      href: "/encryption/drpe",
      icon: ShieldCheck,
      badge: "BENCH 03",
      badgeVariant: "signal" as const,
      tagline: "4f Double Random Phase Encoding",
      description:
        "Simulate coherent 4f optical systems. Modulate light wavefronts with dual random phase masks in spatial and Fourier frequency domains.",
      features: ["Interactive 4f Optical Bench", "Key Sensitivity Cracking Demo", "Arnold & DCT Chaos"],
    },
    {
      step: "04",
      title: "Quantitative Cryptanalysis",
      href: "/analysis",
      icon: Activity,
      badge: "BENCH 04",
      badgeVariant: "emerald" as const,
      tagline: "Entropy, Correlation & Differential Attacks",
      description:
        "Quantify Shannon information entropy, adjacent pixel correlation distributions, differential attack resistance (NPCR/UACI), and SSIM fidelity.",
      features: ["256-Bin Histograms", "Neighbor Pixel Scatter Clouds", "Security Health Score"],
    },
  ];

  return (
    <div className="space-y-8 py-2 max-w-5xl mx-auto">
      {/* Notion Page Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F7F6F5] dark:bg-[#252525] border border-[#EDEDEB] dark:border-[#333333] text-[#37352F] dark:text-[#E6E5E3]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#787774] dark:text-[#9B9B9B]">
                LABORATORY / OVERVIEW
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E5E3]">
              2D Signal Processing &amp; Optical DRPE
            </h1>
          </div>
        </div>

        {/* Notion Callout Box */}
        <div className="notion-callout">
          <Lightbulb className="h-4 w-4 text-[#D9730D] dark:text-[#FFAB5E] flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#37352F] dark:text-[#E6E5E3] leading-relaxed">
            Welcome to the <strong>CipherLens Optical Laboratory</strong>. This platform pairs high-performance
            Python computational imaging algorithms with an interactive visual workbench.
            Simulate coherent 4f Fourier optics at the speed of light, test single-key perturbation sensitivity,
            and quantify security metrics without visual clutter.
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href="/encryption/drpe">
            <Button variant="primary" size="md">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Launch 4f DRPE Bench</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/processing/convolution">
            <Button variant="secondary" size="md">
              <Layers className="h-3.5 w-3.5 text-[#2383E2]" />
              <span>Spatial Filtering</span>
            </Button>
          </Link>
          <Link href="/workspace">
            <Button variant="outline" size="md">
              <Database className="h-3.5 w-3.5" />
              <span>Workspace &amp; Targets</span>
            </Button>
          </Link>

          {/* Active Target indicator */}
          {isMounted && activeArtifact && (
            <div className="ml-auto hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] text-xs text-[#787774] dark:text-[#9B9B9B]">
              <span>Active Target:</span>
              <span className="font-medium text-[#37352F] dark:text-[#E6E5E3]">
                {activeArtifact.name}
              </span>
              <span className="text-[10px] font-mono">
                ({activeArtifact.width}×{activeArtifact.height})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notion Workflow Stepper / Pipeline */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase tracking-wider">
          Laboratory Workflow Pipeline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              step: "01",
              title: "Ingestion & Target",
              desc: "Select benchmark calibration standard or upload image",
              href: "/workspace",
            },
            {
              step: "02",
              title: "Spatial Filtering",
              desc: "Convolutions, Gaussian blur, Sobel edge & Wiener deblur",
              href: "/processing/convolution",
            },
            {
              step: "03",
              title: "4f DRPE Encryption",
              desc: "Coherent Fourier optical phase scrambling simulation",
              href: "/encryption/drpe",
            },
            {
              step: "04",
              title: "Quantitative Analysis",
              desc: "Shannon entropy, NPCR, and adjacent pixel correlation",
              href: "/analysis",
            },
          ].map((stage) => (
            <Link key={stage.step} href={stage.href} className="group">
              <div className="h-full p-3.5 rounded-lg bg-white dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] hover:border-[#D3D1CB] dark:hover:border-[#3E3E3E] transition-all flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#9B9A97] dark:text-[#787774] mb-1">
                    <span>STAGE {stage.step}</span>
                    <ChevronRight className="h-3 w-3 text-[#9B9A97] group-hover:translate-x-0.5 group-hover:text-[#37352F] dark:group-hover:text-white transition-transform" />
                  </div>
                  <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3] group-hover:text-[#2383E2] transition-colors">
                    {stage.title}
                  </div>
                  <p className="text-[11px] text-[#787774] dark:text-[#9B9B9B] mt-1 line-clamp-2">
                    {stage.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Notion Database / Gallery of Benches */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase tracking-wider">
          Laboratory Research Benches
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benches.map((b) => {
            const Icon = b.icon;
            return (
              <Link key={b.title} href={b.href} className="group flex">
                <Card className="flex-1 flex flex-col justify-between">
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-md bg-[#F7F6F5] dark:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#333333] text-[#37352F] dark:text-[#E6E5E3]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[#37352F] dark:text-[#E6E5E3] group-hover:text-[#2383E2] transition-colors">
                              {b.title}
                            </div>
                            <div className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
                              {b.tagline}
                            </div>
                          </div>
                        </div>
                        <Badge variant={b.badgeVariant}>{b.badge}</Badge>
                      </div>

                      <p className="text-xs text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                        {b.description}
                      </p>

                      {/* Feature Tags (Notion pastel pills) */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {b.features.map((f) => (
                          <span
                            key={f}
                            className="text-[11px] px-2 py-0.5 rounded bg-[#F7F6F5] dark:bg-[#2A2A2A] text-[#787774] dark:text-[#9B9B9B] border border-[#EDEDEB] dark:border-[#333333]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#EDEDEB] dark:border-[#2E2E2E] text-xs font-medium text-[#37352F] dark:text-[#E6E5E3] group-hover:text-[#2383E2] transition-colors">
                      <span>Open Research Bench</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Notion Architectural Callout / Explanation */}
      <div className="p-4 rounded-lg bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
            How Coherent 4f Optical Encryption Works
          </div>
          <p className="text-xs text-[#787774] dark:text-[#9B9B9B] max-w-2xl leading-relaxed">
            Optical encryption uses lenses to compute continuous 2D Fourier transforms at the speed of light.
            By modulating light with dual random phase masks in both spatial and spatial-frequency domains,
            an image is converted into stationary complex white noise that is irrecoverable without the exact phase keys.
          </p>
        </div>
        <Link href="/encryption/drpe" className="flex-shrink-0">
          <Button variant="secondary" size="sm">
            <span>Explore Bench</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
