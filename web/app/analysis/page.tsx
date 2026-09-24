"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  PlayIcon as Play,
  PhotoIcon as ImageIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-image";
import { useAnalysis } from "@/hooks/use-analysis";
import { HistogramChart } from "@/components/analysis/HistogramChart";
import { Correlation3DViewer } from "@/components/analysis/Correlation3DViewer";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { DriveDropzone, UploadedImageInfo } from "@/components/upload/DriveDropzone";
import { cn } from "@/lib/utils/cn";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext: string;
  explanation?: string;
}

function MetricHoverCard({ label, value, subtext }: MetricCardProps) {
  return (
    <div className="p-4 rounded-xl border border-[#E8E8E3] dark:border-[#262626] bg-white/60 dark:bg-[#141414]/70 transition-all duration-200">
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-xs font-mono text-[#8E8E93] dark:text-[#7A7A7A] uppercase font-medium tracking-wider">
          {label}
        </span>
      </div>

      <div className="text-2xl sm:text-3xl font-mono font-medium text-[#181818] dark:text-[#F2F2F0]">
        {value}
      </div>

      <div className="text-xs font-mono text-[#8E8E93] dark:text-[#7A7A7A] mt-1">
        {subtext}
      </div>
    </div>
  );
}

function AnalysisBenchContent() {
  const searchParams = useSearchParams();
  const { artifacts, activeArtifact } = useWorkspace();
  const { loading, error, fullAnalysis, executeFullAnalysis } = useAnalysis();

  const [plainImage, setPlainImage] = useState<UploadedImageInfo | null>(null);
  const [cipherImage, setCipherImage] = useState<UploadedImageInfo | null>(null);
  const [recoveredImage, setRecoveredImage] = useState<UploadedImageInfo | null>(null);

  const [scatterDir, setScatterDir] = useState<"horizontal" | "vertical" | "diagonal">("horizontal");
  const [activeCompareTab, setActiveCompareTab] = useState<"cipher" | "recovered" | "three_way">("cipher");
  const initializedFromParams = useRef(false);

  // Initialize from search params or active workspace artifacts
  useEffect(() => {
    if (initializedFromParams.current) return;
    initializedFromParams.current = true;

    const pParam = searchParams.get("plainId");
    const cParam = searchParams.get("cipherId");
    const rParam = searchParams.get("recoveredId");

    let initialPlain: UploadedImageInfo | null = null;
    let initialCipher: UploadedImageInfo | null = null;
    let initialRecovered: UploadedImageInfo | null = null;

    try {
      const storedPlain = sessionStorage.getItem("analysis_plain");
      const storedCipher = sessionStorage.getItem("analysis_cipher");
      const storedRecovered = sessionStorage.getItem("analysis_recovered");
      if (storedPlain) {
        initialPlain = JSON.parse(storedPlain);
        sessionStorage.removeItem("analysis_plain");
      }
      if (storedCipher) {
        initialCipher = JSON.parse(storedCipher);
        sessionStorage.removeItem("analysis_cipher");
      }
      if (storedRecovered) {
        initialRecovered = JSON.parse(storedRecovered);
        sessionStorage.removeItem("analysis_recovered");
      }
    } catch (e) {
      console.warn("Failed to parse analysis sessionStorage:", e);
    }

    if (initialPlain) {
      setPlainImage(initialPlain);
    } else if (pParam) {
      const art = artifacts.find((a) => a.id === pParam);
      if (art) setPlainImage({ name: art.name, dataUri: art.dataUri, width: art.width, height: art.height });
    } else if (activeArtifact) {
      setPlainImage({
        name: activeArtifact.name,
        dataUri: activeArtifact.dataUri,
        width: activeArtifact.width,
        height: activeArtifact.height,
      });
    }

    if (initialCipher) {
      setCipherImage(initialCipher);
    } else if (cParam) {
      const art = artifacts.find((a) => a.id === cParam);
      if (art) setCipherImage({ name: art.name, dataUri: art.dataUri, width: art.width, height: art.height });
    } else {
      const cipherCand = artifacts.find(
        (a) =>
          a.sourceBench === "encryption" ||
          a.name.toLowerCase().includes("cipher") ||
          a.name.toLowerCase().includes("drpe")
      );
      if (cipherCand && cipherCand.id !== activeArtifact?.id) {
        setCipherImage({
          name: cipherCand.name,
          dataUri: cipherCand.dataUri,
          width: cipherCand.width,
          height: cipherCand.height,
        });
      }
    }

    if (initialRecovered) {
      setRecoveredImage(initialRecovered);
    } else if (rParam) {
      const art = artifacts.find((a) => a.id === rParam);
      if (art) setRecoveredImage({ name: art.name, dataUri: art.dataUri, width: art.width, height: art.height });
    }
  }, [searchParams, artifacts, activeArtifact]);

  // Auto-run analysis when requested (via ?autorun=1 query parameter or session flag)
  const autoRunDoneRef = useRef(false);
  useEffect(() => {
    if (autoRunDoneRef.current) return;
    const autorunParam = searchParams.get("autorun");
    const autorunSession = typeof window !== "undefined" ? sessionStorage.getItem("analysis_autorun") : null;
    const shouldAutoRun = autorunParam === "1" || autorunParam === "true" || autorunSession === "true";

    if (shouldAutoRun && plainImage && (cipherImage || recoveredImage) && !fullAnalysis && !loading) {
      autoRunDoneRef.current = true;
      if (typeof window !== "undefined") sessionStorage.removeItem("analysis_autorun");
      handleRunAnalysis();
    }
  }, [searchParams, plainImage, cipherImage, recoveredImage, fullAnalysis, loading]);

  // Adjust default compare tab based on available inputs
  useEffect(() => {
    if (cipherImage && recoveredImage) {
      setActiveCompareTab("cipher");
    } else if (recoveredImage && !cipherImage) {
      setActiveCompareTab("recovered");
    } else {
      setActiveCompareTab("cipher");
    }
  }, [cipherImage, recoveredImage]);

  const canRunAnalysis = Boolean(plainImage && (cipherImage || recoveredImage));

  const handleRunAnalysis = async () => {
    if (!plainImage || (!cipherImage && !recoveredImage)) return;
    try {
      const algoParam = searchParams.get("algo") || "DRPE";
      await executeFullAnalysis(
        plainImage.dataUri,
        cipherImage?.dataUri || null,
        recoveredImage?.dataUri || null,
        0,
        0,
        algoParam.toUpperCase(),
        { seed1: 1234, seed2: 5678 }
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CRYPTOGRAPHIC LABORATORY
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Quantitative Security &amp; Cryptanalysis
          </h1>
        </div>
      </div>

      {/* 3 Step Upload Panels - Unified Clean Styling with Larger Previews and Fonts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Box 1: Real / Original Image (Required) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-semibold text-center py-1">
            <span>Step 1 — Original Image</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/5 dark:bg-white/10 text-[#6F6F6A] dark:text-[#A0A09B]">
              Required
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[380px] sm:min-h-[410px]">
            {plainImage ? (
              <div className="h-full rounded-2xl border border-[#DCDCD6] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#121212]/90 p-6 flex flex-col items-center justify-center gap-4 min-h-[380px] sm:min-h-[410px] text-center shadow-2xs">
                {/* Larger Image Preview */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-[#DCDCD6] dark:border-[#333333] shadow-md bg-black/5 dark:bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={plainImage.dataUri} alt="Original" className="w-full h-full object-cover" />
                </div>
                {/* Larger Fonts for Writings */}
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-semibold text-[#181818] dark:text-[#F2F2F0] truncate max-w-[220px]">
                    {plainImage.name}
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                    {plainImage.width}×{plainImage.height}px · Original
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPlainImage(null)}
                    className="text-xs sm:text-sm text-[#2563EB] dark:text-[#5B8CFF] hover:underline cursor-pointer font-medium"
                  >
                    Change image
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-[380px] sm:min-h-[410px] space-y-2">
                <div className="flex-1 [&>div]:h-full [&>div]:min-h-[330px]">
                  <DriveDropzone
                    title="Drop original image here"
                    description="PNG, JPG · max 25 MB"
                    actionLabel="Browse"
                    compact={true}
                    onImageUploaded={(img) => setPlainImage(img)}
                  />
                </div>
                {artifacts.length > 0 && (
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-[#8E8E93] dark:text-[#6A6A6A] font-mono text-[11px] uppercase">
                      Workspace:
                    </span>
                    <select
                      onChange={(e) => {
                        const art = artifacts.find((a) => a.id === e.target.value);
                        if (art) {
                          setPlainImage({ name: art.name, dataUri: art.dataUri, width: art.width, height: art.height });
                        }
                      }}
                      defaultValue=""
                      className="bg-transparent border border-[#E0E0DA] dark:border-[#282828] rounded px-2.5 py-1 text-xs text-[#181818] dark:text-[#F2F2F0] max-w-[180px] truncate"
                    >
                      <option value="" disabled>Pick from workspace</option>
                      {artifacts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Box 2: Ciphertext Image (Optional) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-semibold text-center py-1">
            <span>Step 2 — Ciphertext</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/5 dark:bg-white/10 text-[#6F6F6A] dark:text-[#A0A09B]">
              Optional
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[380px] sm:min-h-[410px]">
            {cipherImage ? (
              <div className="h-full rounded-2xl border border-[#DCDCD6] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#121212]/90 p-6 flex flex-col items-center justify-center gap-4 min-h-[380px] sm:min-h-[410px] text-center shadow-2xs">
                {/* Larger Image Preview */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-[#DCDCD6] dark:border-[#333333] shadow-md bg-black/5 dark:bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cipherImage.dataUri} alt="Ciphertext" className="w-full h-full object-cover" />
                </div>
                {/* Larger Fonts for Writings */}
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-semibold text-[#181818] dark:text-[#F2F2F0] truncate max-w-[220px]">
                    {cipherImage.name}
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                    {cipherImage.width}×{cipherImage.height}px · Ciphertext
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setCipherImage(null)}
                    className="text-xs sm:text-sm text-[#2563EB] dark:text-[#5B8CFF] hover:underline cursor-pointer font-medium"
                  >
                    Change image
                  </button>
                  <span className="text-zinc-400">·</span>
                  <button
                    type="button"
                    onClick={() => setCipherImage(null)}
                    className="text-xs sm:text-sm text-red-500 hover:underline cursor-pointer font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-[380px] sm:min-h-[410px] space-y-2">
                <div className="flex-1 [&>div]:h-full [&>div]:min-h-[330px]">
                  <DriveDropzone
                    title="Drop ciphertext image here"
                    description="PNG, JPG · max 25 MB"
                    actionLabel="Browse"
                    compact={true}
                    onImageUploaded={(img) => setCipherImage(img)}
                  />
                </div>
                {artifacts.length > 0 && (
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-[#8E8E93] dark:text-[#6A6A6A] font-mono text-[11px] uppercase">
                      Workspace:
                    </span>
                    <select
                      onChange={(e) => {
                        const art = artifacts.find((a) => a.id === e.target.value);
                        if (art) {
                          setCipherImage({ name: art.name, dataUri: art.dataUri, width: art.width, height: art.height });
                        }
                      }}
                      defaultValue=""
                      className="bg-transparent border border-[#E0E0DA] dark:border-[#282828] rounded px-2.5 py-1 text-xs text-[#181818] dark:text-[#F2F2F0] max-w-[180px] truncate"
                    >
                      <option value="" disabled>Pick from workspace</option>
                      {artifacts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Box 3: Reconstructed Image (Optional) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-semibold text-center py-1">
            <span>Step 3 — Reconstructed</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/5 dark:bg-white/10 text-[#6F6F6A] dark:text-[#A0A09B]">
              Optional
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[380px] sm:min-h-[410px]">
            {recoveredImage ? (
              <div className="h-full rounded-2xl border border-[#DCDCD6] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#121212]/90 p-6 flex flex-col items-center justify-center gap-4 min-h-[380px] sm:min-h-[410px] text-center shadow-2xs">
                {/* Larger Image Preview */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-[#DCDCD6] dark:border-[#333333] shadow-md bg-black/5 dark:bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={recoveredImage.dataUri} alt="Reconstructed" className="w-full h-full object-cover" />
                </div>
                {/* Larger Fonts for Writings */}
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-semibold text-[#181818] dark:text-[#F2F2F0] truncate max-w-[220px]">
                    {recoveredImage.name}
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                    {recoveredImage.width}×{recoveredImage.height}px · Decrypted
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRecoveredImage(null)}
                    className="text-xs sm:text-sm text-[#2563EB] dark:text-[#5B8CFF] hover:underline cursor-pointer font-medium"
                  >
                    Change image
                  </button>
                  <span className="text-zinc-400">·</span>
                  <button
                    type="button"
                    onClick={() => setRecoveredImage(null)}
                    className="text-xs sm:text-sm text-red-500 hover:underline cursor-pointer font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-[380px] sm:min-h-[410px] space-y-2">
                <div className="flex-1 [&>div]:h-full [&>div]:min-h-[330px]">
                  <DriveDropzone
                    title="Drop reconstructed image here"
                    description="PNG, JPG · max 25 MB"
                    actionLabel="Browse"
                    compact={true}
                    onImageUploaded={(img) => setRecoveredImage(img)}
                  />
                </div>
                {artifacts.length > 0 && (
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-[#8E8E93] dark:text-[#6A6A6A] font-mono text-[11px] uppercase">
                      Workspace:
                    </span>
                    <select
                      onChange={(e) => {
                        const art = artifacts.find((a) => a.id === e.target.value);
                        if (art) {
                          setRecoveredImage({ name: art.name, dataUri: art.dataUri, width: art.width, height: art.height });
                        }
                      }}
                      defaultValue=""
                      className="bg-transparent border border-[#E0E0DA] dark:border-[#282828] rounded px-2.5 py-1 text-xs text-[#181818] dark:text-[#F2F2F0] max-w-[180px] truncate"
                    >
                      <option value="" disabled>Pick from workspace</option>
                      {artifacts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center-Justified Run Analysis Button Only (Picture 2 requirement) */}
      <div className="flex flex-col items-center justify-center py-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleRunAnalysis}
          disabled={loading || !canRunAnalysis}
          className="px-10 py-3 text-sm font-semibold rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-98"
        >
          <Play className="h-4 w-4 fill-current mr-2" />
          <span>{loading ? "Computing Analysis..." : "Run Analysis"}</span>
        </Button>

        {!canRunAnalysis && (
          <p className="text-xs text-[#8E8E93] dark:text-[#7A7A7A] mt-2 font-mono text-center">
            {!plainImage
              ? "Original image is required in Step 1."
              : "Please add a Ciphertext (Step 2) or Reconstructed image (Step 3) to analyze."}
          </p>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-mono text-center">
          Analysis error: {error}
        </div>
      )}

      {/* Dynamic Results Section (Shows Respected Parts Based on Loaded Images) */}
      {fullAnalysis ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* SECTION 1: Respected Metric Matrices with Hover Explanations (Picture 3 requirement) */}
          <div className="space-y-6">
            {/* Sector A: Ciphertext Security & Diffusion Analysis (when cipher is present) */}
            {cipherImage && fullAnalysis.entropy.cipher !== undefined && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono tracking-wider text-[#181818] dark:text-[#F2F2F0] uppercase font-semibold">
                  <ShieldCheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Ciphertext Security &amp; Diffusion Analysis (Plaintext vs Ciphertext)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <MetricHoverCard
                    label="Shannon Entropy"
                    value={fullAnalysis.entropy.cipher.toFixed(4)}
                    subtext={`Plain: ${fullAnalysis.entropy.plain.toFixed(4)} · Max 8.000`}
                    explanation="Measures information unpredictability in bits/pixel. An ideal cryptographic cipher approaches 8.000 bits (pure white noise), leaving zero statistical patterns."
                  />

                  <MetricHoverCard
                    label="NPCR (Pixel Change)"
                    value={`${fullAnalysis.differential.npcr.toFixed(2)}%`}
                    subtext="Ideal baseline: > 99.60%"
                    explanation="Number of Pixels Change Rate. Measures the percentage of differing ciphertext pixels when exactly one plaintext pixel is modified (>99.60% ideal)."
                  />

                  <MetricHoverCard
                    label="UACI (Intensity Change)"
                    value={`${fullAnalysis.differential.uaci.toFixed(2)}%`}
                    subtext="Ideal baseline: ~ 33.46%"
                    explanation="Unified Average Changing Intensity. Measures the average rate of intensity difference between two ciphertexts when one plaintext pixel is altered (~33.46% ideal)."
                  />

                  <MetricHoverCard
                    label={`Correlation (${scatterDir.slice(0, 4).toUpperCase()})`}
                    value={
                      fullAnalysis.correlation.cipher
                        ? fullAnalysis.correlation.cipher[scatterDir].toFixed(4)
                        : "—"
                    }
                    subtext="Ideal cipher: ~ 0.0000"
                    explanation="Evaluates linear correlation between adjacent pixels. Values near 0.0000 prove ciphertext pixels are completely uncorrelated, resisting statistical cryptanalysis."
                  />
                </div>
              </div>
            )}

            {/* Sector B: Decryption & Reconstruction Fidelity Metrics (when reconstructed is present) */}
            {recoveredImage && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono tracking-wider text-[#181818] dark:text-[#F2F2F0] uppercase font-semibold">
                  <CheckBadgeIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Reconstruction Fidelity &amp; Verification (Plaintext vs Reconstructed)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <MetricHoverCard
                    label="SSIM (Similarity)"
                    value={fullAnalysis.quality.ssim.toFixed(4)}
                    subtext="Ideal recovery: 1.0000"
                    explanation="Structural Similarity Index. Evaluates structural, luminance, and contrast preservation between images (1.0000 denotes exact identical reconstruction)."
                  />

                  <MetricHoverCard
                    label="PSNR (Peak SNR)"
                    value={
                      typeof fullAnalysis.quality.psnr === "number"
                        ? `${fullAnalysis.quality.psnr.toFixed(2)} dB`
                        : fullAnalysis.quality.psnr
                    }
                    subtext="High fidelity: > 35.0 dB"
                    explanation="Peak Signal-to-Noise Ratio in decibels. Measures reconstruction signal power relative to corrupting noise (>35 dB indicates high quality; inf = lossless)."
                  />

                  <MetricHoverCard
                    label="MSE (Squared Error)"
                    value={fullAnalysis.quality.mse.toFixed(4)}
                    subtext="Ideal recovery: 0.0000"
                    explanation="Mean Squared Error. Computes the average squared pixel difference between original and reconstructed images (0.0000 indicates exact mathematical zero-loss recovery)."
                  />

                  <MetricHoverCard
                    label="Signal Preservation"
                    value={
                      fullAnalysis.quality.ssim > 0.99
                        ? "Lossless"
                        : fullAnalysis.quality.ssim > 0.9
                        ? "High Quality"
                        : "Degraded"
                    }
                    subtext={`Latency: ${fullAnalysis.latency_ms} ms`}
                    explanation="Overall restoration fidelity benchmark rating determined by SSIM structural correlation and PSNR signal-to-noise thresholds."
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Respected Visual Comparisons */}
          {plainImage && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#E8E8E3] dark:border-[#292929] pb-2">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  IMAGE VISUAL COMPARISON
                </div>

                {/* Tab Switcher if multiple comparison targets are available */}
                {cipherImage && recoveredImage && (
                  <div className="flex items-center gap-1 bg-[#F2F2EE] dark:bg-[#1E1E1E] p-1 rounded-lg text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveCompareTab("cipher")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        activeCompareTab === "cipher"
                          ? "bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 font-medium shadow-2xs"
                          : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-white"
                      )}
                    >
                      Plain vs Cipher
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCompareTab("recovered")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        activeCompareTab === "recovered"
                          ? "bg-white dark:bg-[#2A2A2A] text-emerald-600 dark:text-emerald-400 font-medium shadow-2xs"
                          : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-white"
                      )}
                    >
                      Plain vs Reconstructed
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCompareTab("three_way")}
                      className={cn(
                        "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                        activeCompareTab === "three_way"
                          ? "bg-white dark:bg-[#2A2A2A] text-purple-600 dark:text-purple-400 font-medium shadow-2xs"
                          : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-white"
                      )}
                    >
                      Three-Way View
                    </button>
                  </div>
                )}
              </div>

              {/* View 1: Plain vs Cipher */}
              {(activeCompareTab === "cipher" || (!recoveredImage && cipherImage)) && cipherImage && (
                <div className="space-y-2">
                  <SplitCompareCanvas
                    beforeSrc={plainImage.dataUri}
                    afterSrc={cipherImage.dataUri}
                    beforeLabel="PLAINTEXT (ORIGINAL)"
                    afterLabel="CIPHERTEXT (ENCRYPTED)"
                  />
                </div>
              )}

              {/* View 2: Plain vs Reconstructed */}
              {(activeCompareTab === "recovered" || (!cipherImage && recoveredImage)) && recoveredImage && (
                <div className="space-y-2">
                  <SplitCompareCanvas
                    beforeSrc={plainImage.dataUri}
                    afterSrc={recoveredImage.dataUri}
                    beforeLabel="PLAINTEXT (ORIGINAL)"
                    afterLabel="RECONSTRUCTED (DECRYPTED)"
                  />
                </div>
              )}

              {/* View 3: Three-Way Simultaneous Comparison */}
              {activeCompareTab === "three_way" && cipherImage && recoveredImage && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase text-[#181818] dark:text-[#F2F2F0] font-semibold">
                      1. Plaintext Source
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E8E3] dark:border-[#282828] bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={plainImage.dataUri} alt="Plaintext" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase text-[#181818] dark:text-[#F2F2F0] font-semibold">
                      2. Encrypted Ciphertext
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E8E3] dark:border-[#282828] bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cipherImage.dataUri} alt="Ciphertext" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase text-[#181818] dark:text-[#F2F2F0] font-semibold">
                      3. Decrypted Reconstructed
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E8E3] dark:border-[#282828] bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={recoveredImage.dataUri} alt="Reconstructed" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Intensity Histogram & 3D Correlation Side-by-Side & Same Size (Picture 4 requirement) */}
          <div className="pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Intensity Histogram Card */}
              <HistogramChart
                useCardLayout={true}
                chartHeight="380px"
                className="h-full"
                plainBins={fullAnalysis.histograms.plain}
                cipherBins={cipherImage ? fullAnalysis.histograms.cipher : undefined}
                recoveredBins={recoveredImage ? fullAnalysis.histograms.recovered : undefined}
                title={
                  cipherImage && recoveredImage
                    ? "Intensity Distribution (Plain vs Cipher vs Reconstructed)"
                    : cipherImage
                    ? "Intensity Distribution (Plaintext vs Ciphertext)"
                    : "Intensity Distribution (Plaintext vs Reconstructed)"
                }
              />

              {/* Right Column: 3D Correlation Disintegration Sphere Card */}
              {cipherImage ? (
                <div className="h-full flex flex-col">
                  <Correlation3DViewer
                    imageSrc={plainImage?.dataUri}
                    ciphertextSrc={cipherImage.dataUri}
                    title="3D Spatial Correlation Disintegration & Magnitude Sphere"
                    className="h-full flex-1 flex flex-col justify-between"
                  />
                </div>
              ) : recoveredImage ? (
                <Card className="h-full flex flex-col justify-center p-8 text-center space-y-3">
                  <div className="text-xs font-mono uppercase text-[#999993] dark:text-[#6A6A6A] font-semibold">
                    Signal Preservation &amp; Fidelity Audit
                  </div>
                  <p className="text-xs sm:text-sm text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed max-w-md mx-auto">
                    The Reconstructed image has been quantitatively benchmarked against the Ground Truth Original.
                    With an SSIM score of <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{fullAnalysis.quality.ssim.toFixed(4)}</strong> and PSNR of <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{typeof fullAnalysis.quality.psnr === "number" ? `${fullAnalysis.quality.psnr.toFixed(2)} dB` : fullAnalysis.quality.psnr}</strong>, the image demonstrates {fullAnalysis.quality.ssim > 0.99 ? "complete lossless reconstruction." : "high fidelity preservation."}
                  </p>
                  <div className="inline-block mx-auto px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                    Mean Squared Error (MSE): {fullAnalysis.quality.mse.toFixed(6)}
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
