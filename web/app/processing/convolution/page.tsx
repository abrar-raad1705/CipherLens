"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon as ArrowRight,
  CheckIcon as Check,
  PlayIcon as Play,
  ArrowPathIcon as RotateCcw,
  BookmarkIcon as Save,
  AdjustmentsHorizontalIcon as SlidersIcon,
  SunIcon as Sun,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { CustomKernelInput } from "@/components/processing/CustomKernelInput";
import { useWorkspace } from "@/hooks/use-image";
import { useProcessing } from "@/hooks/use-processing";
import { formatMs } from "@/lib/utils/format";

type FilterMode = "gaussian" | "median" | "sobel" | "custom";

// Base 3x3 Kernels for live modulation
const BASE_KERNELS: Record<string, number[][]> = {
  identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
  gaussian: [
    [0.0625, 0.125, 0.0625],
    [0.125, 0.25, 0.125],
    [0.0625, 0.125, 0.0625],
  ],
  sobel: [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ],
};

function ConvolutionBenchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const {
    loading,
    error,
    result,
    executeGaussian,
    executeMedian,
    executeSobel,
    executeConvolution,
  } = useProcessing();

  const urlMode = searchParams.get("mode") as FilterMode | null;
  const validModes: FilterMode[] = ["gaussian", "median", "sobel", "custom"];
  const [modeOverride, setModeOverride] = useState<FilterMode | null>(null);
  const mode: FilterMode =
    modeOverride ?? (urlMode && validModes.includes(urlMode) ? urlMode : "gaussian");
  const setMode = (m: FilterMode) => setModeOverride(m);

  const [kernelSize, setKernelSize] = useState<number>(5);
  const [sigma, setSigma] = useState<number>(1.5);
  const [customKernelStr, setCustomKernelStr] = useState<string>(
    "[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Brightness (-100 to 100) & Contrast (0.2 to 2.5) Sliders State
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.0);

  // Real-time client-side canvas render state
  const [liveCanvasResult, setLiveCanvasResult] = useState<string | null>(null);

  // Compute live modulated 3x3 kernel matrix from base kernel + contrast + brightness
  const getDynamicKernel = useCallback(() => {
    let base: number[][];
    if (mode === "gaussian") {
      base = BASE_KERNELS.gaussian;
    } else if (mode === "sobel") {
      base = BASE_KERNELS.sobel;
    } else if (mode === "custom") {
      try {
        const parsed = JSON.parse(customKernelStr);
        if (Array.isArray(parsed) && parsed.length === 3 && Array.isArray(parsed[0])) {
          base = parsed;
        } else {
          base = BASE_KERNELS.identity;
        }
      } catch {
        base = BASE_KERNELS.identity;
      }
    } else {
      base = BASE_KERNELS.identity;
    }

    const bOffset = brightness / 100;
    return base.map((row, r) =>
      row.map((val, c) => {
        const isCenter = r === 1 && c === 1;
        const scaled = val * contrast;
        const finalVal = isCenter ? scaled + bOffset : scaled;
        return Number(finalVal.toFixed(3));
      })
    );
  }, [mode, customKernelStr, brightness, contrast]);

  const dynamicKernel = getDynamicKernel();

  // Perform fast real-time HTML5 Canvas convolution whenever brightness/contrast/mode changes
  const updateRealtimeCanvas = useCallback(() => {
    if (!activeArtifact || !activeArtifact.dataUri) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeArtifact.dataUri;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const srcData = ctx.getImageData(0, 0, img.width, img.height);
      const dstData = ctx.createImageData(img.width, img.height);
      const src = srcData.data;
      const dst = dstData.data;

      const kernel = dynamicKernel;
      const kLen = kernel.length;
      const half = Math.floor(kLen / 2);
      const width = img.width;
      const height = img.height;

      // Brightness bias pixel offset
      const bPixelBias = brightness * 1.25;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0;

          for (let ky = 0; ky < kLen; ky++) {
            const iy = Math.min(Math.max(y + ky - half, 0), height - 1);
            for (let kx = 0; kx < kLen; kx++) {
              const ix = Math.min(Math.max(x + kx - half, 0), width - 1);
              const weight = kernel[ky][kx];
              const idx = (iy * width + ix) * 4;
              r += src[idx] * weight;
              g += src[idx + 1] * weight;
              b += src[idx + 2] * weight;
            }
          }

          const outIdx = (y * width + x) * 4;
          // Apply contrast curve and brightness bias
          const finalR = (r - 128) * contrast + 128 + bPixelBias;
          const finalG = (g - 128) * contrast + 128 + bPixelBias;
          const finalB = (b - 128) * contrast + 128 + bPixelBias;

          dst[outIdx] = Math.min(255, Math.max(0, finalR));
          dst[outIdx + 1] = Math.min(255, Math.max(0, finalG));
          dst[outIdx + 2] = Math.min(255, Math.max(0, finalB));
          dst[outIdx + 3] = 255;
        }
      }

      ctx.putImageData(dstData, 0, 0);
      setLiveCanvasResult(canvas.toDataURL("image/png"));
    };
  }, [activeArtifact, dynamicKernel, brightness, contrast]);

  // Re-run real-time render whenever sliders or image changes
  useEffect(() => {
    updateRealtimeCanvas();
  }, [updateRealtimeCanvas]);

  const handleApply = async () => {
    if (!activeArtifact) return;
    setSavedSuccess(false);

    try {
      if (mode === "gaussian") {
        await executeGaussian(activeArtifact.dataUri, kernelSize, sigma);
      } else if (mode === "median") {
        await executeMedian(activeArtifact.dataUri, kernelSize);
      } else if (mode === "sobel") {
        await executeSobel(activeArtifact.dataUri);
      } else if (mode === "custom") {
        await executeConvolution(activeArtifact.dataUri, dynamicKernel, false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveArtifact = (andNavigateToEncryption: boolean = false) => {
    const outputImg = liveCanvasResult || (result ? result.output_image : activeArtifact?.dataUri);
    if (!outputImg || !activeArtifact) return;

    addArtifact(
      {
        name: `${activeArtifact.name} [Brightness ${brightness > 0 ? `+${brightness}` : brightness} | Contrast ${contrast.toFixed(2)}x]`,
        dataUri: outputImg,
        width: activeArtifact.width,
        height: activeArtifact.height,
        sourceBench: "processing",
        metadata: {
          filter: mode,
          brightness,
          contrast,
          dynamic_kernel: dynamicKernel,
        },
      },
      false
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    if (andNavigateToEncryption) {
      router.push("/encryption");
    }
  };

  const resetSliders = () => {
    setBrightness(0);
    setContrast(1.0);
  };

  const methods: { id: FilterMode; label: string }[] = [
    { id: "gaussian", label: "Gaussian" },
    { id: "median", label: "Median" },
    { id: "sobel", label: "Sobel" },
    { id: "custom", label: "Custom 2D" },
  ];

  const currentOutputImage =
    liveCanvasResult || (result ? result.output_image : activeArtifact?.dataUri);

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            PROCESSING
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Spatial Image Processing
          </h1>
        </div>

        {currentOutputImage && activeArtifact && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveArtifact(false)}
            >
              {savedSuccess ? (
                <Check className="h-3.5 w-3.5 text-[#059669]" />
              ) : (
                <Save className="h-3.5 w-3.5 text-[#6F6F6A]" />
              )}
              <span>{savedSuccess ? "Saved" : "Save Artifact"}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveArtifact(true)}
            >
              <span>Promote to DRPE</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Operation Area: Left = Visualization Canvas, Right = User Inputs/Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Viewfield (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-3">
          {activeArtifact && activeArtifact.dataUri ? (
            <SplitCompareCanvas
              beforeSrc={activeArtifact.dataUri}
              afterSrc={currentOutputImage || activeArtifact.dataUri}
              beforeLabel="ORIGINAL"
              afterLabel={`PROCESSED [B:${brightness > 0 ? `+${brightness}` : brightness} C:${contrast.toFixed(2)}x]`}
            />
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-sm gap-3 p-6 text-center">
              <span className="font-medium text-[#181818] dark:text-[#F2F2F0]">
                No Target Selected
              </span>
              <p className="text-[#6F6F6A] dark:text-[#A0A09B] max-w-sm text-xs">
                Select an optical calibration preset or upload an image in Workspace to execute spatial operations.
              </p>
              {presets.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => loadPresetById(presets[0].id)}
                >
                  Load {presets[0].name}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: User Inputs & Controls Panel (4 cols on desktop) */}
        <Card className="lg:col-span-4 p-5 space-y-6">
          {/* Method Selector */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              FILTER METHOD
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-2 text-xs rounded transition-colors cursor-pointer border text-left ${
                    mode === m.id
                      ? "border-[#2563EB] text-[#2563EB] dark:border-[#5B8CFF] dark:text-[#5B8CFF] font-medium bg-[#2563EB]/5"
                      : "border-[#E8E8E3] dark:border-[#292929] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] bg-transparent"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Brightness & Contrast Bars */}
          <div className="space-y-4 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                <Sun className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
                <span>BRIGHTNESS &amp; CONTRAST</span>
              </div>
              {(brightness !== 0 || contrast !== 1.0) && (
                <button
                  type="button"
                  onClick={resetSliders}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#2563EB] dark:hover:text-[#5B8CFF] transition-colors cursor-pointer"
                  title="Reset Brightness & Contrast"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Brightness Slider */}
            <Slider
              label="Brightness Offset"
              hint="Shift DC luminance bias"
              valueDisplay={`${brightness > 0 ? `+${brightness}` : brightness}`}
              min={-100}
              max={100}
              step={1}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />

            {/* Contrast Slider */}
            <Slider
              label="Contrast Gain"
              hint="Multiply matrix weight scaling"
              valueDisplay={`${contrast.toFixed(2)}×`}
              min={0.2}
              max={2.5}
              step={0.05}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
            />

            {/* Live 3x3 Dynamic Kernel Matrix Visualizer */}
            <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#121212] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#999993] dark:text-[#6A6A6A]">
                <span>DYNAMIC 3×3 KERNEL</span>
                <span className="text-[#2563EB] dark:text-[#5B8CFF]">LIVE UPDATE</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {dynamicKernel.map((row, r) =>
                  row.map((cell, c) => {
                    const isCenter = r === 1 && c === 1;
                    return (
                      <div
                        key={`dyn-${r}-${c}`}
                        className={`text-center py-1.5 px-0.5 text-xs font-mono rounded border transition-all ${
                          isCenter
                            ? "bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 border-[#2563EB]/40 dark:border-[#5B8CFF]/40 text-[#2563EB] dark:text-[#5B8CFF] font-semibold shadow-2xs"
                            : "bg-white dark:bg-[#181818] border-[#E8E8E3] dark:border-[#2D2D2D] text-[#181818] dark:text-[#F2F2F0]"
                        }`}
                        title={`Row ${r + 1}, Col ${c + 1}${isCenter ? " (Center DC Weight)" : ""}`}
                      >
                        {cell > 0 ? `+${cell}` : cell}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Mode-Specific Parameters */}
          <div className="space-y-4 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                BASE OPERATOR
              </span>
              <Badge variant="signal">{mode}</Badge>
            </div>

            {(mode === "gaussian" || mode === "median") && (
              <Slider
                label="Kernel Size"
                hint="Odd matrix size"
                valueDisplay={`${kernelSize} × ${kernelSize}`}
                min={3}
                max={15}
                step={2}
                value={kernelSize}
                onChange={(e) => setKernelSize(Number(e.target.value))}
              />
            )}

            {mode === "gaussian" && (
              <Slider
                label="Gaussian Spread (σ)"
                hint="Standard deviation"
                valueDisplay={sigma.toFixed(1)}
                min={0.5}
                max={5.0}
                step={0.1}
                value={sigma}
                onChange={(e) => setSigma(Number(e.target.value))}
              />
            )}

            {mode === "custom" && (
              <CustomKernelInput
                kernelStr={customKernelStr}
                onChange={setCustomKernelStr}
              />
            )}
          </div>

          {error && (
            <div className="text-xs text-[#DC2626] font-mono py-1">
              Error: {error}
            </div>
          )}

          {/* Action Button & Telemetry */}
          <div className="pt-2 space-y-3">
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={loading || !activeArtifact}
              className="w-full h-9"
            >
              <Play className="h-3.5 w-3.5 fill-current mr-1" />
              <span>{loading ? "Computing via FastAPI..." : "Apply Server Filter"}</span>
            </Button>

            {result && (
              <div className="p-2.5 rounded border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B] space-y-1">
                <div className="flex justify-between">
                  <span>Operator:</span>
                  <span className="text-[#181818] dark:text-[#F2F2F0]">{result.filter}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className="text-[#181818] dark:text-[#F2F2F0]">{formatMs(result.latency_ms)}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ConvolutionBenchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading image processing bench...</div>}>
      <ConvolutionBenchContent />
    </Suspense>
  );
}
