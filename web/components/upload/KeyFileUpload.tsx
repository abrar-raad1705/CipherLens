"use client";

import React, { useState, useRef } from "react";
import {
  DocumentTextIcon as FileText,
  ArrowUpTrayIcon as Upload,
  CheckCircleIcon as CheckCircle2,
  ExclamationCircleIcon as AlertCircle,
  XMarkIcon as X,
  KeyIcon as KeyRound,
  ArrowRightIcon as ArrowRight,
  ShieldCheckIcon as ShieldCheck,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { EncryptionAlgorithm } from "@/lib/encryption-session";
import { parseAndValidateKeyFile, ParsedKeyData } from "@/lib/key-file";

interface KeyFileUploadProps {
  selectedAlgo: EncryptionAlgorithm;
  onKeyLoaded: (params: {
    algorithm: EncryptionAlgorithm;
    keys: ParsedKeyData;
    fileName: string;
    ciphertextPackage?: {
      real: string;
      imag: string;
      shape: number[];
    };
  }) => void;
  onSwitchAlgorithm?: (algo: EncryptionAlgorithm) => void;
  dropzoneClassName?: string;
}

export function KeyFileUpload({
  selectedAlgo,
  onKeyLoaded,
  onSwitchAlgorithm,
  dropzoneClassName,
}: KeyFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedKeys, setLoadedKeys] = useState<ParsedKeyData | null>(null);
  const [loadedAlgo, setLoadedAlgo] = useState<EncryptionAlgorithm | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processKeyFile = (file: File) => {
    setErrorMessage(null);
    setWarningMessage(null);

    if (
      !file.name.endsWith(".txt") &&
      !file.name.endsWith(".json") &&
      file.type &&
      !file.type.includes("text") &&
      !file.type.includes("json")
    ) {
      setErrorMessage("Please upload a .json or .txt cryptographic key file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setErrorMessage("Key file is empty or could not be read.");
        return;
      }

      const result = parseAndValidateKeyFile(content, selectedAlgo);

      if (!result.valid || !result.keys) {
        setErrorMessage(result.error || "Failed to validate key file.");
        return;
      }

      const keyAlgo = result.algorithm || selectedAlgo;
      setLoadedFileName(file.name);
      setLoadedKeys(result.keys);
      setLoadedAlgo(keyAlgo);

      // Check for algorithm mismatch
      if (result.algorithmMismatch && keyAlgo !== selectedAlgo) {
        setWarningMessage(
          `Key file is configured for ${keyAlgo.toUpperCase()} (currently on ${selectedAlgo.toUpperCase()}).`
        );
      }

      onKeyLoaded({
        algorithm: keyAlgo,
        keys: result.keys,
        fileName: file.name,
        ciphertextPackage: result.keys.ciphertextPackage,
      });
    };

    reader.onerror = () => {
      setErrorMessage("Error reading key file from disk.");
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processKeyFile(file);
  };

  const handleClear = () => {
    setLoadedFileName(null);
    setLoadedKeys(null);
    setLoadedAlgo(null);
    setErrorMessage(null);
    setWarningMessage(null);
  };

  const formatKeySummary = (keys: ParsedKeyData, algo: EncryptionAlgorithm): string => {
    if (algo === "drpe") {
      return `Seed1: ${keys.seed1}, Seed2: ${keys.seed2}`;
    }
    if (algo === "fourier") {
      return `Phase Seed: ${keys.fourierSeed}`;
    }
    if (algo === "dct") {
      return `Basis Seed: ${keys.dctSeed}`;
    }
    if (algo === "arnold") {
      const xor = keys.xorValue ?? 170;
      return `Iterations: ${keys.iterations}, XOR: 0x${xor.toString(16).toUpperCase()} (${xor})`;
    }
    return "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processKeyFile(file);
          e.target.value = "";
        }}
      />

      {/* Upload or Loaded State */}
      {loadedFileName && loadedKeys && loadedAlgo ? (
        /* Key Loaded Successfully */
        <div className="rounded-lg border border-[#A7F3D0] dark:border-[#047857]/40 bg-[#ECFDF5] dark:bg-[#064E3B]/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#065F46] dark:text-[#6EE7B7]">
              <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-[#34D399] shrink-0" />
              <span className="truncate max-w-[180px]" title={loadedFileName}>
                {loadedFileName}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="text-[#065F46] dark:text-[#6EE7B7] hover:opacity-75 p-0.5 rounded cursor-pointer"
              title="Remove key file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#047857] dark:text-[#A7F3D0] flex flex-col gap-0.5">
            <span className="uppercase tracking-wider text-[10px] font-semibold">
              Loaded {loadedAlgo.toUpperCase()} Parameters:
            </span>
            <span className="font-medium bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded">
              {formatKeySummary(loadedKeys, loadedAlgo)}
            </span>
            {loadedAlgo === "drpe" && loadedKeys.ciphertextPackage && (
              <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-[#065F46] dark:text-[#6EE7B7] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Ciphertext Package Embedded
              </span>
            )}
          </div>

          {/* Algorithm Mismatch Action */}
          {warningMessage && onSwitchAlgorithm && (
            <div className="pt-1 border-t border-[#A7F3D0]/50 dark:border-[#047857]/30 flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#065F46] dark:text-[#A7F3D0]">
                Switch to {loadedAlgo.toUpperCase()}?
              </span>
              <button
                type="button"
                onClick={() => onSwitchAlgorithm(loadedAlgo)}
                className="inline-flex items-center text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span>Switch Algorithm</span>
                <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty / Idle Dropzone for Key File */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-lg border border-dashed transition-all p-2.5 text-center cursor-pointer select-none ${
            isDragOver
              ? "border-[#2563EB] bg-[#2563EB]/5"
              : "border-[#D7D7D1] dark:border-[#2E2E2E] hover:border-[#2563EB] dark:hover:border-[#5B8CFF] bg-[#FAFAF8] dark:bg-[#121212]"
          } ${dropzoneClassName || ""}`}
        >
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#181818] dark:text-[#F2F2F0]">
            <KeyRound className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#5B8CFF]" />
            <span>Upload Key File (.json)</span>
          </div>
          <div className="text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
            Click or drag &amp; drop key `.json` to auto-fill
          </div>
        </div>
      )}

      {/* Error Callout */}
      {errorMessage && (
        <div className="p-2 rounded-md border border-[#FECACA] dark:border-[#991B1B]/40 bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 text-[#991B1B] dark:text-[#FCA5A5] text-[11px] flex items-start justify-between gap-1.5 leading-tight">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 p-0.5 rounded cursor-pointer shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
