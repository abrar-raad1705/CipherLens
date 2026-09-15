"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { useWorkspace } from "@/hooks/use-image";
import { useProcessing } from "@/hooks/use-processing";
import { formatMs } from "@/lib/utils/format";

function DeconvolutionBenchContent() {
  const router = useRouter();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const {
    loading,
    error,
    result,
    executeDeconvolution,
  } = useProcessing();

  const [kernelSize, setKernelSize] = useState<number>(5);
  const [sigma, setSigma] = useState<number>(1.5);
  const [deconvK, setDeconvK] = useState<number>(0.01);
  const [psfType, setPsfType] = useState<"GAUSSIAN">("GAUSSIAN");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleApply = async () => {
    if (!activeArtifact) return;
    setSavedSuccess(false);

    try {
      await executeDeconvolution(activeArtifact.dataUri, psfType, kernelSize, sigma, deconvK);
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
    }, false); // Do not switch active image automatically
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    if (andNavigateToEncryption) {
      router.push("/encryption/drpe");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            PROCESSING
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Wiener Deconvolution &amp; Restoration
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
              <span>{savedSuccess ? "Saved to Workspace" : "Save Artifact"}</span>
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
        <Card className="lg:col-span-4 p-5 space-y-6">
          {/* PSF Type */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              POINT SPREAD FUNCTION (PSF)
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => setPsfType("GAUSSIAN")}
                className="px-3 py-2 text-xs rounded transition-colors cursor-pointer border text-left border-[#2563EB] text-[#2563EB] dark:border-[#5B8CFF] dark:text-[#5B8CFF] font-medium bg-[#2563EB]/5"
              >
                Gaussian PSF Inversion
              </button>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                PARAMETERS
              </span>
              <Badge variant="signal">Wiener Filter</Badge>
            </div>

            <Slider
              label="Kernel Size"
              hint="Odd PSF matrix dimension"
              valueDisplay={`${kernelSize} × ${kernelSize}`}
              min={3}
              max={15}
              step={2}
              value={kernelSize}
              onChange={(e) => setKernelSize(Number(e.target.value))}
            />

            <Slider
              label="PSF Spread (σ)"
              hint="Estimated Gaussian blur spread"
              valueDisplay={sigma.toFixed(1)}
              min={0.5}
              max={5.0}
              step={0.1}
              value={sigma}
              onChange={(e) => setSigma(Number(e.target.value))}
            />

            <Slider
              label="Wiener Regularization (K)"
              hint="Noise-to-signal power ratio"
              valueDisplay={deconvK.toFixed(3)}
              min={0.001}
              max={0.1}
              step={0.005}
              value={deconvK}
              onChange={(e) => setDeconvK(Number(e.target.value))}
            />
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
              <span>{loading ? "Inverting PSF..." : "Apply Deconvolution"}</span>
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

export default function DeconvolutionBenchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading deconvolution bench...</div>}>
      <DeconvolutionBenchContent />
    </Suspense>
  );
}
