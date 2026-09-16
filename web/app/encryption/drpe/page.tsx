"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Shield, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { CanvasViewer } from "@/components/image/CanvasViewer";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { OpticalBenchDiagram } from "@/components/encryption/OpticalBenchDiagram";
import { Correlation3DViewer } from "@/components/analysis/Correlation3DViewer";
import { useWorkspace } from "@/hooks/use-image";
import { useEncryption } from "@/hooks/use-encryption";

function DRPEBenchContent() {
  const router = useRouter();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const {
    loading,
    error,
    drpeEncryptResult,
    drpeDecryptResult,
    executeDRPEEncrypt,
    executeDRPEDecrypt,
  } = useEncryption();

  const [activeStageKey, setActiveStageKey] = useState<string>("ciphertext");

  // DRPE Seeds
  const [seed1, setSeed1] = useState<number>(1234);
  const [seed2, setSeed2] = useState<number>(5678);
  const [decryptSeed1, setDecryptSeed1] = useState<number>(1234);
  const [decryptSeed2, setDecryptSeed2] = useState<number>(5678);

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

  const handlePromoteToAnalysis = (targetUri: string, label: string) => {
    if (!activeArtifact) return;
    addArtifact({
      name: `${activeArtifact.name} [${label}]`,
      dataUri: targetUri,
      width: activeArtifact.width,
      height: activeArtifact.height,
      sourceBench: "encryption",
    }, false);
    router.push("/analysis");
  };

  const stagesList = [
    { id: "original", label: "Original" },
    { id: "r1_phase", label: "R₁ Spatial" },
    { id: "fourier_spectrum", label: "Fourier FFT" },
    { id: "r2_phase", label: "R₂ Phase" },
    { id: "ciphertext", label: "Ciphertext" },
  ];

  const isExactKeyMatch = decryptSeed1 === seed1 && decryptSeed2 === seed2;

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            OPTICAL ENCRYPTION
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            4f Double Random Phase Encoding (DRPE)
          </h1>
        </div>

        {drpeEncryptResult && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              handlePromoteToAnalysis(drpeEncryptResult.ciphertext, "DRPE Ciphertext")
            }
          >
            <span>Analyze Ciphertext</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Main Operations Area: Left = Visualization & Diagram, Right = User Inputs/Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visualization & Stage Inspection (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Scientific Optical Schematic */}
          <Card className="px-4 py-2">
            <OpticalBenchDiagram
              activeStage={activeStageKey}
              onSelectStage={(k) => {
                if (drpeEncryptResult) {
                  setActiveStageKey(k);
                }
              }}
            />
          </Card>

          {/* Stage Selector Navigation */}
          <div className="flex items-center gap-6 border-b border-[#E8E8E3] dark:border-[#292929] pb-2 text-xs overflow-x-auto">
            {stagesList.map((st) => {
              const isSelected = activeStageKey === st.id;
              const isAvailable = Boolean(drpeEncryptResult);

              return (
                <button
                  key={st.id}
                  onClick={() => isAvailable && setActiveStageKey(st.id)}
                  disabled={!isAvailable}
                  className={`cursor-pointer transition-colors pb-1 -mb-2 border-b-2 font-mono text-xs whitespace-nowrap ${
                    isSelected
                      ? "text-[#2563EB] dark:text-[#5B8CFF] border-[#2563EB] dark:border-[#5B8CFF] font-medium"
                      : isAvailable
                      ? "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] border-transparent"
                      : "text-[#999993] dark:text-[#6A6A6A] border-transparent opacity-40 cursor-not-allowed"
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Canvas Viewport */}
          {drpeEncryptResult ? (
            <div className="space-y-6">
              <CanvasViewer
                imageSrc={
                  drpeEncryptResult.stages[
                    activeStageKey as keyof typeof drpeEncryptResult.stages
                  ]
                }
                title={activeStageKey.toUpperCase()}
                subtitle="Coherent Wavefront State"
              />

              {/* Decrypted Recovery Comparison */}
              {drpeDecryptResult && drpeDecryptResult.decrypted_image && activeArtifact?.dataUri && (
                <div className="space-y-2 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="font-mono text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                      DECRYPTION RECONSTRUCTION COMPARISON
                    </span>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span>SSIM: {drpeDecryptResult.quality?.ssim?.toFixed(4) || "0.0000"}</span>
                      <span>·</span>
                      <span className={isExactKeyMatch ? "text-[#059669] dark:text-[#34D399]" : "text-[#DC2626] dark:text-[#F87171]"}>
                        {isExactKeyMatch ? "Exact Key" : "Perturbed (Noise)"}
                      </span>
                    </div>
                  </div>
                  <SplitCompareCanvas
                    beforeSrc={activeArtifact.dataUri}
                    afterSrc={drpeDecryptResult.decrypted_image}
                    beforeLabel="ORIGINAL"
                    afterLabel={isExactKeyMatch ? "DECRYPTED (MATCHED)" : "DECRYPTED (WRONG KEY)"}
                  />
                </div>
              )}

              {/* 3D Spatial Correlation & Phase Sphere Inspection */}
              <div className="pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
                <Correlation3DViewer
                  imageSrc={activeArtifact?.dataUri}
                  ciphertextSrc={drpeEncryptResult.ciphertext}
                  title="3D Spatial Correlation Disintegration & Phase Sphere"
                />
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-sm gap-3 p-6 text-center">
              <div className="p-3 rounded-full bg-[#FAFAF8] dark:bg-[#1F1F1F] border border-[#E8E8E3] dark:border-[#292929]">
                <Shield className="h-5 w-5 text-[#999993] dark:text-[#6A6A6A]" />
              </div>
              <span className="font-medium text-[#181818] dark:text-[#F2F2F0]">
                Awaiting 4f DRPE Simulation
              </span>
              <p className="text-[#6F6F6A] dark:text-[#A0A09B] max-w-sm text-xs">
                Configure the random phase mask key seeds on the right panel and execute optical encryption.
              </p>
              {activeArtifact ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEncryptDRPE}
                  disabled={loading}
                >
                  Encrypt {activeArtifact.name}
                </Button>
              ) : presets.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => loadPresetById(presets[0].id)}
                >
                  Load {presets[0].name}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Column: User Inputs & Key Parameters Panel (4 cols on desktop) */}
        <Card className="lg:col-span-4 p-5 space-y-6">
          <div className="space-y-1">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              4f OPTICAL ARCHITECTURE
            </div>
            <p className="text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
              Double Random Phase Encoding simulates spatial modulation $R_1(x,y)$ and Fourier plane modulation $R_2(u,v)$ in a coherent 4f optical correlator.
            </p>
          </div>

          {/* DRPE Key Inputs */}
          <div className="space-y-5 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
            {/* Encryption Phase Seeds */}
            <div className="space-y-3">
              <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                PHASE KEYS (ENCRYPTION)
              </div>
              <Slider
                label="Spatial Mask Seed (R₁)"
                valueDisplay={seed1}
                min={100}
                max={9999}
                step={1}
                value={seed1}
                onChange={(e) => setSeed1(Number(e.target.value))}
              />
              <Slider
                label="Fourier Mask Seed (R₂)"
                valueDisplay={seed2}
                min={100}
                max={9999}
                step={1}
                value={seed2}
                onChange={(e) => setSeed2(Number(e.target.value))}
              />
              <Button
                variant="primary"
                onClick={handleEncryptDRPE}
                disabled={loading || !activeArtifact}
                className="w-full h-9 mt-1"
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                <span>{loading ? "Simulating Wavefront..." : "Execute 4f Encryption"}</span>
              </Button>
            </div>

            {/* Decryption & Keyspace Sensitivity */}
            <div className="space-y-3 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
              <div className="flex items-center justify-between text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                <span>KEY SENSITIVITY TEST</span>
                <Badge variant={isExactKeyMatch ? "emerald" : "rose"} dot>
                  {isExactKeyMatch ? "Match" : "Perturbed"}
                </Badge>
              </div>
              <p className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed">
                In a secure optical cryptosystem, perturbing a seed by just +1 must yield stationary white noise.
              </p>
              <Slider
                label="Decrypt Seed 1"
                valueDisplay={decryptSeed1}
                min={100}
                max={9999}
                step={1}
                value={decryptSeed1}
                onChange={(e) => setDecryptSeed1(Number(e.target.value))}
              />
              <Slider
                label="Decrypt Seed 2"
                valueDisplay={decryptSeed2}
                min={100}
                max={9999}
                step={1}
                value={decryptSeed2}
                onChange={(e) => setDecryptSeed2(Number(e.target.value))}
              />

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setDecryptSeed1(seed1);
                    setDecryptSeed2(seed2);
                  }}
                  disabled={!drpeEncryptResult}
                >
                  Match Keys
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setDecryptSeed1(seed1 + 1);
                    setDecryptSeed2(seed2);
                  }}
                  disabled={!drpeEncryptResult}
                  title="Perturb seed by +1"
                >
                  Perturb (+1)
                </Button>
              </div>

              <Button
                variant="secondary"
                onClick={handleDecryptDRPE}
                disabled={loading || !drpeEncryptResult}
                className="w-full h-9"
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
                <span>Attempt Decryption</span>
              </Button>

              {/* Telemetry HUD */}
              {drpeDecryptResult && drpeDecryptResult.quality && (
                <div className="p-3 rounded border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Verdict:</span>
                    <span className={isExactKeyMatch ? "text-[#059669] dark:text-[#34D399] font-medium" : "text-[#DC2626] dark:text-[#F87171] font-medium"}>
                      {isExactKeyMatch ? "Exact Recovery" : "Zero Recovery (Noise)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>SSIM Fidelity:</span>
                    <span className="text-[#181818] dark:text-[#F2F2F0]">{drpeDecryptResult.quality.ssim?.toFixed(4) || "0.0000"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PSNR:</span>
                    <span className="text-[#181818] dark:text-[#F2F2F0]">{typeof drpeDecryptResult.quality.psnr === "number" ? `${drpeDecryptResult.quality.psnr.toFixed(2)} dB` : drpeDecryptResult.quality.psnr || "—"}</span>
                  </div>
                </div>
              )}
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

export default function DRPEBenchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading DRPE bench...</div>}>
      <DRPEBenchContent />
    </Suspense>
  );
}
