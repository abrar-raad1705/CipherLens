"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  Key,
  Lock,
  Play,
  Shield,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { CanvasViewer } from "@/components/image/CanvasViewer";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { OpticalBenchDiagram } from "@/components/encryption/OpticalBenchDiagram";
import { useWorkspace } from "@/hooks/use-image";
import { useEncryption } from "@/hooks/use-encryption";
import { formatMs } from "@/lib/utils/format";

export default function DRPEBenchPage() {
  const router = useRouter();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const {
    loading,
    error,
    drpeEncryptResult,
    drpeDecryptResult,
    transformResult,
    executeDRPEEncrypt,
    executeDRPEDecrypt,
    executeFourier,
    executeDCT,
    executeArnoldXOR,
  } = useEncryption();

  const [activeTab, setActiveTab] = useState<"drpe" | "fourier" | "dct" | "arnold">("drpe");
  const [activeStageKey, setActiveStageKey] = useState<string>("ciphertext");

  // DRPE Seeds
  const [seed1, setSeed1] = useState<number>(1234);
  const [seed2, setSeed2] = useState<number>(5678);
  const [decryptSeed1, setDecryptSeed1] = useState<number>(1234);
  const [decryptSeed2, setDecryptSeed2] = useState<number>(5678);

  // Transform parameters
  const [singleSeed, setSingleSeed] = useState<number>(42);
  const [arnoldItr, setArnoldItr] = useState<number>(10);

  const handleEncryptDRPE = async () => {
    if (!activeArtifact) return;
    try {
      await executeDRPEEncrypt(activeArtifact.dataUri, seed1, seed2);
      setActiveStageKey("ciphertext");
      setDecryptSeed1(seed1);
      setDecryptSeed2(seed2);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecryptDRPE = async () => {
    if (!drpeEncryptResult || !activeArtifact) return;
    try {
      await executeDRPEDecrypt(
        drpeEncryptResult.ciphertext,
        decryptSeed1,
        decryptSeed2,
        activeArtifact.dataUri
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleTransform = async (
    type: "fourier" | "dct" | "arnold",
    action: "encrypt" | "decrypt"
  ) => {
    if (!activeArtifact) return;
    try {
      if (type === "fourier") await executeFourier(activeArtifact.dataUri, singleSeed, action);
      else if (type === "dct") await executeDCT(activeArtifact.dataUri, singleSeed, action);
      else if (type === "arnold") await executeArnoldXOR(activeArtifact.dataUri, arnoldItr, 170, action);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromoteToAnalysis = (targetUri: string, label: string) => {
    if (!activeArtifact) return;
    addArtifact({
      name: `${activeArtifact.name} [${label}]`,
      dataUri: targetUri,
      width: activeArtifact.width,
      height: activeArtifact.height,
      sourceBench: "encryption",
    });
    router.push("/analysis");
  };

  const stageDisplayMap: Record<string, { title: string; subtitle: string; hint: string }> = {
    original: {
      title: "STAGE 1: INPUT OBJECT f(x, y)",
      subtitle: "Spatial Object Plane (focal length f before Lens 1)",
      hint: "The unencrypted input image amplitude distribution.",
    },
    r1_phase: {
      title: "STAGE 2: SPATIAL PHASE MASK R1(x, y)",
      subtitle: "Uniform Phase exp[i · 2π · R1(x, y)]",
      hint: "Whitens the image spatially and spreads optical energy across the frequency domain.",
    },
    fourier_spectrum: {
      title: "STAGE 3: FOURIER SPECTRUM |F(u, v)|",
      subtitle: "Optical Fourier Transform computed by Lens 1",
      hint: "Logarithmic optical power spectrum formed at the speed of light at the focal plane.",
    },
    r2_phase: {
      title: "STAGE 4: FOURIER PHASE MASK R2(u, v)",
      subtitle: "Frequency Modulation exp[i · 2π · R2(u, v)]",
      hint: "Scrambles spatial frequency coefficients to randomize the output wavefront.",
    },
    ciphertext: {
      title: "STAGE 5: COMPLEX CIPHERTEXT C(x, y)",
      subtitle: "Stationary White Noise (Lens 2 Output Plane)",
      hint: "Final stationary noise field with zero adjacent pixel correlation and maximum entropy.",
    },
  };

  const isExactKeyMatch = decryptSeed1 === seed1 && decryptSeed2 === seed2;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Bench Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#EDEDEB] dark:border-[#2E2E2E] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="signal">BENCH 03</Badge>
            <span className="text-xs text-[#787774] dark:text-[#9B9B9B]">
              OPTICAL CRYPTOSYSTEMS &amp; TRANSFORMS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E5E3] mt-1">
            4f Double Random Phase Encoding (DRPE)
          </h1>
          <p className="text-xs text-[#787774] dark:text-[#9B9B9B] mt-0.5">
            Simulate coherent optical wave propagation through a 4f system with dual random phase masks. Test key sensitivity against single-key perturbations.
          </p>
        </div>

        {drpeEncryptResult && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                handlePromoteToAnalysis(drpeEncryptResult.ciphertext, "DRPE Ciphertext")
              }
            >
              <span>Promote Ciphertext to Bench 04 (Analysis)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Algorithm Tabs */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as "drpe" | "fourier" | "dct" | "arnold")}
        items={[
          {
            id: "drpe",
            label: "4f DRPE Coherent Optics",
            icon: Shield,
            badge: "PRIMARY",
          },
          { id: "fourier", label: "Fourier Phase Transform" },
          { id: "dct", label: "DCT Permutation" },
          { id: "arnold", label: "Arnold Cat Map Chaos" },
        ]}
      />

      {/* DRPE COHERENT OPTICS BENCH */}
      {activeTab === "drpe" && (
        <div className="space-y-6">
          {/* Interactive 4f Optical System Diagram */}
          <OpticalBenchDiagram
            activeStage={activeStageKey}
            onSelectStage={(k) => {
              if (drpeEncryptResult) {
                setActiveStageKey(k);
              }
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Key & Execution Controls (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* 1. Encryption Key Card */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Lock className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                    <span>Phase Mask Keys (Encryption)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Slider
                      label="Spatial Mask Seed 1 (R1)"
                      hint="Input plane"
                      valueDisplay={seed1}
                      min={100}
                      max={9999}
                      step={1}
                      value={seed1}
                      onChange={(e) => setSeed1(Number(e.target.value))}
                    />
                    <Slider
                      label="Fourier Mask Seed 2 (R2)"
                      hint="Frequency plane"
                      valueDisplay={seed2}
                      min={100}
                      max={9999}
                      step={1}
                      value={seed2}
                      onChange={(e) => setSeed2(Number(e.target.value))}
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleEncryptDRPE}
                    disabled={loading || !activeArtifact}
                    className="w-full h-9"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>
                      {loading ? "Simulating Light Wavefront..." : "Execute 4f DRPE Encryption"}
                    </span>
                  </Button>

                  {error && (
                    <div className="p-2.5 rounded-md bg-[#FFE2DD] dark:bg-[#522525] text-[#5D1715] dark:text-[#FF7369] text-xs">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Decryption & Keyspace Sensitivity Card */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Unlock className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                    <span>Decryption &amp; Key Sensitivity Test</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                    Test optical key sensitivity. In a secure system, perturbing a seed by just <span className="font-mono text-[#37352F] dark:text-white font-medium">+1</span> yields complete white noise.
                  </p>

                  <div className="space-y-3">
                    <Slider
                      label="Decryption Seed 1"
                      valueDisplay={decryptSeed1}
                      min={100}
                      max={9999}
                      step={1}
                      value={decryptSeed1}
                      onChange={(e) => setDecryptSeed1(Number(e.target.value))}
                    />
                    <Slider
                      label="Decryption Seed 2"
                      valueDisplay={decryptSeed2}
                      min={100}
                      max={9999}
                      step={1}
                      value={decryptSeed2}
                      onChange={(e) => setDecryptSeed2(Number(e.target.value))}
                    />
                  </div>

                  {/* Sensitivity Test Triggers */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => {
                        setDecryptSeed1(seed1);
                        setDecryptSeed2(seed2);
                      }}
                    >
                      <span>Match Keys</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs text-[#D9730D] dark:text-[#FFAB5E]"
                      onClick={() => {
                        setDecryptSeed1(seed1 + 1);
                        setDecryptSeed2(seed2);
                      }}
                    >
                      <span>Perturb Seed (+1)</span>
                    </Button>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={handleDecryptDRPE}
                    disabled={loading || !drpeEncryptResult}
                    className="w-full h-9"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Attempt Optical Decryption</span>
                  </Button>

                  {/* Decryption Metric HUD */}
                  {drpeDecryptResult && drpeDecryptResult.quality && (
                    <div className="p-3 rounded-md bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#787774] dark:text-[#9B9B9B]">Verdict:</span>
                        {isExactKeyMatch ? (
                          <Badge variant="emerald">Exact Recovery</Badge>
                        ) : (
                          <Badge variant="rose">Zero Recovery (Noise)</Badge>
                        )}
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#787774] dark:text-[#9B9B9B]">SSIM Fidelity:</span>
                        <span
                          className={`font-mono font-medium ${
                            (drpeDecryptResult.quality.ssim || 0) > 0.95
                              ? "text-[#0F7B6C] dark:text-[#4DAB9A]"
                              : "text-[#EB5757] dark:text-[#FF7369]"
                          }`}
                        >
                          {drpeDecryptResult.quality.ssim?.toFixed(4) || "0.0000"}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#787774] dark:text-[#9B9B9B]">PSNR:</span>
                        <span className="text-[#37352F] dark:text-[#E6E5E3] font-mono">
                          {typeof drpeDecryptResult.quality.psnr === "number"
                            ? `${drpeDecryptResult.quality.psnr.toFixed(2)} dB`
                            : drpeDecryptResult.quality.psnr || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Stage Visualizer & Decrypted Result (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {drpeEncryptResult ? (
                <div className="space-y-4">
                  {/* Stage navigation pill bar */}
                  <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E]">
                    {Object.keys(drpeEncryptResult.stages).map((st) => (
                      <button
                        key={st}
                        onClick={() => setActiveStageKey(st)}
                        className={`px-3 py-1 text-xs rounded capitalize transition-colors cursor-pointer ${
                          activeStageKey === st
                            ? "bg-white dark:bg-[#333333] text-[#37352F] dark:text-white font-medium shadow-xs"
                            : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-white"
                        }`}
                      >
                        {st.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  {/* Stage Canvas Viewer */}
                  <CanvasViewer
                    imageSrc={
                      drpeEncryptResult.stages[
                        activeStageKey as keyof typeof drpeEncryptResult.stages
                      ]
                    }
                    title={stageDisplayMap[activeStageKey]?.title || activeStageKey}
                    subtitle={stageDisplayMap[activeStageKey]?.subtitle}
                  />

                  {/* Decrypted Recovered Canvas Split Compare */}
                  {drpeDecryptResult && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-[#37352F] dark:text-[#E6E5E3] px-1 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                          <span>Decrypted Reconstruction Comparison</span>
                        </div>
                      </div>
                      <SplitCompareCanvas
                        beforeSrc={activeArtifact?.dataUri || ""}
                        afterSrc={drpeDecryptResult.decrypted_image}
                        beforeLabel="Original Target"
                        afterLabel={isExactKeyMatch ? "Decrypted (Matched)" : "Decrypted (Wrong Key)"}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[440px] flex flex-col items-center justify-center rounded-lg bg-[#FAFAF9] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] text-xs gap-3 p-6 text-center">
                  <div className="p-3 rounded-full bg-white dark:bg-[#282828] border border-[#EDEDEB] dark:border-[#383838]">
                    <Shield className="h-5 w-5 text-[#787774] dark:text-[#9B9B9B]" />
                  </div>
                  <span className="font-semibold text-[#37352F] dark:text-[#E6E5E3]">
                    Awaiting 4f Optical Simulation
                  </span>
                  <p className="max-w-sm text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                    Adjust the phase mask key seeds and click &quot;Execute 4f DRPE Encryption&quot; to propagate light through spatial and Fourier planes.
                  </p>
                  {activeArtifact ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleEncryptDRPE}
                      disabled={loading}
                    >
                      Simulate DRPE on {activeArtifact.name}
                    </Button>
                  ) : (
                    presets.length > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => loadPresetById(presets[0].id)}
                      >
                        Load {presets[0].name}
                      </Button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALTERNATIVE TRANSFORMS BENCH (Fourier, DCT, Arnold) */}
      {activeTab !== "drpe" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Key className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                  <span>{activeTab.toUpperCase()} Transform Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[11px] text-[#787774] dark:text-[#9B9B9B] leading-relaxed">
                  {activeTab === "arnold"
                    ? "Arnold Cat Map applies a 2D chaotic diffeomorphism, folding and stretching the pixel lattice."
                    : activeTab === "dct"
                    ? "Discrete Cosine Transform (DCT) converts spatial pixels into spectral frequencies and permutes coefficients."
                    : "Fourier Phase Transform scrambles the 2D complex phase angle spectrum while preserving amplitude bounds."}
                </p>

                {activeTab === "arnold" ? (
                  <Slider
                    label="Cat Map Iterations"
                    hint="Toral cycle"
                    valueDisplay={`${arnoldItr} cycles`}
                    min={1}
                    max={25}
                    value={arnoldItr}
                    onChange={(e) => setArnoldItr(Number(e.target.value))}
                  />
                ) : (
                  <Slider
                    label="Permutation Key Seed"
                    valueDisplay={singleSeed}
                    min={1}
                    max={500}
                    value={singleSeed}
                    onChange={(e) => setSingleSeed(Number(e.target.value))}
                  />
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="primary"
                    onClick={() => handleTransform(activeTab, "encrypt")}
                    disabled={loading || !activeArtifact}
                    className="flex-1 h-9"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Encrypt</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleTransform(activeTab, "decrypt")}
                    disabled={loading || !activeArtifact}
                    className="flex-1 h-9"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>Decrypt</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {transformResult && (
              <Button
                variant="secondary"
                onClick={() =>
                  handlePromoteToAnalysis(
                    transformResult.output_image,
                    `${transformResult.algorithm} Cipher`
                  )
                }
                className="w-full flex items-center justify-center gap-2 h-9"
              >
                <span>Promote to Analysis</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="lg:col-span-8">
            {transformResult ? (
              <CanvasViewer
                imageSrc={transformResult.output_image}
                title={`${transformResult.algorithm} — ${transformResult.action.toUpperCase()}`}
                subtitle={`Latency: ${formatMs(transformResult.latency_ms)}`}
              />
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center rounded-lg bg-[#FAFAF9] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] text-xs gap-3 p-6 text-center">
                <div className="p-3 rounded-full bg-white dark:bg-[#282828] border border-[#EDEDEB] dark:border-[#383838]">
                  <Key className="h-5 w-5 text-[#787774] dark:text-[#9B9B9B]" />
                </div>
                <span className="font-semibold text-[#37352F] dark:text-[#E6E5E3]">
                  {activeTab.toUpperCase()} Transform Ready
                </span>
                <p className="max-w-sm text-[#787774] dark:text-[#9B9B9B]">
                  Click Encrypt to scramble image pixels into chaotic permutations.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
