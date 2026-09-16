"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Binary, ChevronDown, ImageIcon, Layers, Maximize2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";
import { ChangeImageModal } from "@/components/upload/ChangeImageModal";
import { ImageInspectionModal } from "@/components/image/ImageInspectionModal";
import { cn } from "@/lib/utils/cn";
import {
  DoodleFrame,
  DoodleArrow,
  DoodleUnderline,
} from "@/components/image/DoodleAnnotations";

export default function Home() {
  const { activeArtifact, isMounted } = useWorkspace();
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [colorMode, setColorMode] = useState<"RGB" | "Grayscale">("RGB");
  const [displayUri, setDisplayUri] = useState<string>("");

  // Sync whether user has selected an image in this or previous session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cipherlens_user_has_selected");
      if (stored === "true") {
        setHasSelectedImage(true);
      }
    }
  }, []);

  // When activeArtifact changes away from default or is updated, mark user selected
  useEffect(() => {
    if (activeArtifact && activeArtifact.id !== "preset-target-cal512") {
      setHasSelectedImage(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("cipherlens_user_has_selected", "true");
      }
    }
  }, [activeArtifact]);

  // Dynamically determine whether the active image is RGB or Grayscale, and trim any artificial letterbox black borders
  useEffect(() => {
    if (!activeArtifact?.dataUri) {
      return;
    }

    const dataUri = activeArtifact.dataUri;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setDisplayUri(dataUri);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h).data;

        // 1. Color mode check
        let isGray = true;
        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          if (Math.abs(r - g) > 6 || Math.abs(g - b) > 6 || Math.abs(r - b) > 6) {
            isGray = false;
            break;
          }
        }
        setColorMode(isGray ? "Grayscale" : "RGB");

        // 2. Check for artificial solid black borders on edges (from previous crop math)
        let top = 0;
        let bottom = h - 1;
        let left = 0;
        let right = w - 1;

        const isRowBlack = (y: number) => {
          for (let x = 0; x < w; x += 4) {
            const idx = (y * w + x) * 4;
            if (imgData[idx] > 20 || imgData[idx + 1] > 20 || imgData[idx + 2] > 20) return false;
          }
          return true;
        };

        const isColBlack = (x: number) => {
          for (let y = 0; y < h; y += 4) {
            const idx = (y * w + x) * 4;
            if (imgData[idx] > 20 || imgData[idx + 1] > 20 || imgData[idx + 2] > 20) return false;
          }
          return true;
        };

        while (top < bottom && isRowBlack(top)) top++;
        while (bottom > top && isRowBlack(bottom)) bottom--;
        while (left < right && isColBlack(left)) left++;
        while (right > left && isColBlack(right)) right--;

        // If at least 10px solid black border was detected on all 4 sides, trim it cleanly
        if (top >= 10 && (h - 1 - bottom) >= 10 && left >= 10 && (w - 1 - right) >= 10) {
          const trimW = right - left + 1;
          const trimH = bottom - top + 1;
          const outCanvas = document.createElement("canvas");
          outCanvas.width = 512;
          outCanvas.height = 512;
          const outCtx = outCanvas.getContext("2d");
          if (outCtx) {
            outCtx.drawImage(canvas, left, top, trimW, trimH, 0, 0, 512, 512);
            setDisplayUri(outCanvas.toDataURL("image/png"));
            return;
          }
        }
        setDisplayUri(dataUri);
      } catch {
        setDisplayUri(dataUri);
        setColorMode("RGB");
      }
    };
    img.src = dataUri;
  }, [activeArtifact?.dataUri, activeArtifact?.metadata]);

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

      // Show down arrow whenever the page can be scrolled down and user is near the top
      const isScrollable = scrollHeight > clientHeight + 30;
      const isAtTop = scrollY < 60;

      setShowScrollButton(isScrollable && isAtTop);
    };

    const container = document.getElementById("main-scroll-container");
    if (container) {
      container.addEventListener("scroll", checkScroll, { passive: true });
    }
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    // Initial check immediately and after DOM paint
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
  }, [displayUri, activeArtifact]);

  const scrollToEnd = () => {
    const footer = document.getElementById("page-footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    } else {
      const container = document.getElementById("main-scroll-container");
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      } else {
        window.scrollTo({
          top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
          behavior: "smooth",
        });
      }
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
      name: "ENCRYPTION",
      desc: "Double Random Phase Encoding (DRPE), Fourier transform scrambling, DCT, and Arnold chaos",
      href: "/encryption/drpe",
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
    <>
      <div className="max-w-6xl py-6 sm:py-10 space-y-8 sm:space-y-10">
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
              <Button
                variant="primary"
                size="lg"
                className="px-5 py-2.5 text-base font-medium"
                onClick={() => setIsChangeModalOpen(true)}
              >
                <span>{hasSelectedImage ? "Change image" : "Start with an image"}</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Right Column: Research Notebook Annotation Layer with Hand-Drawn Frame */}
          <div className="lg:col-span-5 flex justify-center py-6 sm:py-8">
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="relative w-full max-w-[360px] select-none">
                {/* DOODLE ANNOTATION 1: Color Mode (Top Left) */}
                <div
                  className="absolute -top-12 -left-6 sm:-left-10 z-20 flex flex-col items-start"
                  style={{ transform: "rotate(-2deg)" }}
                >
                  <div className="relative inline-flex flex-col items-center">
                    <span
                      className={cn(
                        "font-doodle text-lg sm:text-xl font-bold tracking-wide leading-none",
                        colorMode === "Grayscale"
                          ? "text-[#181818] dark:text-[#F2F2F0]"
                          : "text-[#2563EB] dark:text-[#5B8CFF]"
                      )}
                    >
                      {colorMode}
                    </span>
                    <DoodleUnderline
                      className={cn(
                        "mt-0.5",
                        colorMode === "Grayscale"
                          ? "w-[calc(100%+8px)] text-[#7A7A75] dark:text-[#9A9A95]"
                          : "w-[calc(100%+8px)] text-[#2563EB]/70 dark:text-[#5B8CFF]/70"
                      )}
                    />
                  </div>
                  <DoodleArrow direction="top-left" className="-mt-1 ml-1 pointer-events-none" />
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

                {/* Hand-Drawn Frame Encasing Clean Realistic Image - Clicking opens large Inspection Modal */}
                <DoodleFrame
                  onClick={() => setIsInspectModalOpen(true)}
                  className="w-full aspect-square group cursor-pointer"
                >
                  <img
                    src={displayUri || activeArtifact.dataUri}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />

                  {/* Inspection Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1.5px]">
                    <div className="px-3.5 py-1.5 rounded-md bg-white/95 dark:bg-[#181818]/95 border border-black/10 dark:border-white/10 text-xs font-medium text-[#181818] dark:text-[#F2F2F0] shadow-xl flex items-center gap-1.5">
                      <Maximize2 className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
                      <span>Click to Inspect &amp; Zoom</span>
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
                    Click to select or upload an image target
                  </div>
                </div>
                <Button variant="outline" size="sm" className="pointer-events-none">
                  Choose Image
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Downward Scroll Arrow right above the experiments section */}
        <div
          className={cn(
            "flex flex-col items-center justify-center -my-2 sm:-my-3 transition-all duration-300 ease-out",
            showScrollButton
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          )}
        >
          <button
            onClick={scrollToEnd}
            aria-label="Scroll to end of website"
            title="Scroll to end of website"
            className="group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border border-[#D5D5CF] dark:border-[#333333] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:border-[#2563EB]/40 dark:hover:border-[#5B8CFF]/40 cursor-pointer animate-float-levitate transition-colors active:scale-95 shadow-sm"
          >
            <ChevronDown className="h-4.5 w-4.5 transition-transform group-hover:translate-y-0.5 text-[#555550] dark:text-[#A0A09B] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF]" />
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

      {/* Large Image Inspection Popup Window (Zoom, RAW, Heatmap, Invert) */}
      {activeArtifact && (
        <ImageInspectionModal
          isOpen={isInspectModalOpen}
          onClose={() => setIsInspectModalOpen(false)}
          imageSrc={displayUri || activeArtifact.dataUri}
          name={activeArtifact.name}
          width={activeArtifact.width}
          height={activeArtifact.height}
        />
      )}
    </>
  );
}
