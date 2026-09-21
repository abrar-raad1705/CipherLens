"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PlayIcon as Play, SparklesIcon as Sparkles } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-image";
import { useAnalysis } from "@/hooks/use-analysis";
import { useEncryption } from "@/hooks/use-encryption";
import { CryptanalysisSummary } from "@/components/analysis/CryptanalysisSummary";
import { HistogramChart } from "@/components/analysis/HistogramChart";
import { CorrelationScatterChart } from "@/components/analysis/CorrelationScatterChart";
import { Correlation3DViewer } from "@/components/analysis/Correlation3DViewer";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";

function AnalysisBenchContent() {
  const searchParams = useSearchParams();
  const { artifacts, activeArtifact, addArtifact } = useWorkspace();
  const { loading, error, fullAnalysis, executeFullAnalysis } = useAnalysis();
  const { executeDRPEEncrypt } = useEncryption();

  const [selectedPlainId, setSelectedPlainId] = useState<string>("");
  const [selectedCipherId, setSelectedCipherId] = useState<string>("");
  const [scatterDir, setScatterDir] = useState<"horizontal" | "vertical" | "diagonal">("horizontal");
  const [autoRunning, setAutoRunning] = useState(false);
  const autoExecutedRef = useRef(false);

  // Sync from query parameters if present
  useEffect(() => {
    const pParam = searchParams.get("plainId");
    const cParam = searchParams.get("cipherId");
    if (pParam) setSelectedPlainId(pParam);
    if (cParam) setSelectedCipherId(cParam);
  }, [searchParams]);

  // Derive sensible default targets if user hasn't explicitly selected one
  const cipherCand = artifacts.find(
    (a) =>
      a.sourceBench === "encryption" ||
      a.name.toLowerCase().includes("cipher") ||
      a.name.toLowerCase().includes("drpe")
  );
  const plainCand = artifacts.find(
    (a) => a.id !== cipherCand?.id && (a.sourceBench === "preset" || a.sourceBench === "upload")
  );

  const plainId =
    selectedPlainId ||
    searchParams.get("plainId") ||
    plainCand?.id ||
    (artifacts.length > 0 ? artifacts[artifacts.length - 1].id : "");

  const cipherId =
    selectedCipherId ||
    searchParams.get("cipherId") ||
    cipherCand?.id ||
    (artifacts.length > 0 ? artifacts[0].id : "");

  const plainArt = artifacts.find((a) => a.id === plainId) || activeArtifact;
  const cipherArt = artifacts.find((a) => a.id === cipherId) || activeArtifact;

  // Auto-run analysis when navigated with auto=true
  useEffect(() => {
    const isAuto = searchParams.get("auto") === "true";
    if (isAuto && plainArt?.dataUri && cipherArt?.dataUri && !autoExecutedRef.current && !loading) {
      autoExecutedRef.current = true;
      const algoParam = searchParams.get("algo") || "DRPE";
      executeFullAnalysis(
        plainArt.dataUri,
        cipherArt.dataUri,
        undefined,
        0,
        0,
        algoParam.toUpperCase(),
        { seed1: 1234, seed2: 5678 }
      );
    }
  }, [searchParams, plainArt?.dataUri, cipherArt?.dataUri, executeFullAnalysis, loading]);

  const handleRunAnalysis = async () => {
    if (!plainArt || !cipherArt) return;
    try {
      const algoParam = searchParams.get("algo") || "DRPE";
      await executeFullAnalysis(
        plainArt.dataUri,
        cipherArt.dataUri,
        undefined,
        0,
        0,
        algoParam.toUpperCase(),
        { seed1: 1234, seed2: 5678 }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickDRPEAnalysis = async () => {
    if (!plainArt) return;
    setAutoRunning(true);
    try {
      const encRes = await executeDRPEEncrypt(plainArt.dataUri, 1234, 5678);
      const newCipher = addArtifact({
        name: `${plainArt.name} [DRPE Ciphertext]`,
        dataUri: encRes.ciphertext,
        width: plainArt.width,
        height: plainArt.height,
        sourceBench: "encryption",
      });
      setSelectedCipherId(newCipher.id);

      await executeFullAnalysis(
        plainArt.dataUri,
        encRes.ciphertext,
        undefined,
        0,
        0,
        "DRPE",
        { seed1: 1234, seed2: 5678 }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setAutoRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            ANALYSIS
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Quantitative Security &amp; Cryptanalysis
          </h1>
        </div>
      </div>

      {/* User Inputs & Controls placed on TOP of the viewfield */}
      <Card className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {/* Plaintext Selector */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              PLAIN:
            </span>
            <select
              value={plainId}
              onChange={(e) => setSelectedPlainId(e.target.value)}
              className="bg-[#FAFAF8] dark:bg-[#101010] border border-[#E8E8E3] dark:border-[#292929] rounded px-3 py-1.5 text-sm text-[#181818] dark:text-[#F2F2F0] outline-none cursor-pointer"
            >
              {artifacts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.sourceBench})
                </option>
              ))}
            </select>
          </div>

          {/* Ciphertext Selector */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              CIPHER:
            </span>
            <select
              value={cipherId}
              onChange={(e) => setSelectedCipherId(e.target.value)}
              className="bg-[#FAFAF8] dark:bg-[#101010] border border-[#E8E8E3] dark:border-[#292929] rounded px-3 py-1.5 text-sm text-[#181818] dark:text-[#F2F2F0] outline-none cursor-pointer"
            >
              {artifacts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.sourceBench})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls on Top */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={handleQuickDRPEAnalysis}
            disabled={autoRunning || loading || !plainArt}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF] mr-1" />
            <span>{autoRunning ? "Simulating..." : "Auto DRPE & Analyze"}</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleRunAnalysis}
            disabled={loading || autoRunning || !plainArt || !cipherArt}
          >
            <Play className="h-3.5 w-3.5 fill-current mr-1" />
            <span>{loading ? "Computing..." : "Run Analysis"}</span>
          </Button>
        </div>
      </Card>

      {error && (
        <div className="text-xs text-[#DC2626] font-mono py-1">
          Error: {error}
        </div>
      )}

      {/* Clean Metric Row */}
      {fullAnalysis ? (
        <CryptanalysisSummary
          entropyPlain={fullAnalysis.entropy.plain}
          entropyCipher={fullAnalysis.entropy.cipher}
          npcr={fullAnalysis.differential.npcr}
          uaci={fullAnalysis.differential.uaci}
          mse={fullAnalysis.quality.mse}
          psnr={fullAnalysis.quality.psnr}
          ssim={fullAnalysis.quality.ssim}
          correlationCipher={fullAnalysis.correlation.cipher[scatterDir]}
        />
      ) : (
        <div className="py-8 border-y border-[#E8E8E3] dark:border-[#292929] text-center">
          <p className="text-sm text-[#6F6F6A] dark:text-[#A0A09B]">
            Select target pair above and click &quot;Run Analysis&quot; or &quot;Auto DRPE &amp; Analyze&quot; to compute entropy, NPCR, UACI and correlation.
          </p>
        </div>
      )}

      {/* Charts & Visual Comparison Section */}
      {fullAnalysis && (
        <div className="space-y-8">
          {/* Histogram & Correlation Plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Histogram */}
            <HistogramChart
              plainBins={fullAnalysis.histograms.plain}
              cipherBins={fullAnalysis.histograms.cipher}
            />

            {/* Correlation Scatter Cloud */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  Adjacent Pixel Correlation
                </span>
                <div className="flex items-center gap-2 text-xs font-mono">
                  {(["horizontal", "vertical", "diagonal"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setScatterDir(d)}
                      className={`cursor-pointer transition-colors uppercase ${
                        scatterDir === d
                          ? "text-[#2563EB] dark:text-[#5B8CFF] font-medium underline"
                          : "text-[#999993] dark:text-[#6A6A6A] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                      }`}
                    >
                      {d.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CorrelationScatterChart
                  points={fullAnalysis.scatter.plain[scatterDir]}
                  direction={
                    scatterDir === "horizontal"
                      ? "Horizontal"
                      : scatterDir === "vertical"
                      ? "Vertical"
                      : "Diagonal"
                  }
                  imageLabel="Plaintext"
                  coefficient={fullAnalysis.correlation.plain[scatterDir]}
                />
                <CorrelationScatterChart
                  points={fullAnalysis.scatter.cipher[scatterDir]}
                  direction={
                    scatterDir === "horizontal"
                      ? "Horizontal"
                      : scatterDir === "vertical"
                      ? "Vertical"
                      : "Diagonal"
                  }
                  imageLabel="Ciphertext"
                  coefficient={fullAnalysis.correlation.cipher[scatterDir]}
                />
              </div>

              {/* 3D Correlation & Phase Sphere Visualizer */}
              <div className="pt-3">
                <Correlation3DViewer
                  imageSrc={plainArt?.dataUri}
                  ciphertextSrc={cipherArt?.dataUri}
                  title="3D Spatial Correlation Disintegration & Magnitude Sphere"
                />
              </div>
            </div>
          </div>

          {/* Original / Encrypted Comparison */}
          {plainArt?.dataUri && cipherArt?.dataUri && (
            <div className="space-y-3 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
              <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                IMAGE COMPARISON
              </div>
              <SplitCompareCanvas
                beforeSrc={plainArt.dataUri}
                afterSrc={cipherArt.dataUri}
                beforeLabel="PLAINTEXT"
                afterLabel="CIPHERTEXT"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalysisBenchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading cryptanalysis bench...</div>}>
      <AnalysisBenchContent />
    </Suspense>
  );
}

