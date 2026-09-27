"use client";

import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  PlayIcon as Play,
  PhotoIcon as ImageIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  ArrowPathIcon as RotateCcw,
  ArrowRightIcon,
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
    <div className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[#E8E8E3] dark:border-[#303030] bg-white dark:bg-[#1C1C1C] p-5 min-h-[172px]">
      <div>
        <span className="text-sm font-medium text-[#575A55] dark:text-[#B8BCB8]">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-2 pt-4 pb-3">
        <span className="min-w-0 break-words font-sans text-[clamp(1.8rem,2.35vw,2.5rem)] leading-none tracking-[-0.035em] tabular-nums font-semibold text-[#181818] dark:text-[#F2F2F0]">
          {value}
        </span>
      </div>

      <div className="border-t border-[#E8E8E3] dark:border-[#343434] pt-3 text-xs text-[#777B75] dark:text-[#A3A7A2]">
        {subtext}
      </div>
    </div>
  );
}

function FidelityStatCard({
  label,
  value,
  unit,
  detail,
  emphasis = false,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn(
      "relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border p-5 min-h-[172px]",
      emphasis
        ? "border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] dark:border-emerald-500/30"
        : "border-[#E8E8E3] dark:border-[#303030] bg-white dark:bg-[#1C1C1C]"
    )}>
      <div>
        <span className="text-sm font-medium text-[#575A55] dark:text-[#B8BCB8]">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 pt-4 pb-3">
        <span className={cn(
          "min-w-0 break-words font-sans text-[clamp(1.8rem,2.35vw,2.5rem)] leading-none tracking-[-0.035em] tabular-nums",
          emphasis ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-medium text-[#181818] dark:text-[#F2F2F0]"
        )}>
          {value}
        </span>
        {unit && <span className="text-sm font-mono text-[#8E8E93] dark:text-[#909090]">{unit}</span>}
      </div>
      <div className="border-t border-[#E8E8E3] dark:border-[#343434] pt-3 text-xs text-[#777B75] dark:text-[#A3A7A2]">
        {detail}
      </div>
    </div>
  );
}

function ComparisonTablet({ rightLabel }: { rightLabel: "CIPHERTEXT" | "RECONSTRUCTED" }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E3] dark:border-[#2C2C2C] bg-[#F7F7F5] dark:bg-[#1A1A1A] px-3 py-1 text-[11px] font-mono">
      <span className="text-[#777B75] dark:text-[#8A8E89] tracking-wider uppercase">
        ORIGINAL
      </span>
      <ArrowRightIcon className="h-3 w-3 text-[#9E9E99] dark:text-[#5E625D]" aria-hidden="true" />
      <span className="font-semibold text-[#181818] dark:text-[#EAEAE8] tracking-wider uppercase">
        {rightLabel}
      </span>
    </div>
  );
}

function AnalysisImagePill({
  image,
  label,
  onChange,
}: {
  image: UploadedImageInfo;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="min-w-0 flex items-center gap-3 rounded-full border border-[#E8E8E3] dark:border-[#303030] bg-white dark:bg-[#202020] p-1.5 pl-2.5 shadow-2xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.dataUri}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover bg-black/10"
      />
      <div
        className="min-w-0 flex-1 flex flex-wrap items-baseline gap-1.5 sm:gap-2"
        title={`${label}: ${image.name} (${image.width}×${image.height})`}
      >
        <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#181818] dark:text-[#F2F2F0]">
          {label}
        </span>
        <span className="text-[11px] sm:text-xs font-mono text-[#8E8E93] dark:text-[#8A8A8A]">
          ({image.width}×{image.height})
        </span>
      </div>
      <button
        type="button"
        onClick={onChange}
        aria-label={`Change ${label.toLowerCase()} image`}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#F4F4F1] dark:bg-[#2B2B2B] px-3 text-xs sm:text-sm text-[#181818] dark:text-[#F2F2F0] hover:bg-[#EAEAE6] dark:hover:bg-[#383838] transition-colors cursor-pointer"
      >
        <RotateCcw className="h-4 w-4 text-[#6F6F6A] dark:text-[#A0A09B]" />
        <span>Change</span>
      </button>
    </div>
  );
}

