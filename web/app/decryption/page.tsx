"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Binary,
  CheckCircle2,
  Eye,
  Info,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Unlock,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { CanvasViewer } from "@/components/image/CanvasViewer";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { useWorkspace } from "@/hooks/use-image";
import { useEncryption } from "@/hooks/use-encryption";
import {
  EncryptionAlgorithm,
  getEncryptionSession,
  saveEncryptionSession,
} from "@/lib/encryption-session";
import { runMetrics } from "@/lib/api/analysis";

interface AlgorithmMeta {
  id: EncryptionAlgorithm;
  name: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  description: string;
}

const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "drpe",
    name: "4f DRPE",
    tag: "COHERENT OPTICS",
    icon: ShieldCheck,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description:
      "Performs conjugate phase phase-unwrapping: F⁻¹[F(Cipher) · R₂*] · R₁* to reconstruct coherent wavefront.",
  },
  {
    id: "fourier",
    name: "Fourier Phase",
    tag: "FREQUENCY DOMAIN",
    icon: Waves,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description:
      "Computes inverse keyed permutation of 2D Fourier coefficients and applies inverse 2D Fast Fourier Transform.",
  },
  {
    id: "dct",
    name: "DCT Permutation",
    tag: "COSINE TRANSFORM",
    icon: Binary,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description:
      "Inverts the pseudo-random permutation on DCT frequency basis functions and computes 2D inverse DCT.",
  },
  {
    id: "arnold",
    name: "Arnold Cat Map",
    tag: "CHAOTIC MAP",
    icon: Shuffle,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description:
      "Applies bitwise XOR inversion followed by inverse toral shearing: [x, y]ᵀ = [2 -1; -1 1][x', y']ᵀ mod N.",
  },
];

function DecryptionWorkbenchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const {
    loading,
    error,
    executeDRPEDecrypt,
    executeFourier,
    executeDCT,
    executeArnoldXOR,
  } = useEncryption();

  // Load session from store
  const [session, setSession] = useState(getEncryptionSession());

  // Current algorithm
  const urlAlgo = searchParams.get("algo") as EncryptionAlgorithm;
  const activeAlgoId = (urlAlgo || session?.algorithm || "drpe") as EncryptionAlgorithm;
  const [selectedAlgo, setSelectedAlgo] = useState<EncryptionAlgorithm>(activeAlgoId);

  // Ciphertext and Real Image sources
  const [cipherSrc, setCipherSrc] = useState<string>(session?.cipherImageUri || "");
  const [realSrc, setRealSrc] = useState<string>(
    session?.realImageUri || activeArtifact?.dataUri || ""
  );

  // Decrypted Image output
  const [decryptedSrc, setDecryptedSrc] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  // Quantitative Quality Metrics (SSIM, PSNR, MSE)
  const [qualityMetrics, setQualityMetrics] = useState<{
    ssim: number | null;
    psnr: number | string | null;
    mse: number | null;
  }>({
    ssim: null,
    psnr: null,
    mse: null,
  });

  // Decryption Keys per Algorithm
  // 1. DRPE
  const [drpeSeed1, setDrpeSeed1] = useState<number>(
    session?.keys.seed1 ?? 1234
  );
  const [drpeSeed2, setDrpeSeed2] = useState<number>(
    session?.keys.seed2 ?? 5678
  );

  // 2. Fourier
  const [fourierSeed, setFourierSeed] = useState<number>(
    session?.keys.fourierSeed ?? 100
  );

  // 3. DCT
  const [dctSeed, setDctSeed] = useState<number>(
    session?.keys.dctSeed ?? 42
  );

  // 4. Arnold Cat Map
  const [arnoldItr, setArnoldItr] = useState<number>(
    session?.keys.iterations ?? 10
  );
  const [arnoldXor, setArnoldXor] = useState<number>(
    session?.keys.xorValue ?? 170
  );

  // Deep comparison mode: Real vs Decrypted | Cipher vs Decrypted | Real vs Cipher
  const [deepCompareMode, setDeepCompareMode] = useState<
    "real-vs-decrypted" | "cipher-vs-decrypted" | "real-vs-cipher"
  >("real-vs-decrypted");

  // Load session on initial mount
  useEffect(() => {
    const currentSession = getEncryptionSession();
    if (currentSession) {
      setSession(currentSession);
      if (currentSession.algorithm) {
        setSelectedAlgo(currentSession.algorithm);
      }
      if (currentSession.cipherImageUri) {
        setCipherSrc(currentSession.cipherImageUri);
      }
      if (currentSession.realImageUri) {
        setRealSrc(currentSession.realImageUri);
      }
      if (currentSession.keys) {
        if (currentSession.keys.seed1 !== undefined) setDrpeSeed1(currentSession.keys.seed1);
        if (currentSession.keys.seed2 !== undefined) setDrpeSeed2(currentSession.keys.seed2);
        if (currentSession.keys.fourierSeed !== undefined) setFourierSeed(currentSession.keys.fourierSeed);
        if (currentSession.keys.dctSeed !== undefined) setDctSeed(currentSession.keys.dctSeed);
        if (currentSession.keys.iterations !== undefined) setArnoldItr(currentSession.keys.iterations);
        if (currentSession.keys.xorValue !== undefined) setArnoldXor(currentSession.keys.xorValue);
      }
    }
  }, []);

  // Check if current keys match correct encryption keys
  const isExactKeyMatch = useMemo(() => {
    if (!session || session.algorithm !== selectedAlgo) return true;
    if (selectedAlgo === "drpe") {
      return (
        drpeSeed1 === (session.keys.seed1 ?? 1234) &&
        drpeSeed2 === (session.keys.seed2 ?? 5678)
      );
    }
    if (selectedAlgo === "fourier") {
      return fourierSeed === (session.keys.fourierSeed ?? 100);
    }
    if (selectedAlgo === "dct") {
      return dctSeed === (session.keys.dctSeed ?? 42);
    }
    if (selectedAlgo === "arnold") {
      return (
        arnoldItr === (session.keys.iterations ?? 10) &&
        arnoldXor === (session.keys.xorValue ?? 170)
      );
    }
    return true;
  }, [
    session,
    selectedAlgo,
    drpeSeed1,
    drpeSeed2,
    fourierSeed,
    dctSeed,
    arnoldItr,
    arnoldXor,
  ]);

  // Execute Decryption Function
  const handleExecuteDecrypt = async () => {
    const targetCipher = cipherSrc || activeArtifact?.dataUri;
    if (!targetCipher) return;

    try {
      let recoveredUri = "";
      let latency = 0;

      if (selectedAlgo === "drpe") {
        const res = await executeDRPEDecrypt(
          targetCipher,
          drpeSeed1,
          drpeSeed2,
          realSrc || undefined
        );
        recoveredUri = res.decrypted_image;
        latency = res.latency_ms;

        if (res.quality && Object.keys(res.quality).length > 0) {
          setQualityMetrics({
            ssim: res.quality.ssim !== undefined ? Number(res.quality.ssim) : null,
            psnr: res.quality.psnr !== undefined ? res.quality.psnr : null,
            mse: res.quality.mse !== undefined ? Number(res.quality.mse) : null,
          });
        }
      } else if (selectedAlgo === "fourier") {
        const res = await executeFourier(targetCipher, fourierSeed, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
      } else if (selectedAlgo === "dct") {
        const res = await executeDCT(targetCipher, dctSeed, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
      } else if (selectedAlgo === "arnold") {
        const res = await executeArnoldXOR(targetCipher, arnoldItr, arnoldXor, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
      }

      setDecryptedSrc(recoveredUri);
      setLastLatency(latency);

      // If we have both real image and recovered image, compute metrics for Fourier, DCT, Arnold (or DRPE fallback)
      if (realSrc && recoveredUri && (selectedAlgo !== "drpe" || !qualityMetrics.ssim)) {
        try {
          const metrics = await runMetrics(realSrc, recoveredUri, false);
          setQualityMetrics({
            ssim: Number(metrics.ssim.toFixed(4)),
            psnr: metrics.psnr,
            mse: Number(metrics.mse.toFixed(4)),
          });
        } catch (e) {
          console.warn("Metrics calculation skipped:", e);
        }
      }
    } catch (err) {
      console.error("Decryption failed:", err);
    }
  };

  // Auto-run decryption on first load if ciphertext is available
  useEffect(() => {
    if (cipherSrc && !decryptedSrc) {
      handleExecuteDecrypt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cipherSrc]);

  // Utility to match correct keys
  const handleMatchCorrectKeys = () => {
    if (!session) return;
    if (selectedAlgo === "drpe") {
      setDrpeSeed1(session.keys.seed1 ?? 1234);
      setDrpeSeed2(session.keys.seed2 ?? 5678);
    } else if (selectedAlgo === "fourier") {
      setFourierSeed(session.keys.fourierSeed ?? 100);
    } else if (selectedAlgo === "dct") {
      setDctSeed(session.keys.dctSeed ?? 42);
    } else if (selectedAlgo === "arnold") {
      setArnoldItr(session.keys.iterations ?? 10);
      setArnoldXor(session.keys.xorValue ?? 170);
    }
  };

  // Utility to perturb keys by +1 to test sensitivity
  const handlePerturbKeys = () => {
    if (selectedAlgo === "drpe") {
      setDrpeSeed1((s) => s + 1);
    } else if (selectedAlgo === "fourier") {
      setFourierSeed((s) => s + 1);
    } else if (selectedAlgo === "dct") {
      setDctSeed((s) => s + 1);
    } else if (selectedAlgo === "arnold") {
      setArnoldItr((i) => i + 1);
    }
  };

  // Promote recovered image to workspace
  const handlePromoteToWorkspace = () => {
    if (!decryptedSrc) return;
    addArtifact(
      {
        name: `Decrypted [${selectedAlgo.toUpperCase()} ${isExactKeyMatch ? "Exact" : "Perturbed"}]`,
        dataUri: decryptedSrc,
        width: activeArtifact?.width || 512,
        height: activeArtifact?.height || 512,
        sourceBench: "encryption",
      },
      true
    );
    router.push("/workspace");
  };

  const activeMeta = ALGORITHMS.find((a) => a.id === selectedAlgo) || ALGORITHMS[0];
  const ActiveIcon = activeMeta.icon;

  // Format PSNR cleanly
  const formatPsnr = (psnr: number | string | null | undefined): string => {
    if (psnr === null || psnr === undefined) return "—";
    if (typeof psnr === "number") {
      return Number.isFinite(psnr) ? `${psnr.toFixed(2)} dB` : "∞ (Lossless)";
    }
    if (typeof psnr === "string") {
      if (psnr.toLowerCase().includes("inf")) return "∞ (Lossless)";
      const n = Number(psnr);
      return !Number.isNaN(n) && Number.isFinite(n) ? `${n.toFixed(2)} dB` : psnr;
    }
    return "—";
  };

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#E8E8E3] dark:border-[#292929] pb-4">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CRYPTOGRAPHIC VERIFICATION
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Image Decryption & Reconstruction Bench
          </h1>
          <p className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-1">
            Auto-configured with matching algorithm and phase keys. Change keys to test cryptographic avalanche effect.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/encryption")}
            className="text-xs"
          >
            <Lock className="h-3.5 w-3.5 mr-1" />
            <span>Back to Encryption</span>
          </Button>

          {decryptedSrc && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePromoteToWorkspace}
              className="text-xs font-medium"
            >
              <span>Save to Workspace</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Algorithm Selector Row: Minimal, Instrument-Grade Cryptographic Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium px-0.5">
          <span>SELECT DECRYPTION ALGORITHM</span>
          {session?.algorithm === selectedAlgo && (
            <span className="text-[#059669] dark:text-[#34D399] font-medium flex items-center gap-1 font-mono text-[11px] normal-case">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Auto-selected</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {ALGORITHMS.map((algo) => {
            const isSelected = selectedAlgo === algo.id;
            const Icon = algo.icon;

            return (
              <button
                key={algo.id}
                type="button"
                onClick={() => {
                  setSelectedAlgo(algo.id);
                  setDecryptedSrc(null);
                  setQualityMetrics({ ssim: null, psnr: null, mse: null });
                  const params = new URLSearchParams(window.location.search);
                  params.set("algo", algo.id);
                  router.replace(`/decryption?${params.toString()}`);
                }}
                className={`group text-left p-3.5 rounded-md border transition-all cursor-pointer select-none ${
                  isSelected
                    ? "border-[#2563EB] dark:border-[#5B8CFF] bg-[#2563EB]/[0.03] dark:bg-[#5B8CFF]/[0.04]"
                    : "border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#141414] hover:border-[#D0D0CA] dark:hover:border-[#383838]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? algo.iconBg
                        : "bg-black/[0.03] dark:bg-white/[0.04] text-[#6F6F6A] dark:text-[#A0A09B] group-hover:" + algo.iconColor
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-base font-medium text-[#181818] dark:text-[#F2F2F0] leading-snug truncate">
                      {algo.name}
                    </div>
                    <div className="font-mono text-[11px] tracking-wider uppercase text-[#999993] dark:text-[#6A6A6A] truncate">
                      {algo.tag}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Execution Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Comparisons (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: TRI-VIEW COMPARISON (REAL, CIPHER, DECRYPTED) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-wider text-[#181818] dark:text-[#F2F2F0] font-medium uppercase">
                  TRI-VIEW STATE INSPECTION
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  3-Way Values
                </Badge>
              </div>
              <span className="text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                Real Plaintext · Cipher State · Decrypted Output
              </span>
            </div>

            {/* 3-Column Inspection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Real Image */}
              <div className="rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#121212] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF] shrink-0" />
                    <span className="text-xs font-mono font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                      1. REAL (PLAINTEXT)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#999993] dark:text-[#6A6A6A]">
                    Ground Truth
                  </span>
                </div>
                <div className="p-3 bg-[#FAFAF8] dark:bg-[#101010] flex items-center justify-center min-h-[190px]">
                  {realSrc ? (
                    <img
                      src={realSrc}
                      alt="Real Plaintext"
                      className="max-h-[180px] max-w-full object-contain rounded border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]"
                    />
                  ) : (
                    <span className="text-xs font-mono text-[#999993]">No image</span>
                  )}
                </div>
                <div className="px-3 py-1.5 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B] truncate">
                  {session?.realImageName || activeArtifact?.name || "Target Image"}
                </div>
              </div>

              {/* 2. Cipher Image */}
              <div className="rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#121212] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#8B5CF6] dark:bg-[#A78BFA] shrink-0" />
                    <span className="text-xs font-mono font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                      2. CIPHER (ENCRYPTED)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#999993] dark:text-[#6A6A6A]">
                    Stationary Noise
                  </span>
                </div>
                <div className="p-3 bg-[#FAFAF8] dark:bg-[#101010] flex items-center justify-center min-h-[190px]">
                  {cipherSrc ? (
                    <img
                      src={cipherSrc}
                      alt="Ciphertext"
                      className="max-h-[180px] max-w-full object-contain rounded border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]"
                    />
                  ) : (
                    <span className="text-xs font-mono text-[#999993]">No ciphertext</span>
                  )}
                </div>
                <div className="px-3 py-1.5 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B] truncate">
                  Algorithm: {activeMeta.name}
                </div>
              </div>

              {/* 3. Decrypted Image */}
              <div className="rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#121212] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isExactKeyMatch
                          ? "bg-[#059669] dark:text-[#34D399]"
                          : "bg-[#DC2626] dark:text-[#F87171]"
                      }`}
                    />
                    <span className="text-xs font-mono font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                      3. DECRYPTED (RECOVERED)
                    </span>
                  </div>
                  <Badge
                    variant={isExactKeyMatch ? "emerald" : "rose"}
                    className="text-[9px] font-mono px-1 py-0 uppercase"
                  >
                    {isExactKeyMatch ? "Exact" : "Perturbed"}
                  </Badge>
                </div>
                <div className="p-3 bg-[#FAFAF8] dark:bg-[#101010] flex items-center justify-center min-h-[190px]">
                  {decryptedSrc ? (
                    <img
                      src={decryptedSrc}
                      alt="Decrypted Output"
                      className="max-h-[180px] max-w-full object-contain rounded border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]"
                    />
                  ) : (
                    <span className="text-xs font-mono text-[#999993]">
                      No decrypted output
                    </span>
                  )}
                </div>
                <div className="px-3 py-1.5 border-t border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-[11px] font-mono text-[#6F6F6A] dark:text-[#A0A09B] truncate">
                  Fidelity: {qualityMetrics.ssim !== null ? `SSIM ${qualityMetrics.ssim.toFixed(4)}` : "Pending"}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DEEP DUAL COMPARISON (SLIDER, DIFFERENCE, SIDE-BY-SIDE) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E8E3] dark:border-[#292929] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tracking-wider text-[#181818] dark:text-[#F2F2F0] font-medium uppercase">
                  DEEP RECONSTRUCTION COMPARISON
                </span>
                <span className="text-xs text-[#999993]">·</span>
                <span className="text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                  Interactive Slider
                </span>
              </div>

              {/* Mode Selector between Real vs Decrypted, Cipher vs Decrypted, Real vs Cipher */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setDeepCompareMode("real-vs-decrypted")}
                  className={`cursor-pointer transition-colors pb-1 -mb-2 border-b-2 font-medium ${
                    deepCompareMode === "real-vs-decrypted"
                      ? "text-[#2563EB] dark:text-[#5B8CFF] border-[#2563EB] dark:border-[#5B8CFF]"
                      : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] border-transparent"
                  }`}
                >
                  Real vs Decrypted
                </button>
                <button
                  type="button"
                  onClick={() => setDeepCompareMode("cipher-vs-decrypted")}
                  className={`cursor-pointer transition-colors pb-1 -mb-2 border-b-2 font-medium ${
                    deepCompareMode === "cipher-vs-decrypted"
                      ? "text-[#2563EB] dark:text-[#5B8CFF] border-[#2563EB] dark:border-[#5B8CFF]"
                      : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] border-transparent"
                  }`}
                >
                  Cipher vs Decrypted
                </button>
                <button
                  type="button"
                  onClick={() => setDeepCompareMode("real-vs-cipher")}
                  className={`cursor-pointer transition-colors pb-1 -mb-2 border-b-2 font-medium ${
                    deepCompareMode === "real-vs-cipher"
                      ? "text-[#2563EB] dark:text-[#5B8CFF] border-[#2563EB] dark:border-[#5B8CFF]"
                      : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] border-transparent"
                  }`}
                >
                  Real vs Cipher
                </button>
              </div>
            </div>

            {/* Split Compare Canvas */}
            {deepCompareMode === "real-vs-decrypted" && (
              <SplitCompareCanvas
                beforeSrc={realSrc}
                afterSrc={decryptedSrc || realSrc}
                beforeLabel="REAL (PLAINTEXT)"
                afterLabel={isExactKeyMatch ? "DECRYPTED (EXACT KEY)" : "DECRYPTED (PERTURBED)"}
              />
            )}

            {deepCompareMode === "cipher-vs-decrypted" && (
              <SplitCompareCanvas
                beforeSrc={cipherSrc}
                afterSrc={decryptedSrc || cipherSrc}
                beforeLabel="CIPHER (ENCRYPTED)"
                afterLabel={isExactKeyMatch ? "DECRYPTED (RECOVERED)" : "DECRYPTED (PERTURBED)"}
              />
            )}

            {deepCompareMode === "real-vs-cipher" && (
              <SplitCompareCanvas
                beforeSrc={realSrc}
                afterSrc={cipherSrc || realSrc}
                beforeLabel="REAL (PLAINTEXT)"
                afterLabel="CIPHER (ENCRYPTED)"
              />
            )}
          </div>

          {/* SECTION 3: RECONSTRUCTION VERIFICATION TELEMETRY HUD */}
          <div className="rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                QUANTITATIVE RECONSTRUCTION TELEMETRY
              </div>
              <Badge variant={isExactKeyMatch ? "emerald" : "rose"} dot>
                {isExactKeyMatch ? "Exact Key Recovery" : "Zero Recovery (Diffused)"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#999993] dark:text-[#6A6A6A]">
                  SSIM Fidelity
                </div>
                <div
                  className={`font-mono text-sm font-medium mt-0.5 ${
                    isExactKeyMatch
                      ? "text-[#059669] dark:text-[#34D399]"
                      : "text-[#DC2626] dark:text-[#F87171]"
                  }`}
                >
                  {qualityMetrics.ssim !== null ? qualityMetrics.ssim.toFixed(4) : "—"}
                </div>
                <div className="text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  {isExactKeyMatch ? "1.0000 = Lossless" : "Near 0.00 = Scrambled"}
                </div>
              </div>

              <div className="rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#999993] dark:text-[#6A6A6A]">
                  PSNR Quality
                </div>
                <div
                  className={`font-mono text-sm font-medium mt-0.5 ${
                    isExactKeyMatch
                      ? "text-[#059669] dark:text-[#34D399]"
                      : "text-[#DC2626] dark:text-[#F87171]"
                  }`}
                >
                  {formatPsnr(qualityMetrics.psnr)}
                </div>
                <div className="text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  {isExactKeyMatch ? "∞ dB = Zero distortion" : "< 15 dB = White noise"}
                </div>
              </div>

              <div className="rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#999993] dark:text-[#6A6A6A]">
                  MSE Error
                </div>
                <div className="font-mono text-sm font-medium text-[#181818] dark:text-[#F2F2F0] mt-0.5">
                  {qualityMetrics.mse !== null ? qualityMetrics.mse.toFixed(4) : "—"}
                </div>
                <div className="text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  Mean squared difference
                </div>
              </div>

              <div className="rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#999993] dark:text-[#6A6A6A]">
                  Inversion Latency
                </div>
                <div className="font-mono text-sm font-medium text-[#181818] dark:text-[#F2F2F0] mt-0.5">
                  {lastLatency !== null ? `${lastLatency} ms` : "—"}
                </div>
                <div className="text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  Algorithm compute time
                </div>
              </div>
            </div>

            {/* Explanatory callout */}
            <div
              className={`p-3 rounded-md border text-xs leading-relaxed ${
                isExactKeyMatch
                  ? "bg-[#ECFDF5] dark:bg-[#064E3B]/20 border-[#A7F3D0] dark:border-[#047857]/40 text-[#065F46] dark:text-[#6EE7B7]"
                  : "bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 border-[#FECACA] dark:border-[#991B1B]/40 text-[#991B1B] dark:text-[#FCA5A5]"
              }`}
            >
              {isExactKeyMatch ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Lossless Recovery Verified:</strong> The decryption keys exactly match the parameters used during encryption. Optical and transform phase conjugation inverted the cryptosystem back to the pristine plaintext image.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Cryptographic Avalanche Active:</strong> The decryption key is perturbed from the original encryption key. Even a 1-unit difference produces stationary random noise, demonstrating strong resistance against key-guessing attacks.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Key Tuning & Sensitivity Controls (4 cols on desktop) */}
        <Card className="lg:col-span-4 p-5 space-y-4 border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717]">
          <div className="flex items-center justify-between pb-1">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              KEY TUNING & SENSITIVITY
            </div>
            <Badge variant={isExactKeyMatch ? "emerald" : "rose"} dot>
              {isExactKeyMatch ? "Exact Match" : "Perturbed"}
            </Badge>
          </div>

          {/* Dynamic Decryption Key Sliders per Algorithm */}
          <div key={selectedAlgo} className="space-y-4 animate-option-switch">
            {/* 1. DRPE Decrypt Controls */}
            {selectedAlgo === "drpe" && (
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  OPTICAL PHASE MASKS
                </div>
                <Slider
                  label="Decrypt Seed 1 (R₁*)"
                  valueDisplay={drpeSeed1}
                  min={100}
                  max={9999}
                  step={1}
                  value={drpeSeed1}
                  onChange={(e) => setDrpeSeed1(Number(e.target.value))}
                />
                <Slider
                  label="Decrypt Seed 2 (R₂*)"
                  valueDisplay={drpeSeed2}
                  min={100}
                  max={9999}
                  step={1}
                  value={drpeSeed2}
                  onChange={(e) => setDrpeSeed2(Number(e.target.value))}
                />
              </div>
            )}

            {/* 2. Fourier Decrypt Controls */}
            {selectedAlgo === "fourier" && (
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  INVERSE FFT PERMUTATION KEY
                </div>
                <Slider
                  label="Decrypt Seed"
                  valueDisplay={fourierSeed}
                  min={1}
                  max={9999}
                  step={1}
                  value={fourierSeed}
                  onChange={(e) => setFourierSeed(Number(e.target.value))}
                />
              </div>
            )}

            {/* 3. DCT Decrypt Controls */}
            {selectedAlgo === "dct" && (
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  INVERSE DCT PERMUTATION KEY
                </div>
                <Slider
                  label="Decrypt Seed"
                  valueDisplay={dctSeed}
                  min={1}
                  max={9999}
                  step={1}
                  value={dctSeed}
                  onChange={(e) => setDctSeed(Number(e.target.value))}
                />
              </div>
            )}

            {/* 4. Arnold Cat Map Decrypt Controls */}
            {selectedAlgo === "arnold" && (
              <div className="space-y-4">
                <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  INVERSE CHAOTIC PARAMETERS
                </div>
                <Slider
                  label="Inverse Iterations"
                  valueDisplay={arnoldItr}
                  min={1}
                  max={50}
                  step={1}
                  value={arnoldItr}
                  onChange={(e) => setArnoldItr(Number(e.target.value))}
                />
                <Slider
                  label="Inverse XOR Mask"
                  valueDisplay={`0x${arnoldXor.toString(16).toUpperCase()} (${arnoldXor})`}
                  min={0}
                  max={255}
                  step={1}
                  value={arnoldXor}
                  onChange={(e) => setArnoldXor(Number(e.target.value))}
                />
              </div>
            )}

            {/* Key Sensitivity Preset Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleMatchCorrectKeys}
                disabled={!session}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span>Match Keys</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={handlePerturbKeys}
                disabled={!cipherSrc}
                title="Perturb key seed by +1"
              >
                <span>Perturb (+1)</span>
              </Button>
            </div>

            {/* Execute Decryption Button */}
            <Button
              variant="primary"
              onClick={handleExecuteDecrypt}
              disabled={loading || !cipherSrc}
              className="w-full h-9 mt-1"
            >
              <Unlock className="h-3.5 w-3.5 mr-1" />
              <span>Execute Decryption</span>
            </Button>
          </div>

          {/* Cipher Source Selection */}
          <div className="space-y-3 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              INPUT CIPHERTEXT SOURCE
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => router.push("/encryption")}
                className="text-[11px] flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                <span>Encrypt New Image</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-[#DC2626] font-mono py-1">
              Error: {error}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function DecryptionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading decryption bench...</div>}>
      <DecryptionWorkbenchContent />
    </Suspense>
  );
}
