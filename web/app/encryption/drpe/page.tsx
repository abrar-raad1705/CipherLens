"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

  const stagesList = [
    { id: "original", label: "Original" },
    { id: "r1_phase", label: "R₁" },
    { id: "fourier_spectrum", label: "Fourier" },
    { id: "r2_phase", label: "R₂" },
    { id: "ciphertext", label: "Ciphertext" },
  ];

  const isExactKeyMatch = decryptSeed1 === seed1 && decryptSeed2 === seed2;

  return (
    <div className="space-y-8 max-w-4xl py-4">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            ENCRYPTION
          </div>
          <h1 className="text-xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Double Random Phase Encoding
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
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Algorithm Tabs */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as "drpe" | "fourier" | "dct" | "arnold")}
        items={[
          { id: "drpe", label: "4f DRPE" },
          { id: "fourier", label: "Fourier Phase" },
          { id: "dct", label: "DCT Permutation" },
          { id: "arnold", label: "Arnold Cat Map" },
        ]}
      />

      {/* DRPE COHERENT OPTICS BENCH */}
      {activeTab === "drpe" && (
        <div className="space-y-8">
          {/* Scientific Diagram: ORIGINAL ── R₁ ── FFT ── R₂ ── OUTPUT */}
          <OpticalBenchDiagram
            activeStage={activeStageKey}
            onSelectStage={(k) => {
              if (drpeEncryptResult) {
                setActiveStageKey(k);
              }
            }}
          />

          {/* Central Visualization Canvas */}
          <section className="space-y-3">
            {/* Stage Selector directly above canvas */}
            <div className="flex items-center gap-6 border-b border-[#E8E8E3] dark:border-[#292929] pb-1.5 text-xs">
              {stagesList.map((st) => {
                const isSelected = activeStageKey === st.id;
                const isAvailable = Boolean(drpeEncryptResult);

                return (
                  <button
                    key={st.id}
                    onClick={() => isAvailable && setActiveStageKey(st.id)}
                    disabled={!isAvailable}
                    className={`cursor-pointer transition-colors pb-1 -mb-2 border-b-2 font-mono text-[11px] ${
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

            {drpeEncryptResult ? (
              <div className="space-y-6">
                <CanvasViewer
                  imageSrc={
                    drpeEncryptResult.stages[
                      activeStageKey as keyof typeof drpeEncryptResult.stages
                    ]
                  }
                  title={activeStageKey.toUpperCase()}
                  subtitle="Coherent Wavefront Stage"
                />

                {/* Decrypted Recovery Comparison */}
                {drpeDecryptResult && drpeDecryptResult.decrypted_image && activeArtifact?.dataUri && (
                  <div className="space-y-2 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                        DECRYPTION RECOVERY
                      </span>
                      <div className="flex items-center gap-4 font-mono text-[11px]">
                        <span>SSIM: {drpeDecryptResult.quality?.ssim?.toFixed(4) || "0.0000"}</span>
                        <span>·</span>
                        <span>PSNR: {typeof drpeDecryptResult.quality?.psnr === "number" ? `${drpeDecryptResult.quality.psnr.toFixed(2)} dB` : "—"}</span>
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
              </div>
            ) : (
              <div className="h-[360px] flex flex-col items-center justify-center rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-xs gap-3 p-6 text-center">
                <span className="font-medium text-[#181818] dark:text-[#F2F2F0]">
                  Awaiting Optical Simulation
                </span>
                <p className="text-[#6F6F6A] dark:text-[#A0A09B] max-w-sm">
                  Configure phase mask seeds below and execute 4f DRPE encryption.
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
          </section>

          {/* Compact Parameters Area */}
          <section className="border-t border-[#E8E8E3] dark:border-[#292929] pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Encryption Keys */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                  ENCRYPTION KEYS
                </div>

                <div className="space-y-3">
                  <Slider
                    label="Spatial Mask (R₁)"
                    valueDisplay={seed1}
                    min={100}
                    max={9999}
                    step={1}
                    value={seed1}
                    onChange={(e) => setSeed1(Number(e.target.value))}
                  />
                  <Slider
                    label="Fourier Mask (R₂)"
                    valueDisplay={seed2}
                    min={100}
                    max={9999}
                    step={1}
                    value={seed2}
                    onChange={(e) => setSeed2(Number(e.target.value))}
                  />
                </div>

                <div className="pt-1">
                  <Button
                    variant="primary"
                    onClick={handleEncryptDRPE}
                    disabled={loading || !activeArtifact}
                    className="h-8"
                  >
                    <span>{loading ? "Simulating..." : "Encrypt"}</span>
                  </Button>
                </div>
              </div>

              {/* Decryption & Sensitivity Test */}
              <div className="space-y-4">
                <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                  DECRYPTION KEYS
                </div>

                <div className="space-y-3">
                  <Slider
                    label="Seed 1"
                    valueDisplay={decryptSeed1}
                    min={100}
                    max={9999}
                    step={1}
                    value={decryptSeed1}
                    onChange={(e) => setDecryptSeed1(Number(e.target.value))}
                  />
                  <Slider
                    label="Seed 2"
                    valueDisplay={decryptSeed2}
                    min={100}
                    max={9999}
                    step={1}
                    value={decryptSeed2}
                    onChange={(e) => setDecryptSeed2(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="secondary"
                    onClick={handleDecryptDRPE}
                    disabled={loading || !drpeEncryptResult}
                    className="h-8"
                  >
                    <span>Decrypt</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDecryptSeed1(seed1);
                      setDecryptSeed2(seed2);
                    }}
                    disabled={!drpeEncryptResult}
                  >
                    Match keys
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
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
              </div>
            </div>

            {error && (
              <div className="text-xs text-[#DC2626] font-mono">
                Error: {error}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Alternative Transforms (Fourier, DCT, Arnold) */}
      {activeTab !== "drpe" && (
        <div className="space-y-6">
          <div className="max-w-md space-y-4">
            <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
              {activeTab.toUpperCase()} PARAMETERS
            </div>

            {activeTab === "arnold" ? (
              <Slider
                label="Cat Map Iterations"
                valueDisplay={`${arnoldItr} cycles`}
                min={1}
                max={25}
                value={arnoldItr}
                onChange={(e) => setArnoldItr(Number(e.target.value))}
              />
            ) : (
              <Slider
                label="Key Seed"
                valueDisplay={singleSeed}
                min={1}
                max={500}
                value={singleSeed}
                onChange={(e) => setSingleSeed(Number(e.target.value))}
              />
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => handleTransform(activeTab, "encrypt")}
                disabled={loading || !activeArtifact}
                className="h-8"
              >
                <span>Encrypt</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleTransform(activeTab, "decrypt")}
                disabled={loading || !activeArtifact}
                className="h-8"
              >
                <span>Decrypt</span>
              </Button>
            </div>
          </div>

          {transformResult && (
            <div className="space-y-4 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                  {transformResult.algorithm} · Latency: {formatMs(transformResult.latency_ms)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handlePromoteToAnalysis(
                      transformResult.output_image,
                      `${transformResult.algorithm} Cipher`
                    )
                  }
                >
                  <span>Promote to Analysis</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>

              <CanvasViewer
                imageSrc={transformResult.output_image}
                title={`${transformResult.algorithm} Output`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
