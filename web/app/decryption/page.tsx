"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon as ArrowRight,
  ChartBarIcon as BarChart3,
  CommandLineIcon as Binary,
  CheckCircleIcon as CheckCircle2,
  ArrowDownTrayIcon as Download,
  LockClosedIcon as Lock,
  ArrowPathIcon as RotateCcw,
  ShieldExclamationIcon as ShieldAlert,
  ShieldCheckIcon as ShieldCheck,
  ArrowsRightLeftIcon as Shuffle,
  LockOpenIcon as Unlock,
  SignalIcon as Waves,
  SparklesIcon as Sparkles,
  KeyIcon as KeyRound,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { CanvasViewer } from "@/components/image/CanvasViewer";
import { UnifiedWorkbenchCanvas } from "@/components/image/UnifiedWorkbenchCanvas";
import { OpticalBenchDiagram } from "@/components/encryption/OpticalBenchDiagram";
import { DriveDropzone, UploadedImageInfo } from "@/components/upload/DriveDropzone";
import { KeyFileUpload } from "@/components/upload/KeyFileUpload";
import { useWorkspace } from "@/hooks/use-image";
import { useEncryption } from "@/hooks/use-encryption";
import {
  EncryptionAlgorithm,
  getEncryptionSession,
  subscribeToSession,
} from "@/lib/encryption-session";
import { downloadImage, ParsedKeyData } from "@/lib/key-file";
import { runMetrics } from "@/lib/api/analysis";
import { preloadDRPECiphertext, preloadFourierCiphertext, preloadDCTCiphertext, preloadSpectralHybridCiphertext } from "@/lib/api/encryption";
import { cn } from "@/lib/utils/cn";

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
  {
    id: "spectral_hybrid",
    name: "Spectral Hybrid",
    tag: "MULTI-DOMAIN",
    icon: ShieldCheck,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    description: "Applies Wiener deconvolution, conjugate phase mask removal, inverse FFT, and inverse pixel unscramble to recover the original image.",
  },
  {
    id: "feistel",
    name: "Feistel Cipher",
    tag: "BLOCK CIPHER",
    icon: Lock,
    iconColor: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    description: "Runs the Feistel network in reverse with sub-keys applied in reverse order to undo the DCT-based confusion-diffusion rounds.",
  },
];

function DecryptionWorkbenchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addArtifact } = useWorkspace();
  const {
    loading,
    error,
    executeDRPEDecrypt,
    executeFourier,
    executeDCT,
    executeArnoldXOR,
    executeSpectralHybrid,
    executeFeistel,
  } = useEncryption();

  // Operation-Specific Upload State (Independent of centralized workspace image)
  const [uploadedImage, setUploadedImage] = useState<UploadedImageInfo | null>(null);

  // Key JSON loaded state — required before showing algorithm controls
  const [keyLoaded, setKeyLoaded] = useState<{
    algorithm: EncryptionAlgorithm;
    keys: ParsedKeyData;
    fileName: string;
    ciphertextPackage?: { real: string; imag?: string; shape: number[] };
  } | null>(null);

  // Optional session for reference comparison if image originated from the same session
  const [session, setSession] = useState(getEncryptionSession());

  // Current algorithm (syncs with ?algo= url param if present)
  const urlAlgo = searchParams.get("algo") as EncryptionAlgorithm;
  const initialAlgo = (urlAlgo || "drpe") as EncryptionAlgorithm;
  const [selectedAlgo, setSelectedAlgo] = useState<EncryptionAlgorithm>(
    ALGORITHMS.some((a) => a.id === initialAlgo) ? initialAlgo : "drpe"
  );

  // Reference Ground Truth (used for SSIM/PSNR fidelity metric comparison if available)
  const [referenceSrc, setReferenceSrc] = useState<string>(session?.realImageUri || "");

  // Decrypted Image output
  const [decryptedSrc, setDecryptedSrc] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  // Pipeline Stages state
  const [pipelineStages, setPipelineStages] = useState<Record<string, string> | null>(null);
  const [activePipelineStage, setActivePipelineStage] = useState<string>("decrypted");

  // In-flight state to prevent double clicks
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Local error message for decryption failures (supplements hook-level error)
  const [decryptError, setDecryptError] = useState<string | null>(null);

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

  // Decryption Keys per Algorithm (Defaults or from Session)
  // 1. DRPE
  const [drpeSeed1, setDrpeSeed1] = useState<number>(session?.keys.seed1 ?? 1234);
  const [drpeSeed2, setDrpeSeed2] = useState<number>(session?.keys.seed2 ?? 5678);

  // 2. Fourier
  const [fourierSeed, setFourierSeed] = useState<number>(session?.keys.fourierSeed ?? 100);

  // 3. DCT
  const [dctSeed, setDctSeed] = useState<number>(session?.keys.dctSeed ?? 42);

  // 4. Arnold Cat Map
  const [arnoldItr, setArnoldItr] = useState<number>(session?.keys.iterations ?? 10);
  const [arnoldXor, setArnoldXor] = useState<number>(session?.keys.xorValue ?? 170);

  const [scrambleSeed, setScrambleSeed] = useState<number>(session?.keys.scrambleSeed ?? 42);
  const [maskSeed, setMaskSeed] = useState<number>(session?.keys.maskSeed ?? 99);
  const [kernelSeed, setKernelSeed] = useState<number>(session?.keys.kernelSeed ?? 7);
  const [feistelSeed, setFeistelSeed] = useState<number>(session?.keys.feistelSeed ?? 42);
  const [feistelRounds, setFeistelRounds] = useState<number>(session?.keys.feistelRounds ?? 8);

  const [isRandomKeyModalOpen, setIsRandomKeyModalOpen] = useState<boolean>(false);

  const handleGenerateRandomKey = (algo: EncryptionAlgorithm) => {
    setSelectedAlgo(algo);

    let keys: ParsedKeyData = {};
    if (algo === "drpe") {
      const seed1 = Math.floor(Math.random() * 8999) + 1000;
      const seed2 = Math.floor(Math.random() * 8999) + 1000;
      setDrpeSeed1(seed1);
      setDrpeSeed2(seed2);
      keys = { seed1, seed2 };
    } else if (algo === "fourier") {
      const fSeed = Math.floor(Math.random() * 999) + 1;
      setFourierSeed(fSeed);
      keys = { fourierSeed: fSeed };
    } else if (algo === "dct") {
      const dSeed = Math.floor(Math.random() * 999) + 1;
      setDctSeed(dSeed);
      keys = { dctSeed: dSeed };
    } else if (algo === "arnold") {
      const itr = Math.floor(Math.random() * 15) + 1;
      const xor = Math.floor(Math.random() * 255) + 1;
      setArnoldItr(itr);
      setArnoldXor(xor);
      keys = { iterations: itr, xorValue: xor };
    } else if (algo === "spectral_hybrid") {
      const sSeed = Math.floor(Math.random() * 999) + 1;
      const mSeed = Math.floor(Math.random() * 999) + 1;
      const kSeed = Math.floor(Math.random() * 999) + 1;
      setScrambleSeed(sSeed);
      setMaskSeed(mSeed);
      setKernelSeed(kSeed);
      keys = { scrambleSeed: sSeed, maskSeed: mSeed, kernelSeed: kSeed };
    } else if (algo === "feistel") {
      const fSeed = Math.floor(Math.random() * 999) + 1;
      const fRounds = Math.floor(Math.random() * 8) + 4;
      setFeistelSeed(fSeed);
      setFeistelRounds(fRounds);
      keys = { feistelSeed: fSeed, feistelRounds: fRounds };
    }

    handleKeyLoaded({
      algorithm: algo,
      keys,
      fileName: `random_${algo}_key.json`,
    });
    setIsRandomKeyModalOpen(false);
  };

  // Subscribe to encryption session in background for optional reference comparison
  useEffect(() => {
    const sync = (s: ReturnType<typeof getEncryptionSession>) => {
      if (s) {
        setSession(s);
        if (s.realImageUri) setReferenceSrc(s.realImageUri);
      }
    };
    const unsub = subscribeToSession(sync);
    sync(getEncryptionSession());
    return unsub;
  }, []);

  // Sync algorithm if URL param changes
  useEffect(() => {
    const algoParam = searchParams.get("algo") as EncryptionAlgorithm;
    if (algoParam && ALGORITHMS.some((a) => a.id === algoParam)) {
      setSelectedAlgo(algoParam);
    }
  }, [searchParams]);

  // Reset decrypted state if uploaded image changes
  useEffect(() => {
    setDecryptedSrc(null);
    setPipelineStages(null);
    setActivePipelineStage("decrypted");
    setQualityMetrics({ ssim: null, psnr: null, mse: null });
    setDecryptError(null);
    // Also clear key if image changes (different ciphertext = need new key)
    setKeyLoaded(null);

    // Validate if the new image matches the current session
    if (session) {
      if (uploadedImage && uploadedImage.dataUri !== session.cipherImageUri) {
        setReferenceSrc("");
      } else {
        setReferenceSrc(session.realImageUri);
      }
    } else {
      setReferenceSrc("");
    }
  }, [uploadedImage?.dataUri, session]);

  // Trigger DRPE preload whenever BOTH image and key are ready.
  // This covers both orderings: key-first-then-image and image-first-then-key.
  useEffect(() => {
    if (uploadedImage && keyLoaded?.ciphertextPackage) {
      if (keyLoaded.algorithm === "drpe" && keyLoaded.ciphertextPackage.imag) {
        preloadDRPECiphertext(
          keyLoaded.ciphertextPackage.real,
          keyLoaded.ciphertextPackage.imag,
          keyLoaded.ciphertextPackage.shape,
          uploadedImage.dataUri
        ).catch((e) => {
          console.warn("DRPE preload failed:", e);
          setDecryptError(e.message || "Failed to validate ciphertext image against key package.");
        });
      } else if (keyLoaded.algorithm === "fourier" && keyLoaded.ciphertextPackage.imag) {
        preloadFourierCiphertext(
          keyLoaded.ciphertextPackage.real,
          keyLoaded.ciphertextPackage.imag,
          keyLoaded.ciphertextPackage.shape,
          uploadedImage.dataUri
        ).catch((e) => {
          console.warn("Fourier preload failed:", e);
          setDecryptError(e.message || "Failed to validate ciphertext image against key package.");
        });
      } else if (keyLoaded.algorithm === "dct") {
        preloadDCTCiphertext(
          keyLoaded.ciphertextPackage.real,
          keyLoaded.ciphertextPackage.shape,
          uploadedImage.dataUri
        ).catch((e) => {
          console.warn("DCT preload failed:", e);
          setDecryptError(e.message || "Failed to validate ciphertext image against key package.");
        });
      } else if (keyLoaded.algorithm === "spectral_hybrid" && keyLoaded.ciphertextPackage.imag) {
        preloadSpectralHybridCiphertext(
          keyLoaded.ciphertextPackage.real,
          keyLoaded.ciphertextPackage.imag,
          keyLoaded.ciphertextPackage.shape,
          uploadedImage.dataUri
        ).catch((e) => {
          console.warn("Spectral Hybrid preload failed:", e);
          setDecryptError(e.message || "Failed to validate ciphertext image against key package.");
        });
      }
    }
  }, [uploadedImage?.dataUri, keyLoaded]);



  // Core Decryption Execution helper
  const executeDecryptionWithParams = async (
    algo: EncryptionAlgorithm,
    params: {
      seed1?: number;
      seed2?: number;
      fourierSeed?: number;
      dctSeed?: number;
      arnoldItr?: number;
      arnoldXor?: number;
      scrambleSeed?: number;
      maskSeed?: number;
      kernelSeed?: number;
      feistelSeed?: number;
      feistelRounds?: number;
    }
  ) => {
    if (!uploadedImage || isDecrypting) return;

    setIsDecrypting(true);
    setDecryptError(null);
    try {
      let recoveredUri = "";
      let latency = 0;
      let returnedStages: Record<string, string> | undefined = undefined;

      if (algo === "drpe") {
        const s1 = params.seed1 ?? drpeSeed1;
        const s2 = params.seed2 ?? drpeSeed2;
        const res = await executeDRPEDecrypt(
          uploadedImage.dataUri,
          s1,
          s2,
          referenceSrc || undefined
        );
        recoveredUri = res.decrypted_image;
        latency = res.latency_ms;
        returnedStages = res.stages;

        if (res.quality && Object.keys(res.quality).length > 0) {
          setQualityMetrics({
            ssim: res.quality.ssim !== undefined ? Number(res.quality.ssim) : null,
            psnr: res.quality.psnr !== undefined ? res.quality.psnr : null,
            mse: res.quality.mse !== undefined ? Number(res.quality.mse) : null,
          });
        }
      } else if (algo === "fourier") {
        const seed = params.fourierSeed ?? fourierSeed;
        const res = await executeFourier(uploadedImage.dataUri, seed, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
        returnedStages = res.stages;
      } else if (algo === "dct") {
        const seed = params.dctSeed ?? dctSeed;
        const res = await executeDCT(uploadedImage.dataUri, seed, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
        returnedStages = res.stages;
      } else if (algo === "arnold") {
        const itr = params.arnoldItr ?? arnoldItr;
        const xor = params.arnoldXor ?? arnoldXor;
        const res = await executeArnoldXOR(uploadedImage.dataUri, itr, xor, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
        returnedStages = res.stages;
      } else if (algo === "spectral_hybrid") {
        const ss = params.scrambleSeed ?? scrambleSeed;
        const ms = params.maskSeed ?? maskSeed;
        const ks = params.kernelSeed ?? kernelSeed;
        const res = await executeSpectralHybrid(uploadedImage.dataUri, ss, ms, ks, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
        returnedStages = res.stages;
      } else if (algo === "feistel") {
        const s = params.feistelSeed ?? feistelSeed;
        const r = params.feistelRounds ?? feistelRounds;
        const res = await executeFeistel(uploadedImage.dataUri, s, r, "decrypt");
        recoveredUri = res.output_image;
        latency = res.latency_ms;
        returnedStages = res.stages;
      }

      setDecryptedSrc(recoveredUri);
      setLastLatency(latency);
      if (returnedStages) {
        setPipelineStages(returnedStages);
      }
      setActivePipelineStage("decrypted");

      // Calculate comparative metrics if reference ground truth exists
      if (referenceSrc && recoveredUri && (algo !== "drpe" || qualityMetrics.ssim === null)) {
        try {
          const metrics = await runMetrics(referenceSrc, recoveredUri, false);
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
      const msg = err instanceof Error ? err.message : String(err);
      setDecryptError(msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleExecuteDecrypt = () => {
    executeDecryptionWithParams(selectedAlgo, {
      seed1: drpeSeed1,
      seed2: drpeSeed2,
      fourierSeed,
      dctSeed,
      arnoldItr,
      arnoldXor,
      scrambleSeed,
      maskSeed,
      kernelSeed,
      feistelSeed,
      feistelRounds,
    });
  };

  // Handle Algorithm Switch
  const handleAlgorithmChange = (algoId: EncryptionAlgorithm) => {
    setSelectedAlgo(algoId);
    setDecryptedSrc(null);
    setPipelineStages(null);
    setActivePipelineStage("decrypted");
    setQualityMetrics({ ssim: null, psnr: null, mse: null });
    const params = new URLSearchParams(window.location.search);
    params.set("algo", algoId);
    router.replace(`/decryption?${params.toString()}`);
  };

  // Handle Loaded Key File
  const handleKeyLoaded = async (params: {
    algorithm: EncryptionAlgorithm;
    keys: ParsedKeyData;
    fileName: string;
    ciphertextPackage?: { real: string; imag?: string; shape: number[] };
  }) => {
    if (params.algorithm !== selectedAlgo) {
      handleAlgorithmChange(params.algorithm);
    }

    if (params.algorithm === "drpe") {
      if (params.keys.seed1 !== undefined) setDrpeSeed1(params.keys.seed1);
      if (params.keys.seed2 !== undefined) setDrpeSeed2(params.keys.seed2);

      // Warm backend cache from embedded ciphertext package
      if (params.ciphertextPackage && params.ciphertextPackage.imag && uploadedImage) {
        try {
          await preloadDRPECiphertext(
            params.ciphertextPackage.real,
            params.ciphertextPackage.imag,
            params.ciphertextPackage.shape,
            uploadedImage.dataUri
          );
        } catch (e) {
          console.warn("DRPE preload failed:", e);
        }
      }
    } else if (params.algorithm === "fourier") {
      if (params.keys.fourierSeed !== undefined) setFourierSeed(params.keys.fourierSeed);
      
      if (params.ciphertextPackage && params.ciphertextPackage.imag && uploadedImage) {
        try {
          await preloadFourierCiphertext(
            params.ciphertextPackage.real,
            params.ciphertextPackage.imag,
            params.ciphertextPackage.shape,
            uploadedImage.dataUri
          );
        } catch (e) {
          console.warn("Fourier preload failed:", e);
        }
      }
    } else if (params.algorithm === "dct") {
      if (params.keys.dctSeed !== undefined) setDctSeed(params.keys.dctSeed);
      
      if (params.ciphertextPackage && uploadedImage) {
        try {
          await preloadDCTCiphertext(
            params.ciphertextPackage.real,
            params.ciphertextPackage.shape,
            uploadedImage.dataUri
          );
        } catch (e) {
          console.warn("DCT preload failed:", e);
        }
      }
    } else if (params.algorithm === "arnold") {
      if (params.keys.iterations !== undefined) setArnoldItr(params.keys.iterations);
      if (params.keys.xorValue !== undefined) setArnoldXor(params.keys.xorValue);
    } else if (params.algorithm === "spectral_hybrid") {
      if (params.keys.scrambleSeed !== undefined) setScrambleSeed(params.keys.scrambleSeed);
      if (params.keys.maskSeed !== undefined) setMaskSeed(params.keys.maskSeed);
      if (params.keys.kernelSeed !== undefined) setKernelSeed(params.keys.kernelSeed);

      if (params.ciphertextPackage && params.ciphertextPackage.imag && uploadedImage) {
        try {
          await preloadSpectralHybridCiphertext(
            params.ciphertextPackage.real,
            params.ciphertextPackage.imag,
            params.ciphertextPackage.shape,
            uploadedImage.dataUri
          );
        } catch (e) {
          console.warn("Spectral Hybrid preload failed:", e);
        }
      }
    } else if (params.algorithm === "feistel") {
      if (params.keys.feistelSeed !== undefined) setFeistelSeed(params.keys.feistelSeed);
      if (params.keys.feistelRounds !== undefined) setFeistelRounds(params.keys.feistelRounds);
    }

    setKeyLoaded(params);
  };

  // Download recovered image
  const handleDownloadDecrypted = () => {
    if (!decryptedSrc || !uploadedImage) return;
    const baseName = uploadedImage.name.replace(/\.[^/.]+$/, "");
    downloadImage(decryptedSrc, `${baseName}_${selectedAlgo}_decrypted.png`);
  };

  const activeMeta = ALGORITHMS.find((a) => a.id === selectedAlgo) || ALGORITHMS[0];

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
    <div className="space-y-4 max-w-7xl py-1">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CRYPTOGRAPHIC LABORATORY
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Image Decryption Bench
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {uploadedImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setUploadedImage(null); setKeyLoaded(null); }}
              className="text-xs h-8 px-3"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              <span>Change Ciphertext</span>
            </Button>
          )}
        </div>
      </div>

      {/* Empty State: Two-panel upload card — image + key JSON, equal height */}
      {!uploadedImage || !keyLoaded ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">

            {/* Panel 1: Ciphertext Image */}
            <div className="flex flex-col gap-2">
              <div className="text-xs sm:text-sm font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-semibold text-center py-1">
                Step 1 — Ciphertext Image
              </div>
              <div className="flex-1">
                {uploadedImage ? (
                  <div className="h-full rounded-lg border border-[#A7F3D0] dark:border-[#047857]/40 bg-[#ECFDF5] dark:bg-[#064E3B]/20 p-4 flex flex-col items-center justify-center gap-3 min-h-[340px] sm:min-h-[360px]">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-[#A7F3D0] dark:border-[#047857]/40 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedImage.dataUri} alt="cipher" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center space-y-0.5">
                      <div className="text-xs font-semibold text-[#065F46] dark:text-[#6EE7B7] truncate max-w-[180px]">{uploadedImage.name}</div>
                      <div className="text-[10px] text-[#047857] dark:text-[#A7F3D0] font-mono">{uploadedImage.width}×{uploadedImage.height}px · Uploaded</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="text-[11px] text-[#047857] dark:text-[#A7F3D0] hover:underline cursor-pointer font-medium"
                    >
                      Change image
                    </button>
                  </div>
                ) : (
                  <div className="min-h-[340px] sm:min-h-[360px] [&>div]:h-full [&>div]:min-h-[340px] sm:[&>div]:min-h-[360px]">
                    <DriveDropzone
                      title="Drop ciphertext image here"
                      description="PNG · max 25 MB"
                      actionLabel="Browse"
                      compact={true}
                      onImageUploaded={(img) => setUploadedImage(img)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Key JSON */}
            <div className="flex flex-col gap-2">
              <div className="text-xs sm:text-sm font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-semibold text-center py-1">
                Step 2 — Key Package (.json)
              </div>
              <div className="flex-1 flex flex-col justify-center min-h-[340px] sm:min-h-[360px]">
                {keyLoaded ? (
                  <div className="h-full rounded-lg border border-[#D7D7D1] dark:border-[#2E2E2E] bg-[#FAFAF8] dark:bg-[#121212] p-5 flex flex-col items-center justify-center gap-4 transition-all hover:border-[#2563EB] dark:hover:border-[#5B8CFF] min-h-[340px] sm:min-h-[360px]">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0] truncate max-w-[180px]">{keyLoaded.fileName}</div>
                      <div className="text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">{keyLoaded.algorithm.toUpperCase()} · Key loaded</div>
                      {keyLoaded.ciphertextPackage && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ciphertext package embedded
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <KeyFileUpload
                    selectedAlgo={selectedAlgo}
                    onKeyLoaded={handleKeyLoaded}
                    onSwitchAlgorithm={handleAlgorithmChange}
                    dropzoneClassName="h-full min-h-[340px] sm:min-h-[360px] flex flex-col items-center justify-center gap-3 border-2"
                  />
                )}
              </div>
            </div>

          </div>

          {/* Centered Random Key Package Action */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setIsRandomKeyModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-[#E8E8E3] dark:border-[#2E2E2E] text-[#181818] dark:text-[#F2F2F0] hover:border-[#2563EB] dark:hover:border-[#5B8CFF] hover:text-[#2563EB] dark:hover:text-[#5B8CFF] text-xs font-medium shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
            >
              <Sparkles className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF]" />
              <span>Generate Random Key Package</span>
            </button>
          </div>
        </div>
      ) : (
        /* Image Uploaded: Reveal Decryption Workflow Controls */
        <div className="space-y-4 animate-in fade-in duration-300">

          {/* Algorithm Selector Row */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium px-0.5">
              <span>SELECT DECRYPTION ALGORITHM</span>
              {session?.algorithm === selectedAlgo && (
                <span className="text-[#059669] dark:text-[#34D399] font-medium flex items-center gap-1 font-mono text-[11px] normal-case">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Session Match: {selectedAlgo.toUpperCase()}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {ALGORITHMS.map((algo) => {
                const isSelected = selectedAlgo === algo.id;
                const Icon = algo.icon;

                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => handleAlgorithmChange(algo.id)}
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
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Left Column: Pipeline Execution Diagram + Unified Cryptographic Workbench */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              {decryptedSrc ? (
                <div className="space-y-4">
                  {/* Algorithm Decryption Pipeline Architecture Diagram */}
                  <Card className="p-3 border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#161616] shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E3] dark:border-[#242424] mb-2 px-1">
                      <span className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        {activeMeta.name} Decryption Pipeline
                      </span>
                      <span className="text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
                        Interactive Stages
                      </span>
                    </div>
                    <OpticalBenchDiagram
                      mode="decrypt"
                      algorithm={selectedAlgo}
                      activeStage={activePipelineStage}
                      hasExecuted={Boolean(decryptedSrc)}
                      isExecuting={isDecrypting || loading}
                      sourcePreviewSrc={uploadedImage?.dataUri}
                      outputPreviewSrc={decryptedSrc || undefined}
                      stagePreviews={pipelineStages}
                      onSelectStage={(k) => {
                        setActivePipelineStage(k);
                      }}
                    />
                  </Card>

                  {/* Unified Cryptographic Workbench: Multi-Mode Comparison Viewport */}
                  {(() => {
                    const isFinalDecrypted = activePipelineStage === "decrypted";
                    const isCipherInput = activePipelineStage === "ciphertext";
                    const currentStageUri =
                      pipelineStages?.[activePipelineStage] || decryptedSrc || uploadedImage?.dataUri;

                    let stageTitle = `${activeMeta.name.toUpperCase()} RECOVERED PLAINTEXT`;
                    let stageSubtitle = `Decrypted Outcome · Status: Complete · Latency: ${lastLatency ?? 0} ms`;

                    if (isCipherInput) {
                      stageTitle = "CIPHERTEXT (ENCRYPTED INPUT)";
                      stageSubtitle = "Stationary Random Wavefront / Permuted Frequency State";
                    } else if (!isFinalDecrypted && pipelineStages?.[activePipelineStage]) {
                      const stageLabels: Record<string, { title: string; subtitle: string }> = {
                        r2_conj: {
                          title: "DRPE: CONJUGATE FOURIER MASK (R₂*)",
                          subtitle: "Frequency domain phase cancellation wavefront",
                        },
                        fourier_demod: {
                          title: "DRPE: DEMODULATED SPECTRUM (LENS L2)",
                          subtitle: "Inverse optical Fourier transformation step",
                        },
                        r1_conj: {
                          title: "DRPE: CONJUGATE SPATIAL MASK (R₁*)",
                          subtitle: "Spatial domain phase cancellation wavefront",
                        },
                        fft_spectrum: {
                          title: "FOURIER: CIPHER FREQUENCY SPECTRUM |F(u, v)|",
                          subtitle: "2D Fast Fourier Transform log-magnitude of ciphertext",
                        },
                        inverse_perm: {
                          title: "FOURIER: RESTORED SPECTRUM π⁻¹[F(u, v)]",
                          subtitle: "Key-inverted 2D Fourier coefficient distribution",
                        },
                        dct_coeffs: {
                          title: "DCT: CIPHER BASIS COEFFICIENTS",
                          subtitle: "2D Cosine transform basis representation of ciphertext",
                        },
                        xor_invert: {
                          title: "ARNOLD: INVERSE XOR DIFFUSION",
                          subtitle: "Bitwise gray-level XOR inversion state",
                        },
                        inverse_arnold: {
                          title: "ARNOLD: INVERSE TORAL SHEARING",
                          subtitle: "Inverse Cat Map modulo coordinate realignment",
                        },
                      };

                      const info = stageLabels[activePipelineStage];
                      if (info) {
                        stageTitle = info.title;
                        stageSubtitle = info.subtitle;
                      } else {
                        stageTitle = `STAGE: ${activePipelineStage.toUpperCase().replace("_", " ")}`;
                        stageSubtitle = "Intermediate Pipeline State";
                      }
                    }

                    return (
                      <UnifiedWorkbenchCanvas
                        currentSrc={currentStageUri}
                        originalSrc={referenceSrc || uploadedImage?.dataUri}
                        title={stageTitle}
                        subtitle={stageSubtitle}
                        originalLabel={referenceSrc ? "Plaintext (Ground Truth)" : "Ciphertext Input"}
                        currentLabel={
                          isCipherInput
                            ? "Ciphertext"
                            : isFinalDecrypted
                            ? "Decrypted"
                            : activePipelineStage.toUpperCase().replace("_", " ")
                        }
                        defaultMode="split"
                        isLoading={isDecrypting || loading}
                      />
                    );
                  })()}
                </div>
              ) : (
                /* Ready for Decryption View */
                <div>
                  <CanvasViewer
                    imageSrc={uploadedImage?.dataUri || ""}
                    title="CIPHERTEXT INPUT"
                    subtitle={`${uploadedImage.name} · Ready for ${activeMeta.name} decryption`}
                    isLoading={isDecrypting || loading}
                    loadingText={`Decrypting with ${activeMeta.name}...`}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Key Tuning & Telemetry Metrics Sidebar */}
            <div className="w-full lg:w-[310px] xl:w-[320px] shrink-0 space-y-3.5">
              {/* Card 1: Key Tuning & Sensitivity Controls */}
              <Card className="p-3.5 space-y-3 border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#161616] shadow-xs">
                <div className="flex items-center justify-between pb-1">
                  <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                    DECRYPTION KEY CONTROLS
                  </div>
                </div>

                {/* Dynamic Decryption Key Sliders per Algorithm */}
                <div key={selectedAlgo} className="space-y-3 animate-option-switch">
                  {/* 1. DRPE Decrypt Controls */}
                  {selectedAlgo === "drpe" && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        OPTICAL CONJUGATE MASKS
                      </div>
                      <Slider
                        label="Spatial Phase Mask (R₁*)"
                        valueDisplay={drpeSeed1}
                        min={100}
                        max={9999}
                        step={1}
                        value={drpeSeed1}
                        onChange={(e) => setDrpeSeed1(Number(e.target.value))}
                      />
                      <Slider
                        label="Fourier Phase Mask (R₂*)"
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
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        INVERSE FFT PERMUTATION KEY
                      </div>
                      <Slider
                        label="Phase Seed"
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
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        INVERSE DCT PERMUTATION KEY
                      </div>
                      <Slider
                        label="Permutation Seed"
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
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        INVERSE CHAOTIC PARAMETERS
                      </div>
                      <Slider
                        label="Inverse Cat Map Iterations"
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

                  {/* 5. Spectral Hybrid Decrypt Controls */}
                  {selectedAlgo === "spectral_hybrid" && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        INVERSE HYBRID PARAMETERS
                      </div>
                      <Slider
                        label="Scramble Seed"
                        valueDisplay={scrambleSeed}
                        min={1}
                        max={9999}
                        step={1}
                        value={scrambleSeed}
                        onChange={(e) => setScrambleSeed(Number(e.target.value))}
                      />
                      <Slider
                        label="Mask Seed"
                        valueDisplay={maskSeed}
                        min={1}
                        max={9999}
                        step={1}
                        value={maskSeed}
                        onChange={(e) => setMaskSeed(Number(e.target.value))}
                      />
                      <Slider
                        label="Kernel Seed"
                        valueDisplay={kernelSeed}
                        min={1}
                        max={9999}
                        step={1}
                        value={kernelSeed}
                        onChange={(e) => setKernelSeed(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {/* 7. Feistel Cipher Decrypt Controls */}
                  {selectedAlgo === "feistel" && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                        INVERSE NETWORK PARAMETERS
                      </div>
                      <Slider
                        label="Seed"
                        valueDisplay={feistelSeed}
                        min={1}
                        max={9999}
                        step={1}
                        value={feistelSeed}
                        onChange={(e) => setFeistelSeed(Number(e.target.value))}
                      />
                      <Slider
                        label="Rounds"
                        valueDisplay={feistelRounds}
                        min={4}
                        max={16}
                        step={2}
                        value={feistelRounds}
                        onChange={(e) => setFeistelRounds(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {/* Execute Decryption Button */}
                <Button
                  variant="primary"
                  onClick={handleExecuteDecrypt}
                  disabled={isDecrypting || loading || !uploadedImage}
                  className="w-full h-8.5 mt-1 text-xs"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1" />
                  <span>Execute {activeMeta.name} Decryption</span>
                </Button>

                {/* Post-decryption Action Button */}
                {decryptedSrc && (
                  <div className="space-y-1.5 pt-1 border-t border-[#E8E8E3] dark:border-[#242424]">
                    <Button
                      variant="primary"
                      onClick={handleDownloadDecrypted}
                      className="w-full h-7.5 text-xs bg-[#059669] hover:bg-[#047857]"
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      <span>Download Decrypted Image</span>
                    </Button>
                  </div>
                )}

                {(error || decryptError) && (
                  <div className="text-xs text-[#DC2626] font-mono py-1 leading-relaxed">
                    {error && <div>Error: {error}</div>}
                    {decryptError && !error && <div>Error: {decryptError}</div>}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
      {/* Random Key Package Selection Modal */}
      {isRandomKeyModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none"
          onClick={() => setIsRandomKeyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] shadow-2xl overflow-hidden flex flex-col p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#2563EB] dark:text-[#5B8CFF]" />
                <h2 className="text-base font-semibold text-[#181818] dark:text-[#F2F2F0]">
                  Generate Random Key Package
                </h2>
              </div>
              <button
                onClick={() => setIsRandomKeyModalOpen(false)}
                className="p-1 rounded text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#71717A] dark:text-[#8E8E93]">
              Select an encryption method below to auto-generate a cryptographically valid random key package:
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {ALGORITHMS.map((algo) => {
                const Icon = algo.icon;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => handleGenerateRandomKey(algo.id)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#141414] hover:border-[#2563EB] dark:hover:border-[#5B8CFF] hover:bg-white dark:hover:bg-[#1C1C1C] transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", algo.iconBg)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                          {algo.name}
                        </div>
                        <div className="text-[10px] text-[#71717A] dark:text-[#8E8E93] font-mono mt-0.5">
                          {algo.tag}
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 text-[#2563EB] dark:text-[#5B8CFF] text-xs font-medium group-hover:bg-[#2563EB] group-hover:text-white dark:group-hover:bg-[#5B8CFF] dark:group-hover:text-black transition-all">
                      Generate Key →
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
