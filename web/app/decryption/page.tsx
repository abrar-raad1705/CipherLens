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
  const { addArtifact } = useWorkspace();
  const {
    loading,
    error,
    executeDRPEDecrypt,
    executeFourier,
    executeDCT,
    executeArnoldXOR,
  } = useEncryption();

  // Operation-Specific Upload State (Independent of centralized workspace image)
  const [uploadedImage, setUploadedImage] = useState<UploadedImageInfo | null>(null);

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
  }, [uploadedImage?.dataUri]);

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
    }
  ) => {
    if (!uploadedImage || isDecrypting) return;

    setIsDecrypting(true);
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
  const handleKeyLoaded = (params: {
    algorithm: EncryptionAlgorithm;
    keys: ParsedKeyData;
    fileName: string;
  }) => {
    if (params.algorithm !== selectedAlgo) {
      handleAlgorithmChange(params.algorithm);
    }

    if (params.algorithm === "drpe") {
      if (params.keys.seed1 !== undefined) setDrpeSeed1(params.keys.seed1);
      if (params.keys.seed2 !== undefined) setDrpeSeed2(params.keys.seed2);
    } else if (params.algorithm === "fourier") {
      if (params.keys.fourierSeed !== undefined) setFourierSeed(params.keys.fourierSeed);
    } else if (params.algorithm === "dct") {
      if (params.keys.dctSeed !== undefined) setDctSeed(params.keys.dctSeed);
    } else if (params.algorithm === "arnold") {
      if (params.keys.iterations !== undefined) setArnoldItr(params.keys.iterations);
      if (params.keys.xorValue !== undefined) setArnoldXor(params.keys.xorValue);
    }
  };

  // Utility to match correct keys from session
  const handleMatchCorrectKeys = () => {
    if (!session) return;
    if (selectedAlgo === "drpe") {
      const s1 = session.keys.seed1 ?? 1234;
      const s2 = session.keys.seed2 ?? 5678;
      setDrpeSeed1(s1);
      setDrpeSeed2(s2);
      executeDecryptionWithParams("drpe", { seed1: s1, seed2: s2 });
    } else if (selectedAlgo === "fourier") {
      const seed = session.keys.fourierSeed ?? 100;
      setFourierSeed(seed);
      executeDecryptionWithParams("fourier", { fourierSeed: seed });
    } else if (selectedAlgo === "dct") {
      const seed = session.keys.dctSeed ?? 42;
      setDctSeed(seed);
      executeDecryptionWithParams("dct", { dctSeed: seed });
    } else if (selectedAlgo === "arnold") {
      const itr = session.keys.iterations ?? 10;
      const xor = session.keys.xorValue ?? 170;
      setArnoldItr(itr);
      setArnoldXor(xor);
      executeDecryptionWithParams("arnold", { arnoldItr: itr, arnoldXor: xor });
    }
  };

  // Utility to perturb keys by +1 to test sensitivity and auto-execute
  const handlePerturbKeys = () => {
    if (selectedAlgo === "drpe") {
      const s1 = drpeSeed1 + 1;
      setDrpeSeed1(s1);
      executeDecryptionWithParams("drpe", { seed1: s1, seed2: drpeSeed2 });
    } else if (selectedAlgo === "fourier") {
      const seed = fourierSeed + 1;
      setFourierSeed(seed);
      executeDecryptionWithParams("fourier", { fourierSeed: seed });
    } else if (selectedAlgo === "dct") {
      const seed = dctSeed + 1;
      setDctSeed(seed);
      executeDecryptionWithParams("dct", { dctSeed: seed });
    } else if (selectedAlgo === "arnold") {
      const itr = arnoldItr + 1;
      setArnoldItr(itr);
      executeDecryptionWithParams("arnold", { arnoldItr: itr, arnoldXor });
    }
  };

  // Download recovered image
  const handleDownloadDecrypted = () => {
    if (!decryptedSrc || !uploadedImage) return;
    const baseName = uploadedImage.name.replace(/\.[^/.]+$/, "");
    downloadImage(decryptedSrc, `${baseName}_${selectedAlgo}_decrypted.png`);
  };

  // Promote recovered image to workspace
  const handlePromoteToWorkspace = () => {
    if (!decryptedSrc || !uploadedImage) return;
    addArtifact(
      {
        name: `Decrypted [${selectedAlgo.toUpperCase()} ${isExactKeyMatch ? "Exact" : "Perturbed"}]`,
        dataUri: decryptedSrc,
        width: uploadedImage.width || 512,
        height: uploadedImage.height || 512,
        sourceBench: "decryption",
      },
      true
    );
    router.push("/workspace");
  };

  // Promote recovered image to analysis
  const handlePromoteToAnalysis = () => {
    if (!decryptedSrc || !uploadedImage) return;
    addArtifact(
      {
        name: `Decrypted [${selectedAlgo.toUpperCase()}]`,
        dataUri: decryptedSrc,
        width: uploadedImage.width || 512,
        height: uploadedImage.height || 512,
        sourceBench: "decryption",
      },
      true
    );
    router.push("/analysis");
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
              onClick={() => setUploadedImage(null)}
              className="text-xs h-8 px-3"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              <span>Change Ciphertext</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/encryption")}
            className="text-xs h-8 px-3"
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            <span>Go to Encryption</span>
          </Button>

          {decryptedSrc && (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePromoteToWorkspace}
              className="text-xs font-medium h-8 px-3"
            >
              <span>Save to Workspace</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Empty State: Focused Upload Card */}
      {!uploadedImage ? (
        <DriveDropzone
          title="Drop ciphertext image here"
          description="Maximum 25 MB"
          actionLabel="Browse files"
          onImageUploaded={(img) => setUploadedImage(img)}
        />
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  <Badge variant={isExactKeyMatch ? "emerald" : "rose"} dot className="text-[10px] font-mono">
                    {isExactKeyMatch ? "Exact Match" : "Perturbed"}
                  </Badge>
                </div>

                {/* Option to Upload Key .txt File */}
                <div className="space-y-1.5 pb-2 border-b border-[#E8E8E3] dark:border-[#242424]">
                  <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                    IMPORT KEY SPECIFICATION
                  </div>
                  <KeyFileUpload
                    selectedAlgo={selectedAlgo}
                    onKeyLoaded={handleKeyLoaded}
                    onSwitchAlgorithm={handleAlgorithmChange}
                  />
                </div>

                {/* Dynamic Decryption Key Sliders per Algorithm (Manual tuning remains fully intact!) */}
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
                </div>

                {/* Key Sensitivity Preset Action Buttons */}
                <div className="flex gap-2 pt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7.5 text-[11px]"
                    onClick={handleMatchCorrectKeys}
                    disabled={!session}
                    title="Restore exact encryption keys from session"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    <span>Match Keys</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7.5 text-[11px]"
                    onClick={handlePerturbKeys}
                    disabled={!uploadedImage}
                    title="Perturb key parameter by +1 to test avalanche sensitivity"
                  >
                    <Shuffle className="h-3 w-3 mr-1" />
                    <span>Perturb (+1)</span>
                  </Button>
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

                {/* Post-decryption Action Buttons */}
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

                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        variant="secondary"
                        onClick={handlePromoteToAnalysis}
                        className="flex-1 h-7.5 text-xs"
                      >
                        <BarChart3 className="h-3 w-3 mr-1 text-[#6F6F6A] dark:text-[#A0A09B]" />
                        <span>Analyze</span>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handlePromoteToWorkspace}
                        className="flex-1 h-7.5 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        <span>Workspace</span>
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-xs text-[#DC2626] font-mono py-1">
                    Error: {error}
                  </div>
                )}
              </Card>
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
