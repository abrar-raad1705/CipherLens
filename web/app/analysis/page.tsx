"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/hooks/use-image";
import { useAnalysis } from "@/hooks/use-analysis";
import { useEncryption } from "@/hooks/use-encryption";
import { CryptanalysisSummary } from "@/components/analysis/CryptanalysisSummary";
import { HistogramChart } from "@/components/analysis/HistogramChart";
import { CorrelationScatterChart } from "@/components/analysis/CorrelationScatterChart";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";

export default function AnalysisBenchPage() {
  const { artifacts, activeArtifact, addArtifact } = useWorkspace();
  const { loading, error, fullAnalysis, executeFullAnalysis } = useAnalysis();
  const { executeDRPEEncrypt } = useEncryption();

  const [selectedPlainId, setSelectedPlainId] = useState<string>("");
  const [selectedCipherId, setSelectedCipherId] = useState<string>("");
  const [scatterDir, setScatterDir] = useState<"horizontal" | "vertical" | "diagonal">("horizontal");
  const [autoRunning, setAutoRunning] = useState(false);

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
    selectedPlainId || plainCand?.id || (artifacts.length > 0 ? artifacts[artifacts.length - 1].id : "");
  const cipherId =
    selectedCipherId || cipherCand?.id || (artifacts.length > 0 ? artifacts[0].id : "");

  const plainArt = artifacts.find((a) => a.id === plainId) || activeArtifact;
  const cipherArt = artifacts.find((a) => a.id === cipherId) || activeArtifact;

  const handleRunAnalysis = async () => {
    if (!plainArt || !cipherArt) return;
    try {
      await executeFullAnalysis(
        plainArt.dataUri,
        cipherArt.dataUri,
        undefined,
        0,
        0,
        "DRPE",
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
    <div className="space-y-8 max-w-4xl py-4">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            ANALYSIS
          </div>
          <h1 className="text-xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Encryption quality
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickDRPEAnalysis}
            disabled={autoRunning || loading || !plainArt}
          >
            <span>{autoRunning ? "Simulating..." : "Auto DRPE & Analyze"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunAnalysis}
            disabled={loading || autoRunning || !plainArt || !cipherArt}
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{loading ? "Evaluating..." : "Run Analysis"}</span>
          </Button>
        </div>
      </div>

      {/* Target Pair Selection Row */}
      <section className="flex flex-wrap items-center justify-between gap-4 text-xs py-1">
        <div className="flex flex-wrap items-center gap-6">
          {/* Plaintext Selector */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#999993] dark:text-[#6A6A6A] uppercase">
              PLAIN:
            </span>
            <select
              value={plainId}
              onChange={(e) => setSelectedPlainId(e.target.value)}
              className="bg-white dark:bg-[#171717] border border-[#E8E8E3] dark:border-[#292929] rounded px-2 py-1 text-xs text-[#181818] dark:text-[#F2F2F0] outline-none cursor-pointer"
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
            <span className="font-mono text-[11px] text-[#999993] dark:text-[#6A6A6A] uppercase">
              CIPHER:
            </span>
            <select
              value={cipherId}
              onChange={(e) => setSelectedCipherId(e.target.value)}
              className="bg-white dark:bg-[#171717] border border-[#E8E8E3] dark:border-[#292929] rounded px-2 py-1 text-xs text-[#181818] dark:text-[#F2F2F0] outline-none cursor-pointer"
            >
              {artifacts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.sourceBench})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="text-xs text-[#DC2626] font-mono py-1">
          Error: {error}
        </div>
      )}

      {/* Clean Metric Row (Section 18) */}
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
        <div className="py-6 border-y border-[#E8E8E3] dark:border-[#292929] text-center">
          <p className="text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
            Select target pair and click &quot;Run Analysis&quot; or &quot;Auto DRPE &amp; Analyze&quot; to compute entropy, NPCR, UACI and correlation.
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
                <span className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                  Neighbor Correlation
                </span>
                <div className="flex items-center gap-2 text-[10px] font-mono">
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
            </div>
          </div>

          {/* Original / Encrypted Comparison */}
          {plainArt?.dataUri && cipherArt?.dataUri && (
            <div className="space-y-3 pt-6 border-t border-[#E8E8E3] dark:border-[#292929]">
              <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
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
