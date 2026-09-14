"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Layers,
  Play,
  Save,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { useWorkspace } from "@/hooks/use-image";
import { useProcessing } from "@/hooks/use-processing";
import { formatMs } from "@/lib/utils/format";

type FilterMode = "gaussian" | "median" | "sobel" | "custom" | "deconvolution";

export default function ConvolutionBenchPage() {
  const router = useRouter();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const {
    loading,
    error,
    result,
    executeGaussian,
    executeMedian,
    executeSobel,
    executeConvolution,
    executeDeconvolution,
  } = useProcessing();

  const [mode, setMode] = useState<FilterMode>("gaussian");
  const [kernelSize, setKernelSize] = useState<number>(5);
  const [sigma, setSigma] = useState<number>(1.5);
  const [deconvK, setDeconvK] = useState<number>(0.01);
  const [customKernelStr, setCustomKernelStr] = useState<string>(
    "[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const filterConfigs: Record<
    FilterMode,
    { title: string; subtitle: string; hint: string }
  > = {
    gaussian: {
      title: "Gaussian Blur",
      subtitle: "2D Isotropic Low-Pass Smoothing",
      hint: "Attenuates high-frequency spatial noise with parameterized Gaussian standard deviation (σ).",
    },
    median: {
      title: "Median Rank Filter",
      subtitle: "Non-Linear Impulse Denoising",
      hint: "Replaces each center pixel with local neighborhood median to eliminate salt-and-pepper noise without edge blur.",
    },
    sobel: {
      title: "Sobel Gradient Operator",
      subtitle: "First-Order Directional Edge Detection",
      hint: "Computes spatial gradient vectors Gx & Gy to highlight structural boundaries and optical fringes.",
    },
    custom: {
      title: "Custom 2D Convolution Matrix",
      subtitle: "Arbitrary Spatial Kernel",
      hint: "Executes discrete 2D spatial convolution with custom user-defined coefficients.",
    },
    deconvolution: {
      title: "Wiener Inverse Deconvolution",
      subtitle: "Optimal Linear Restoration",
      hint: "Recovers degraded imagery by minimizing mean-square error using frequency-domain Wiener filter with noise parameter K.",
    },
  };

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
        const parsed = JSON.parse(customKernelStr);
        await executeConvolution(activeArtifact.dataUri, parsed, false);
      } else if (mode === "deconvolution") {
        await executeDeconvolution(activeArtifact.dataUri, "GAUSSIAN", kernelSize, sigma, deconvK);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1-click recipes for quick interaction
  const applyQuickPreset = async (type: "sobel" | "soft_blur" | "sharpen" | "heavy_denoise") => {
    if (!activeArtifact) return;
    setSavedSuccess(false);

    if (type === "sobel") {
      setMode("sobel");
      await executeSobel(activeArtifact.dataUri);
    } else if (type === "soft_blur") {
      setMode("gaussian");
      setKernelSize(7);
      setSigma(2.0);
      await executeGaussian(activeArtifact.dataUri, 7, 2.0);
    } else if (type === "sharpen") {
      setMode("custom");
      const sharpenKernel = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
      setCustomKernelStr(JSON.stringify(sharpenKernel));
      await executeConvolution(activeArtifact.dataUri, sharpenKernel, false);
    } else if (type === "heavy_denoise") {
      setMode("median");
      setKernelSize(5);
      await executeMedian(activeArtifact.dataUri, 5);
    }
  };

  const handleSaveArtifact = (andNavigateToEncryption: boolean = false) => {
    if (!result || !activeArtifact) return;
    addArtifact({
      name: `${activeArtifact.name} [${result.filter}]`,
      dataUri: result.output_image,
      width: activeArtifact.width,
      height: activeArtifact.height,
      sourceBench: "processing",
      metadata: result.metadata,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    if (andNavigateToEncryption) {
      router.push("/encryption/drpe");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Bench Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#EDEDEB] dark:border-[#2E2E2E] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan">BENCH 02</Badge>
            <span className="text-xs text-[#787774] dark:text-[#9B9B9B]">
              SPATIAL FILTERING &amp; RESTORATION
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E5E3] mt-1">
            2D Convolution &amp; Wiener Deconvolution
          </h1>
          <p className="text-xs text-[#787774] dark:text-[#9B9B9B] mt-0.5">
            Apply 2D spatial convolution kernels, gradient edge detection, and Wiener deconvolution restoration to optical imagery.
          </p>
        </div>

        {result && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSaveArtifact(false)}
            >
              {savedSuccess ? (
                <Check className="h-3.5 w-3.5 text-[#0F7B6C] dark:text-[#4DAB9A]" />
              ) : (
                <Save className="h-3.5 w-3.5 text-[#787774] dark:text-[#9B9B9B]" />
              )}
              <span>{savedSuccess ? "Saved!" : "Save Artifact"}</span>
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

      {/* Quick Interactive Recipes Banner */}
      <div className="p-3 rounded-lg bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#37352F] dark:text-[#E6E5E3]">
          <Sparkles className="h-4 w-4 text-[#D9730D] dark:text-[#FFAB5E]" />
          <span className="font-medium">Quick Recipes:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyQuickPreset("sobel")}
            disabled={loading || !activeArtifact}
            className="px-2.5 py-1 rounded bg-white dark:bg-[#2A2A2A] hover:bg-[#EFEFED] dark:hover:bg-[#333333] border border-[#EDEDEB] dark:border-[#383838] text-xs text-[#37352F] dark:text-[#E6E5E3] transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            Sobel Edges
          </button>
          <button
            onClick={() => applyQuickPreset("sharpen")}
            disabled={loading || !activeArtifact}
            className="px-2.5 py-1 rounded bg-white dark:bg-[#2A2A2A] hover:bg-[#EFEFED] dark:hover:bg-[#333333] border border-[#EDEDEB] dark:border-[#383838] text-xs text-[#37352F] dark:text-[#E6E5E3] transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            Detail Sharpen
          </button>
          <button
            onClick={() => applyQuickPreset("soft_blur")}
            disabled={loading || !activeArtifact}
            className="px-2.5 py-1 rounded bg-white dark:bg-[#2A2A2A] hover:bg-[#EFEFED] dark:hover:bg-[#333333] border border-[#EDEDEB] dark:border-[#383838] text-xs text-[#37352F] dark:text-[#E6E5E3] transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            Gaussian Soften
          </button>
          <button
            onClick={() => applyQuickPreset("heavy_denoise")}
            disabled={loading || !activeArtifact}
            className="px-2.5 py-1 rounded bg-white dark:bg-[#2A2A2A] hover:bg-[#EFEFED] dark:hover:bg-[#333333] border border-[#EDEDEB] dark:border-[#383838] text-xs text-[#37352F] dark:text-[#E6E5E3] transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
          >
            Median Denoise
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filter Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Sliders className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                <span>Spatial Filter Operator</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter selection buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "gaussian", label: "Gaussian Blur" },
                  { id: "median", label: "Median Rank" },
                  { id: "sobel", label: "Sobel Edge" },
                  { id: "custom", label: "Custom 2D" },
                  { id: "deconvolution", label: "Wiener Deconv" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as FilterMode)}
                    className={`px-2.5 py-1.5 text-xs rounded-md text-left transition-colors border cursor-pointer ${
                      mode === m.id
                        ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-white border-[#D3D1CB] dark:border-[#3E3E3E] font-medium"
                        : "bg-white dark:bg-[#222222] text-[#787774] dark:text-[#9B9B9B] border-[#EDEDEB] dark:border-[#2E2E2E] hover:bg-[#F7F6F5] dark:hover:bg-[#282828]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Filter explanation */}
              <div className="p-3 rounded-md bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] space-y-0.5">
                <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
                  {filterConfigs[mode].title}
                </div>
                <div className="text-[11px] text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                  {filterConfigs[mode].hint}
                </div>
              </div>

              {/* Mode-specific parameter controls */}
              <div className="space-y-3 pt-1">
                {(mode === "gaussian" || mode === "median" || mode === "deconvolution") && (
                  <Slider
                    label="Kernel Dimension"
                    hint="Must be odd"
                    valueDisplay={`${kernelSize}×${kernelSize} px`}
                    min={3}
                    max={15}
                    step={2}
                    value={kernelSize}
                    onChange={(e) => setKernelSize(Number(e.target.value))}
                  />
                )}

                {(mode === "gaussian" || mode === "deconvolution") && (
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

                {mode === "deconvolution" && (
                  <Slider
                    label="Wiener Regularization (K)"
                    hint="Inverse SNR"
                    valueDisplay={deconvK.toFixed(3)}
                    min={0.001}
                    max={0.1}
                    step={0.005}
                    value={deconvK}
                    onChange={(e) => setDeconvK(Number(e.target.value))}
                  />
                )}

                {mode === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#787774] dark:text-[#9B9B9B] font-medium">
                      2D Convolution Matrix (JSON format)
                    </label>
                    <textarea
                      value={customKernelStr}
                      onChange={(e) => setCustomKernelStr(e.target.value)}
                      rows={3}
                      className="w-full bg-[#F7F6F5] dark:bg-[#1C1C1C] border border-[#EDEDEB] dark:border-[#333333] text-[#37352F] dark:text-[#E6E5E3] font-mono text-xs p-2 rounded-md outline-none focus:border-[#2383E2]"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2"
                        onClick={() =>
                          setCustomKernelStr("[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]")
                        }
                      >
                        Sharpen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2"
                        onClick={() =>
                          setCustomKernelStr("[[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]")
                        }
                      >
                        Laplacian
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2"
                        onClick={() =>
                          setCustomKernelStr("[[-2, -1, 0], [-1, 1, 1], [0, 1, 2]]")
                        }
                      >
                        Emboss
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2.5 rounded-md bg-[#FFE2DD] dark:bg-[#522525] text-[#5D1715] dark:text-[#FF7369] text-xs">
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleApply}
                disabled={loading || !activeArtifact}
                className="w-full h-9"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{loading ? "Computing via FastAPI..." : "Execute Filter"}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Execution Telemetry Readout */}
          {result && (
            <Card className="text-xs">
              <CardHeader className="py-2">
                <CardTitle className="text-xs text-[#787774] dark:text-[#9B9B9B]">
                  <span>Execution Telemetry</span>
                </CardTitle>
                <span className="text-[10px] text-[#0F7B6C] dark:text-[#4DAB9A] font-medium">
                  Done
                </span>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-[#787774] dark:text-[#9B9B9B] p-3">
                <div className="flex justify-between">
                  <span>Operator:</span>
                  <span className="text-[#37352F] dark:text-[#E6E5E3] font-medium">{result.filter}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className="text-[#37352F] dark:text-[#E6E5E3] font-mono">{formatMs(result.latency_ms)}</span>
                </div>
                {result.metadata &&
                  Object.entries(result.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px]">
                      <span className="capitalize">{k.replace("_", " ")}:</span>
                      <span className="text-[#37352F] dark:text-[#E6E5E3] font-mono">{String(v)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Split Comparison Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeArtifact ? (
            <div className="space-y-2">
              <SplitCompareCanvas
                beforeSrc={activeArtifact.dataUri}
                afterSrc={result ? result.output_image : activeArtifact.dataUri}
                beforeLabel="Input Target"
                afterLabel={result ? result.filter : "Awaiting Execution"}
              />
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center rounded-lg bg-[#FAFAF9] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] text-xs gap-3 p-6 text-center">
              <div className="p-3 rounded-full bg-white dark:bg-[#282828] border border-[#EDEDEB] dark:border-[#383838]">
                <Layers className="h-5 w-5 text-[#787774] dark:text-[#9B9B9B]" />
              </div>
              <span className="font-semibold text-[#37352F] dark:text-[#E6E5E3]">
                No Target Selected
              </span>
              <p className="max-w-sm text-[#787774] dark:text-[#9B9B9B]">
                Select a benchmark preset to test spatial operators on a calibration target.
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
      </div>
    </div>
  );
}
