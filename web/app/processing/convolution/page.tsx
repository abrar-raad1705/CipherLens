"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { useWorkspace } from "@/hooks/use-image";
import { useProcessing } from "@/hooks/use-processing";
import { formatMs } from "@/lib/utils/format";

type FilterMode = "gaussian" | "median" | "sobel" | "custom" | "deconvolution";

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
    executeDeconvolution,
  } = useProcessing();

  const urlMode = searchParams.get("mode") as FilterMode | null;
  const validModes: FilterMode[] = ["gaussian", "median", "sobel", "custom", "deconvolution"];
  const [modeOverride, setModeOverride] = useState<FilterMode | null>(null);
  const mode: FilterMode =
    modeOverride ?? (urlMode && validModes.includes(urlMode) ? urlMode : "gaussian");
  const setMode = (m: FilterMode) => setModeOverride(m);

  const [kernelSize, setKernelSize] = useState<number>(5);
  const [sigma, setSigma] = useState<number>(1.5);
  const [deconvK, setDeconvK] = useState<number>(0.01);
  const [customKernelStr, setCustomKernelStr] = useState<string>(
    "[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const methods: { id: FilterMode; label: string }[] = [
    { id: "gaussian", label: "Gaussian" },
    { id: "median", label: "Median" },
    { id: "sobel", label: "Sobel" },
    { id: "custom", label: "Custom 2D" },
    { id: "deconvolution", label: "Deconvolution" },
  ];

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            PROCESSING
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            2D Convolution &amp; Spatial Filtering
          </h1>
        </div>

        {result && (
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
              afterSrc={result ? result.output_image : activeArtifact.dataUri}
              beforeLabel="ORIGINAL"
              afterLabel={result ? result.filter.toUpperCase() : "RESULT"}
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
        <div className="lg:col-span-4 border border-[#E8E8E3] dark:border-[#292929] rounded-md bg-white dark:bg-[#171717] p-5 space-y-6">
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

          {/* Mode-Specific Parameter Sliders */}
          <div className="space-y-4 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              {mode.toUpperCase()} PARAMETERS
            </div>

            {(mode === "gaussian" || mode === "median" || mode === "deconvolution") && (
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
                hint="Noise-to-signal ratio"
                valueDisplay={deconvK.toFixed(3)}
                min={0.001}
                max={0.1}
                step={0.005}
                value={deconvK}
                onChange={(e) => setDeconvK(Number(e.target.value))}
              />
            )}

            {mode === "custom" && (
              <div className="space-y-2">
                <div className="text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                  2D Matrix (JSON format)
                </div>
                <textarea
                  value={customKernelStr}
                  onChange={(e) => setCustomKernelStr(e.target.value)}
                  rows={3}
                  className="w-full bg-[#FAFAF8] dark:bg-[#101010] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0] font-mono text-xs p-2.5 rounded outline-none focus:border-[#2563EB]"
                />
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() =>
                      setCustomKernelStr("[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]")
                    }
                    className="text-xs text-[#6F6F6A] hover:text-[#181818] dark:text-[#A0A09B] dark:hover:text-[#F2F2F0] underline"
                  >
                    Sharpen
                  </button>
                  <span>·</span>
                  <button
                    onClick={() =>
                      setCustomKernelStr("[[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]")
                    }
                    className="text-xs text-[#6F6F6A] hover:text-[#181818] dark:text-[#A0A09B] dark:hover:text-[#F2F2F0] underline"
                  >
                    Laplacian
                  </button>
                  <span>·</span>
                  <button
                    onClick={() =>
                      setCustomKernelStr("[[-2, -1, 0], [-1, 1, 1], [0, 1, 2]]")
                    }
                    className="text-xs text-[#6F6F6A] hover:text-[#181818] dark:text-[#A0A09B] dark:hover:text-[#F2F2F0] underline"
                  >
                    Emboss
                  </button>
                </div>
              </div>
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
              <span>{loading ? "Computing via FastAPI..." : "Apply Filter"}</span>
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
        </div>
      </div>
    </div>
  );
}

export default function ConvolutionBenchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading convolution bench...</div>}>
      <ConvolutionBenchContent />
    </Suspense>
  );
}
