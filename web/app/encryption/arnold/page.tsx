"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Shuffle, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { CanvasViewer } from "@/components/image/CanvasViewer";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { useWorkspace } from "@/hooks/use-image";
import { useEncryption } from "@/hooks/use-encryption";

function ArnoldPageContent() {
  const router = useRouter();
  const { activeArtifact, presets, loadPresetById, addArtifact } = useWorkspace();
  const { loading, error, executeArnoldXOR } = useEncryption();

  const [iterations, setIterations] = useState<number>(10);
  const [xorValue, setXorValue] = useState<number>(170);
  const [decryptIterations, setDecryptIterations] = useState<number>(10);
  const [decryptXorValue, setDecryptXorValue] = useState<number>(170);

  const [encryptedImage, setEncryptedImage] = useState<string | null>(null);
  const [decryptedImage, setDecryptedImage] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [isSquareCropped, setIsSquareCropped] = useState<boolean>(false);

  const handleEncrypt = async () => {
    if (!activeArtifact) return;
    try {
      const res = await executeArnoldXOR(activeArtifact.dataUri, iterations, xorValue, "encrypt");
      setEncryptedImage(res.output_image);
      setDecryptedImage(null);
      setLastLatency(res.latency_ms);
      setIsSquareCropped(Boolean(res.metadata?.square_cropped));
      setDecryptIterations(iterations);
      setDecryptXorValue(xorValue);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedImage) return;
    try {
      const res = await executeArnoldXOR(
        encryptedImage,
        decryptIterations,
        decryptXorValue,
        "decrypt"
      );
      setDecryptedImage(res.output_image);
      setLastLatency(res.latency_ms);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePromoteToAnalysis = (targetUri: string, label: string) => {
    if (!activeArtifact) return;
    addArtifact(
      {
        name: `${activeArtifact.name} [${label}]`,
        dataUri: targetUri,
        width: activeArtifact.width,
        height: activeArtifact.height,
        sourceBench: "encryption",
      },
      false
    );
    router.push("/analysis");
  };

  const isExactKeyMatch =
    decryptIterations === iterations && decryptXorValue === xorValue;

  return (
    <div className="space-y-6 max-w-7xl py-2">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            CHAOTIC MAP CIPHER
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Arnold Cat Map & XOR Diffusion
          </h1>
        </div>

        {encryptedImage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handlePromoteToAnalysis(encryptedImage, "Arnold Ciphertext")}
          >
            <span>Analyze Ciphertext</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visualization & Decryption comparison */}
        <div className="lg:col-span-8 space-y-6">
          {encryptedImage ? (
            <div className="space-y-6">
              <CanvasViewer
                imageSrc={encryptedImage}
                title="ARNOLD-XOR CIPHERTEXT"
                subtitle={`Iterations: ${iterations} · XOR Mask: 0x${xorValue.toString(16).toUpperCase()}${
                  isSquareCropped ? " (Center-cropped to 1:1 square)" : ""
                }`}
              />

              {/* Decrypted Recovery Comparison */}
              {decryptedImage && activeArtifact?.dataUri && (
                <div className="space-y-2 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="font-mono text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                      DECRYPTION RECONSTRUCTION COMPARISON
                    </span>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span
                        className={
                          isExactKeyMatch
                            ? "text-[#059669] dark:text-[#34D399]"
                            : "text-[#DC2626] dark:text-[#F87171]"
                        }
                      >
                        {isExactKeyMatch ? "Exact Chaotic Inversion" : "Mismatched State (Scrambled)"}
                      </span>
                    </div>
                  </div>
                  <SplitCompareCanvas
                    beforeSrc={activeArtifact.dataUri}
                    afterSrc={decryptedImage}
                    beforeLabel="ORIGINAL"
                    afterLabel={isExactKeyMatch ? "DECRYPTED (MATCHED)" : "DECRYPTED (WRONG KEY)"}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-sm gap-3 p-6 text-center">
              <div className="p-3 rounded-full bg-[#FAFAF8] dark:bg-[#1F1F1F] border border-[#E8E8E3] dark:border-[#292929]">
                <Shuffle className="h-5 w-5 text-[#999993] dark:text-[#6A6A6A]" />
              </div>
              <span className="font-medium text-[#181818] dark:text-[#F2F2F0]">
                Awaiting Chaotic Arnold Cat Map
              </span>
              <p className="text-[#6F6F6A] dark:text-[#A0A09B] max-w-sm text-xs">
                Configure the number of cat map stretching iterations and the XOR diffusion mask on the right panel.
              </p>
              {activeArtifact ? (
                <Button variant="primary" size="sm" onClick={handleEncrypt} disabled={loading}>
                  Encrypt {activeArtifact.name}
                </Button>
              ) : presets.length > 0 ? (
                <Button variant="primary" size="sm" onClick={() => loadPresetById(presets[0].id)}>
                  Load {presets[0].name}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Column: Parameters & Actions */}
        <Card className="lg:col-span-4 p-5 space-y-6">
          <div className="space-y-1">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              CHAOTIC TORAL AUTOMORPHISM
            </div>
            <p className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] leading-relaxed">
              Arnold Cat Map permutes 2D coordinate space via continuous area-preserving shearing:
              <br />
              <code className="text-[11px] font-mono block mt-1 py-1 px-1.5 bg-[#F2F2EE] dark:bg-[#1E1E1E] rounded">
                [x&apos;, y&apos;]ᵀ = [1 1; 1 2][x, y]ᵀ mod N
              </code>
              followed by bitwise XOR masking for grey-level diffusion.
            </p>
          </div>

          {/* Encryption Control */}
          <div className="space-y-4 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              ENCRYPTION PARAMETERS
            </div>
            <Slider
              label="Cat Map Iterations"
              valueDisplay={iterations}
              min={1}
              max={50}
              step={1}
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
            />
            <Slider
              label="XOR Diffusion Mask"
              valueDisplay={`0x${xorValue.toString(16).toUpperCase()} (${xorValue})`}
              min={0}
              max={255}
              step={1}
              value={xorValue}
              onChange={(e) => setXorValue(Number(e.target.value))}
            />
            <Button
              variant="primary"
              onClick={handleEncrypt}
              disabled={loading || !activeArtifact}
              className="w-full h-9"
            >
              <Lock className="h-3.5 w-3.5 mr-1" />
              <span>{loading ? "Simulating Chaos..." : "Execute Arnold-XOR Cipher"}</span>
            </Button>
          </div>

          {/* Decryption Control */}
          <div className="space-y-4 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
            <div className="flex items-center justify-between text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
              <span>INVERSE PARAMETERS</span>
              <Badge variant={isExactKeyMatch ? "emerald" : "rose"} dot>
                {isExactKeyMatch ? "Match" : "Perturbed"}
              </Badge>
            </div>
            <Slider
              label="Decrypt Iterations"
              valueDisplay={decryptIterations}
              min={1}
              max={50}
              step={1}
              value={decryptIterations}
              onChange={(e) => setDecryptIterations(Number(e.target.value))}
            />
            <Slider
              label="Decrypt XOR Mask"
              valueDisplay={`0x${decryptXorValue.toString(16).toUpperCase()} (${decryptXorValue})`}
              min={0}
              max={255}
              step={1}
              value={decryptXorValue}
              onChange={(e) => setDecryptXorValue(Number(e.target.value))}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setDecryptIterations(iterations);
                  setDecryptXorValue(xorValue);
                }}
                disabled={!encryptedImage}
              >
                Match Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  setDecryptIterations(iterations + 1);
                }}
                disabled={!encryptedImage}
              >
                Perturb (+1)
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={handleDecrypt}
              disabled={loading || !encryptedImage}
              className="w-full h-9"
            >
              <Unlock className="h-3.5 w-3.5 mr-1" />
              <span>Attempt Inversion</span>
            </Button>

            {lastLatency !== null && (
              <div className="p-3 rounded border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] text-xs font-mono text-[#6F6F6A] dark:text-[#A0A09B] space-y-1">
                <div className="flex justify-between">
                  <span>Execution Latency:</span>
                  <span className="text-[#181818] dark:text-[#F2F2F0]">{lastLatency} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-[#059669] dark:text-[#34D399]">Completed</span>
                </div>
              </div>
            )}
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

export default function ArnoldPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading Arnold bench...</div>}>
      <ArnoldPageContent />
    </Suspense>
  );
}
