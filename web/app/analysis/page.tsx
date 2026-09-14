"use client";

import React, { useState } from "react";
import {
  Activity,
  Info,
  Play,
  ScatterChart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/use-image";
import { useAnalysis } from "@/hooks/use-analysis";
import { useEncryption } from "@/hooks/use-encryption";
import { CryptanalysisSummary } from "@/components/analysis/CryptanalysisSummary";
import { HistogramChart } from "@/components/analysis/HistogramChart";
import { CorrelationScatterChart } from "@/components/analysis/CorrelationScatterChart";

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

  // 1-click Quick Demo: Generate DRPE ciphertext on the fly and analyze
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Bench Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#EDEDEB] dark:border-[#2E2E2E] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="emerald">BENCH 04</Badge>
            <span className="text-xs text-[#787774] dark:text-[#9B9B9B]">
              QUANTITATIVE CRYPTANALYSIS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E5E3] mt-1">
            Information Entropy &amp; Statistical Cryptanalysis
          </h1>
          <p className="text-xs text-[#787774] dark:text-[#9B9B9B] mt-0.5">
            Measure Shannon information entropy, adjacent pixel correlation destruction, and differential attack sensitivity (NPCR / UACI).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleRunAnalysis}
            disabled={loading || autoRunning || !plainArt || !cipherArt}
            className="h-9"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>
              {loading ? "Computing Statistics via FastAPI..." : "Run Cryptanalysis"}
            </span>
          </Button>
        </div>
      </div>

      {/* Artifact Pair Selection & Quick Demo Bar */}
      <Card>
        <CardContent className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Plaintext Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#787774] dark:text-[#9B9B9B] font-medium">Plaintext:</span>
              <div className="flex items-center gap-2 bg-[#F7F6F5] dark:bg-[#252525] px-2.5 py-1 rounded-md border border-[#EDEDEB] dark:border-[#333333]">
                {plainArt?.dataUri ? (
                  <img
                    src={plainArt.dataUri}
                    alt={plainArt.name}
                    className="h-4 w-4 rounded object-cover"
                  />
                ) : null}
                <select
                  value={plainId}
                  onChange={(e) => setSelectedPlainId(e.target.value)}
                  className="bg-transparent text-[#37352F] dark:text-[#E6E5E3] text-xs outline-none cursor-pointer"
                >
                  {artifacts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white dark:bg-[#252525]">
                      {a.name} ({a.sourceBench})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ciphertext Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[#787774] dark:text-[#9B9B9B] font-medium">Ciphertext:</span>
              <div className="flex items-center gap-2 bg-[#F7F6F5] dark:bg-[#252525] px-2.5 py-1 rounded-md border border-[#EDEDEB] dark:border-[#333333]">
                {cipherArt?.dataUri ? (
                  <img
                    src={cipherArt.dataUri}
                    alt={cipherArt.name}
                    className="h-4 w-4 rounded object-cover"
                  />
                ) : null}
                <select
                  value={cipherId}
                  onChange={(e) => setSelectedCipherId(e.target.value)}
                  className="bg-transparent text-[#37352F] dark:text-[#E6E5E3] text-xs outline-none cursor-pointer"
                >
                  {artifacts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white dark:bg-[#252525]">
                      {a.name} ({a.sourceBench})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 1-Click Fast DRPE Test */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleQuickDRPEAnalysis}
              disabled={autoRunning || loading || !plainArt}
              className="text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#2383E2]" />
              <span>
                {autoRunning ? "Encrypting & Analyzing..." : "1-Click DRPE Demo"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-2.5 rounded-md bg-[#FFE2DD] dark:bg-[#522525] text-[#5D1715] dark:text-[#FF7369] text-xs">
          {error}
        </div>
      )}

      {/* Summary KPI Cards & Security Health Assessment */}
      {fullAnalysis && (
        <CryptanalysisSummary
          entropyPlain={fullAnalysis.entropy.plain}
          entropyCipher={fullAnalysis.entropy.cipher}
          npcr={fullAnalysis.differential.npcr}
          uaci={fullAnalysis.differential.uaci}
          mse={fullAnalysis.quality.mse}
          psnr={fullAnalysis.quality.psnr}
          ssim={fullAnalysis.quality.ssim}
        />
      )}

      {/* Histograms & Scatter Distribution Charts */}
      {fullAnalysis ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Histogram Chart */}
          <div className="space-y-2">
            <HistogramChart
              plainBins={fullAnalysis.histograms.plain}
              cipherBins={fullAnalysis.histograms.cipher}
            />
          </div>

          {/* Adjacent Pixel Correlation Scatter Charts */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs text-[#37352F] dark:text-[#E6E5E3] p-2 rounded-lg bg-[#F7F6F5] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] gap-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <ScatterChart className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                <span>Neighbor Pixel Correlation:</span>
              </div>

              {/* Direction Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#2A2A2A] p-0.5 rounded border border-[#EDEDEB] dark:border-[#333333]">
                {(
                  [
                    { id: "horizontal", label: "Horizontal (0°)" },
                    { id: "vertical", label: "Vertical (90°)" },
                    { id: "diagonal", label: "Diagonal (45°)" },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setScatterDir(d.id)}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      scatterDir === d.id
                        ? "bg-[#EFEFED] dark:bg-[#383838] text-[#37352F] dark:text-white font-medium"
                        : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      ) : (
        <div className="h-[380px] flex flex-col items-center justify-center rounded-lg bg-[#FAFAF9] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] text-xs gap-3 p-6 text-center">
          <div className="p-3 rounded-full bg-white dark:bg-[#282828] border border-[#EDEDEB] dark:border-[#383838]">
            <Activity className="h-5 w-5 text-[#787774] dark:text-[#9B9B9B]" />
          </div>
          <span className="font-semibold text-[#37352F] dark:text-[#E6E5E3]">
            Awaiting Quantitative Analysis
          </span>
          <p className="max-w-md text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
            Click &quot;1-Click DRPE Demo&quot; to automatically encrypt the target and compute Shannon entropy, NPCR, and adjacent pixel scatter distributions.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={handleQuickDRPEAnalysis}
              disabled={autoRunning || !plainArt}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Launch 1-Click DRPE Demo</span>
            </Button>
          </div>
        </div>
      )}

      {/* Educational Guide: Understanding the Cryptometrics */}
      <div className="p-4 rounded-lg bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3]">
          <Info className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
          <span>Cryptanalysis Interpretation Guide</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#787774] dark:text-[#9B9B9B] pt-1">
          <div className="p-3 rounded-md bg-white dark:bg-[#262626] border border-[#EDEDEB] dark:border-[#333333] space-y-1">
            <span className="text-[#37352F] dark:text-[#E6E5E3] font-medium block">
              1. Shannon Entropy (H)
            </span>
            <p className="text-[11px] leading-relaxed">
              Quantifies pixel intensity randomness. For an 8-bit image with 256 gray levels, the upper limit is <strong className="text-[#37352F] dark:text-white font-mono">8.000 bits</strong>. Over 7.99 bits indicates flat, stationary white noise.
            </p>
          </div>
          <div className="p-3 rounded-md bg-white dark:bg-[#262626] border border-[#EDEDEB] dark:border-[#333333] space-y-1">
            <span className="text-[#37352F] dark:text-[#E6E5E3] font-medium block">
              2. Differential NPCR (&gt;99.6%)
            </span>
            <p className="text-[11px] leading-relaxed">
              Number of Pixel Change Rate against differential attacks. Modifying a single pixel in the input must cause at least 99.6% of ciphertext pixels to change completely.
            </p>
          </div>
          <div className="p-3 rounded-md bg-white dark:bg-[#262626] border border-[#EDEDEB] dark:border-[#333333] space-y-1">
            <span className="text-[#37352F] dark:text-[#E6E5E3] font-medium block">
              3. Pixel Correlation (r ≈ 0)
            </span>
            <p className="text-[11px] leading-relaxed">
              In normal photos, neighboring pixels are correlated (r &gt; 0.9). Secure optical cryptosystems destroy correlation, flattening the scatter distribution into an uncorrelated cloud (r ≈ 0.00).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
