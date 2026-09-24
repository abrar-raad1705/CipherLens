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
      imag?: string;
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
          className={`relative group w-full h-full min-h-[340px] sm:min-h-[360px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 sm:p-10 text-center select-none ${
            isDragOver
              ? "border-[#2563EB] dark:border-[#3B82F6] bg-blue-500/[0.05] dark:bg-blue-500/[0.09] ring-2 ring-blue-500/20 scale-[1.006]"
              : "border-[#DCDCD6] dark:border-[#242424] hover:border-[#2563EB]/70 dark:hover:border-[#3B82F6]/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] shadow-2xs"
          } ${dropzoneClassName || ""}`}
        >
          <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto pointer-events-none text-center">
            <div
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-all duration-300 ${
                isDragOver
                  ? "bg-[#2563EB] text-white scale-110 shadow-lg shadow-blue-500/25"
                  : "bg-blue-500/10 dark:bg-[#1E293B]/70 text-[#2563EB] dark:text-[#60A5FA] group-hover:scale-105 group-hover:bg-blue-500/15 dark:group-hover:bg-[#1E293B]"
              }`}
            >
              <KeyRound className="h-8 w-8 sm:h-9 sm:w-9 stroke-[1.8]" />
            </div>

            <h2 className="text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5] mb-1.5">
              {isDragOver ? "Release to upload" : "Drop key file (.json) here"}
            </h2>

            <div className="flex items-center gap-2 w-28 my-2">
              <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
              <span className="text-[10px] uppercase tracking-widest text-[#71717A] dark:text-[#71717A] font-medium">
                or
              </span>
              <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium shadow-xs group-hover:shadow-md transition-all active:scale-98 mb-2">
              <Upload className="h-3.5 w-3.5 stroke-[2]" />
              <span>Browse key file</span>
            </div>

            <p className="text-xs text-[#71717A] dark:text-[#8E8E93] font-normal tracking-normal">
              JSON · max 1 MB
            </p>
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
