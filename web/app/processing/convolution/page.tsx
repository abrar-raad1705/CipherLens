"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
    { id: "custom", label: "Custom" },
    { id: "deconvolution", label: "Deconvolution" },
  ];

  return (
    <div className="space-y-8 max-w-4xl py-4">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            CONVOLUTION
          </div>
          <h1 className="text-xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Spatial image filtering
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
                <Check className="h-3 w-3 text-[#059669]" />
              ) : (
                <Save className="h-3 w-3 text-[#6F6F6A]" />
              )}
              <span>{savedSuccess ? "Saved" : "Save"}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveArtifact(true)}
            >
              <span>To Encryption</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Visualization */}
      <section className="space-y-2">
        {activeArtifact && activeArtifact.dataUri ? (
          <SplitCompareCanvas
            beforeSrc={activeArtifact.dataUri}
            afterSrc={result ? result.output_image : activeArtifact.dataUri}
            beforeLabel="ORIGINAL"
            afterLabel={result ? result.filter.toUpperCase() : "RESULT"}
          />
        ) : (
          <div className="h-[360px] flex flex-col items-center justify-center rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-xs gap-3 p-6 text-center">
            <span className="font-medium text-[#181818] dark:text-[#F2F2F0]">
              No Target Selected
            </span>
            <p className="text-[#6F6F6A] dark:text-[#A0A09B] max-w-sm">
              Load an optical calibration target or upload an image to begin spatial filtering experiments.
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
      </section>

      {/* Controls Area (Inline, separated by thin rules, no cards) */}
      <section className="space-y-6 pt-2">
        {/* Method Selector */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            METHOD
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1 text-xs rounded transition-colors cursor-pointer border ${
                  mode === m.id
                    ? "border-[#2563EB] text-[#2563EB] dark:border-[#5B8CFF] dark:text-[#5B8CFF] font-medium bg-[#2563EB]/5"
                    : "border-[#E8E8E3] dark:border-[#292929] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] bg-white dark:bg-[#171717]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Parameters */}
        <div className="border-t border-[#E8E8E3] dark:border-[#292929] pt-4 space-y-4">
          <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            {mode.toUpperCase()} PARAMETERS
          </div>

          <div className="max-w-md space-y-4">
            {(mode === "gaussian" || mode === "median" || mode === "deconvolution") && (
              <Slider
                label="Kernel size"
                hint="Odd dimension"
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
                label="Sigma (σ)"
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
                label="Regularization (K)"
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
                  2D Kernel Matrix
                </div>
                <textarea
                  value={customKernelStr}
                  onChange={(e) => setCustomKernelStr(e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-[#171717] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0] font-mono text-xs p-2.5 rounded outline-none focus:border-[#2563EB]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCustomKernelStr("[[0, -1, 0], [-1, 5, -1], [0, -1, 0]]")
                    }
                    className="text-[11px] text-[#6F6F6A] hover:text-[#181818] dark:text-[#A0A09B] dark:hover:text-[#F2F2F0] underline"
                  >
                    Sharpen
                  </button>
                  <span>·</span>
                  <button
                    onClick={() =>
                      setCustomKernelStr("[[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]")
                    }
                    className="text-[11px] text-[#6F6F6A] hover:text-[#181818] dark:text-[#A0A09B] dark:hover:text-[#F2F2F0] underline"
                  >
                    Laplacian
                  </button>
                  <span>·</span>
                  <button
                    onClick={() =>
                      setCustomKernelStr("[[-2, -1, 0], [-1, 1, 1], [0, 1, 2]]")
                    }
                    className="text-[11px] text-[#6F6F6A] hover:text-[#181818] dark:text-[#A0A09B] dark:hover:text-[#F2F2F0] underline"
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

          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="primary"
              onClick={handleApply}
              disabled={loading || !activeArtifact}
              className="h-8"
            >
              <span>{loading ? "Computing..." : "Apply"}</span>
            </Button>

            {result && (
              <div className="font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                Latency: {formatMs(result.latency_ms)}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