function AnalysisBenchContent() {
  const searchParams = useSearchParams();
  const { artifacts, activeArtifact } = useWorkspace();
  const { loading, error, fullAnalysis, clearFullAnalysis, executeFullAnalysis } = useAnalysis();

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

  const canRunAnalysis = Boolean(plainImage && (cipherImage || recoveredImage));

  const handleRunAnalysis = useCallback(async () => {
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
  }, [plainImage, cipherImage, recoveredImage, searchParams, executeFullAnalysis]);

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
  }, [searchParams, plainImage, cipherImage, recoveredImage, fullAnalysis, loading, handleRunAnalysis]);

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

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CRYPTOGRAPHIC LABORATORY
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Quantitative Security &amp; Cryptanalysis
          </h1>
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRunAnalysis}
            disabled={loading || !canRunAnalysis}
            className="group h-10 sm:h-11 px-4 text-xs sm:text-sm font-medium rounded-lg border border-[#E8E8E3] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin text-[#2563EB] dark:text-[#5B8CFF] shrink-0" />
                <span>Computing Analysis...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF] fill-current shrink-0" />
                <span>Run Analysis</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {fullAnalysis && plainImage ? (
        <div className={cn(
          "grid grid-cols-1 gap-3",
          cipherImage && recoveredImage ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"
        )}>
          <AnalysisImagePill image={plainImage} label="Original" onChange={() => { clearFullAnalysis(); setPlainImage(null); }} />
          {cipherImage && (
            <AnalysisImagePill image={cipherImage} label="Ciphertext" onChange={() => { clearFullAnalysis(); setCipherImage(null); }} />
          )}
          {recoveredImage && (
            <AnalysisImagePill image={recoveredImage} label="Reconstructed" onChange={() => { clearFullAnalysis(); setRecoveredImage(null); }} />
          )}
        </div>
      ) : (
      /* Full image panels remain available while preparing an analysis. */
      <>
      {/* 3 Upload Panels - Unified Clean Styling Matching Decryption Page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Box 1: Real / Original Image (Required) */}
        <div className="flex flex-col h-[420px] sm:h-[450px]">
          {plainImage ? (
            <div className="h-full rounded-2xl border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#141414] overflow-hidden flex flex-col justify-between shadow-2xs">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2 border-b border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#181818] shrink-0 h-11">
                <div
                  className="flex items-center gap-2 min-w-0 flex-1 mr-3 cursor-default"
                  title={`Original: ${plainImage.name} (${plainImage.width}×${plainImage.height})`}
                >
                  <ImageIcon className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#181818] dark:text-[#F2F2F0]">
                    Original
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono text-[#8E8E93] dark:text-[#8A8A8A]">
                    ({plainImage.width}×{plainImage.height})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlainImage(null)}
                  className="group inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium rounded-lg border border-[#E8E8E3] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] group-hover:-rotate-45 transition-transform duration-200" />
                  <span>Change Image</span>
                </button>
              </div>

              {/* Big Full Size View */}
              <div className="flex-1 w-full p-4 sm:p-5 flex items-center justify-center bg-black/[0.02] dark:bg-black/20 overflow-hidden min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plainImage.dataUri}
                  alt={plainImage.name}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-xs"
                />
              </div>
            </div>
          ) : (
            <div className="h-full [&>div]:h-full">
              <DriveDropzone
                title="Drop original image here"
                description=""
                actionLabel="Browse"
                compact={true}
                titleClassName="text-sm sm:text-base lg:text-[17px] font-semibold whitespace-nowrap"
                onImageUploaded={(img) => setPlainImage(img)}
              />
            </div>
          )}
        </div>

        {/* Box 2: Ciphertext Image (Optional) */}
        <div className="flex flex-col h-[420px] sm:h-[450px]">
          {cipherImage ? (
            <div className="h-full rounded-2xl border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#141414] overflow-hidden flex flex-col justify-between shadow-2xs">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2 border-b border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#181818] shrink-0 h-11">
                <div
                  className="flex items-center gap-2 min-w-0 flex-1 mr-3 cursor-default"
                  title={`Ciphertext: ${cipherImage.name} (${cipherImage.width}×${cipherImage.height})`}
                >
                  <ImageIcon className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#181818] dark:text-[#F2F2F0]">
                    Ciphertext
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono text-[#8E8E93] dark:text-[#8A8A8A]">
                    ({cipherImage.width}×{cipherImage.height})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCipherImage(null)}
                  className="group inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium rounded-lg border border-[#E8E8E3] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] group-hover:-rotate-45 transition-transform duration-200" />
                  <span>Change Ciphertext</span>
                </button>
              </div>

              {/* Big Full Size View */}
              <div className="flex-1 w-full p-4 sm:p-5 flex items-center justify-center bg-black/[0.02] dark:bg-black/20 overflow-hidden min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cipherImage.dataUri}
                  alt={cipherImage.name}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-xs"
                />
              </div>
            </div>
          ) : (
            <div className="h-full [&>div]:h-full">
              <DriveDropzone
                title="Drop ciphertext image here"
                description=""
                actionLabel="Browse"
                compact={true}
                titleClassName="text-sm sm:text-base lg:text-[17px] font-semibold whitespace-nowrap"
                onImageUploaded={(img) => setCipherImage(img)}
              />
            </div>
          )}
        </div>

        {/* Box 3: Reconstructed Image (Optional) */}
        <div className="flex flex-col h-[420px] sm:h-[450px]">
          {recoveredImage ? (
            <div className="h-full rounded-2xl border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#141414] overflow-hidden flex flex-col justify-between shadow-2xs">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2 border-b border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#181818] shrink-0 h-11">
                <div
                  className="flex items-center gap-2 min-w-0 flex-1 mr-3 cursor-default"
                  title={`Reconstructed: ${recoveredImage.name} (${recoveredImage.width}×${recoveredImage.height})`}
                >
                  <ImageIcon className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#181818] dark:text-[#F2F2F0]">
                    Reconstructed
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono text-[#8E8E93] dark:text-[#8A8A8A]">
                    ({recoveredImage.width}×{recoveredImage.height})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecoveredImage(null)}
                  className="group inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium rounded-lg border border-[#E8E8E3] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] group-hover:-rotate-45 transition-transform duration-200" />
                  <span>Change Image</span>
                </button>
              </div>

              {/* Big Full Size View */}
              <div className="flex-1 w-full p-4 sm:p-5 flex items-center justify-center bg-black/[0.02] dark:bg-black/20 overflow-hidden min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={recoveredImage.dataUri}
                  alt={recoveredImage.name}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-xs"
                />
              </div>
            </div>
          ) : (
            <div className="h-full [&>div]:h-full">
              <DriveDropzone
                title="Drop reconstructed image here"
                description=""
                actionLabel="Browse"
                compact={true}
                titleClassName="text-sm sm:text-base lg:text-[17px] font-semibold whitespace-nowrap"
                onImageUploaded={(img) => setRecoveredImage(img)}
              />
            </div>
          )}
        </div>
      </div>
      </>
      )}

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
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      <ShieldCheckIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#181818] dark:text-[#F2F2F0]">Ciphertext security &amp; diffusion</h2>
                      <p className="text-xs text-[#777B75] dark:text-[#A3A7A2]">How effectively the cipher removes patterns and spreads changes</p>
                    </div>
                  </div>
                  <ComparisonTablet rightLabel="CIPHERTEXT" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      <CheckBadgeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#181818] dark:text-[#F2F2F0]">Reconstruction fidelity</h2>
                      <p className="text-xs text-[#777B75] dark:text-[#A3A7A2]">How closely the recovered image matches the original</p>
                    </div>
                  </div>
                  <ComparisonTablet rightLabel="RECONSTRUCTED" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                  <FidelityStatCard
                    label="Structural similarity"
                    value={fullAnalysis.quality.ssim.toFixed(4)}
                    detail="Ideal match: 1.0000"
                  />

                  <FidelityStatCard
                    label="Signal-to-noise ratio"
                    value={
                      typeof fullAnalysis.quality.psnr === "number"
                        ? fullAnalysis.quality.psnr.toFixed(2)
                        : String(fullAnalysis.quality.psnr)
                    }
                    unit="dB"
                    detail="Higher values indicate less distortion"
                  />

                  <FidelityStatCard
                    label="Mean squared error"
                    value={fullAnalysis.quality.mse.toFixed(4)}
                    detail="Ideal match: 0.0000"
                  />

                  <FidelityStatCard
                    label="Recovery quality"
                    value={
                      fullAnalysis.quality.mse === 0
                        ? "Exact"
                        : fullAnalysis.quality.ssim >= 0.99
                        ? "Excellent"
                        : fullAnalysis.quality.ssim >= 0.9
                        ? "Good"
                        : "Degraded"
                    }
                    detail={`Analysis time: ${fullAnalysis.latency_ms} ms`}
                    emphasis={fullAnalysis.quality.ssim >= 0.9}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Respected Visual Comparisons */}
          {plainImage && (
            <Card className="overflow-hidden mt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#1B1B1B]">
                <div className="text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0]">
                  Image visual comparison
                </div>

                {/* Tab Switcher if multiple comparison targets are available */}
                {cipherImage && recoveredImage && (
                  <div className="flex max-w-full flex-wrap items-center gap-1 bg-[#F2F2EE] dark:bg-[#262626] p-1 rounded-lg text-xs">
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
                          ? "bg-white dark:bg-[#343434] text-blue-600 dark:text-blue-400 font-medium shadow-2xs"
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
                          ? "bg-white dark:bg-[#343434] text-blue-600 dark:text-blue-400 font-medium shadow-2xs"
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
                  <SplitCompareCanvas
                    className="border-0 rounded-none"
                    beforeSrc={plainImage.dataUri}
                    afterSrc={cipherImage.dataUri}
                    beforeLabel="PLAINTEXT (ORIGINAL)"
                    afterLabel="CIPHERTEXT (ENCRYPTED)"
                  />
              )}

              {/* View 2: Plain vs Reconstructed */}
              {(activeCompareTab === "recovered" || (!cipherImage && recoveredImage)) && recoveredImage && (
                  <SplitCompareCanvas
                    className="border-0 rounded-none"
                    beforeSrc={plainImage.dataUri}
                    afterSrc={recoveredImage.dataUri}
                    beforeLabel="PLAINTEXT (ORIGINAL)"
                    afterLabel="RECONSTRUCTED (DECRYPTED)"
                  />
              )}

              {/* View 3: Three-Way Simultaneous Comparison */}
              {activeCompareTab === "three_way" && cipherImage && recoveredImage && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 bg-[#FAFAF8] dark:bg-[#101010] p-4 sm:p-5 pt-3.5 sm:pt-4">
                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between px-1">
                      <span className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">Plaintext source</span>
                      <span className="text-xs text-[#777B75] dark:text-[#8E8E93]">Original</span>
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E8E3] dark:border-[#282828] bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={plainImage.dataUri} alt="Plaintext" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between px-1">
                      <span className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">Encrypted ciphertext</span>
                      <span className="text-xs text-[#777B75] dark:text-[#8E8E93]">Cipher</span>
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E8E3] dark:border-[#282828] bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cipherImage.dataUri} alt="Ciphertext" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between px-1">
                      <span className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">Decrypted reconstruction</span>
                      <span className="text-xs text-[#777B75] dark:text-[#8E8E93]">Recovered</span>
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#E8E8E3] dark:border-[#282828] bg-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={recoveredImage.dataUri} alt="Reconstructed" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* SECTION 3: Intensity Histogram & 3D Correlation Stacked */}
          <div className="space-y-6">
            <div className="flex flex-col gap-6">
              {/* Intensity Histogram Card */}
              <HistogramChart
                useCardLayout={true}
                chartHeight="380px"
                className="w-full"
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

              {/* 3D Correlation Disintegration Sphere Card */}
              {cipherImage ? (
                <div className="w-full">
                  <Correlation3DViewer
                    imageSrc={plainImage?.dataUri}
                    ciphertextSrc={cipherImage.dataUri}
                    title="3D Spatial Correlation Disintegration & Magnitude Sphere"
                    className="w-full"
                  />
                </div>
              ) : recoveredImage ? (
                <Card className="w-full flex flex-col justify-center p-8 text-center space-y-3">
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
