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
  LockOpenIcon as Unlock,
  ArrowPathIcon as RotateCcw,
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
  continueWithoutKey?: boolean;
  onContinueWithoutKeyChange?: (checked: boolean) => void;
  canContinueWithoutKey?: boolean;
  onContinueWithoutKey?: () => void;
  openPickerSignal?: number;
  isDecrypting?: boolean;
}

export function KeyFileUpload({
  selectedAlgo,
  onKeyLoaded,
  onSwitchAlgorithm,
  dropzoneClassName,
  continueWithoutKey = false,
  onContinueWithoutKeyChange,
  canContinueWithoutKey = false,
  onContinueWithoutKey,
  openPickerSignal = 0,
  isDecrypting = false,
}: KeyFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedKeys, setLoadedKeys] = useState<ParsedKeyData | null>(null);
  const [loadedAlgo, setLoadedAlgo] = useState<EncryptionAlgorithm | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (openPickerSignal > 0) fileInputRef.current?.click();
  }, [openPickerSignal]);

  // Auto-dismiss error message after 5 seconds
  React.useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const processKeyFile = (file: File) => {
    setErrorMessage(null);
    setWarningMessage(null);

    // Validate format: JSON file only!
    const isJsonMime = Boolean(file.type && (file.type === "application/json" || file.type.includes("json")));
    const isJsonExt = /\.json$/i.test(file.name);

    if (!isJsonMime && !isJsonExt) {
      setErrorMessage("Invalid file format. Please upload a JSON key file (.json).");
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
    <div className="w-full h-full relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
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
        <div className="h-full rounded-2xl border border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#141414] p-4 sm:p-5 flex flex-col justify-between select-none">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E8E3] dark:border-[#242424]">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">
                <KeyRound className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF] shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-[260px]" title={loadedFileName}>
                  {loadedFileName}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] p-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                title="Remove key file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="uppercase tracking-wider text-[10px] font-mono font-medium text-[#999993] dark:text-[#6A6A6A]">
                Loaded {loadedAlgo.toUpperCase()} Parameters
              </span>
              <div className="font-mono text-xs text-[#181818] dark:text-[#F2F2F0] bg-[#FAFAF8] dark:bg-[#1A1A1A] border border-[#E8E8E3] dark:border-[#2A2A2A] p-3 rounded-lg leading-relaxed">
                {formatKeySummary(loadedKeys, loadedAlgo)}
              </div>
              {loadedAlgo === "drpe" && loadedKeys.ciphertextPackage && (
                <span className="inline-flex items-center gap-1.5 mt-0.5 text-xs text-[#2563EB] dark:text-[#5B8CFF] font-medium uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF] shrink-0" />
                  Ciphertext Package Embedded
                </span>
              )}
            </div>
          </div>

          {/* Algorithm Mismatch Action */}
          {warningMessage && onSwitchAlgorithm && (
            <div className="pt-3 border-t border-[#E8E8E3] dark:border-[#242424] flex items-center justify-between gap-2">
              <span className="text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
                Switch to {loadedAlgo.toUpperCase()}?
              </span>
              <button
                type="button"
                onClick={() => onSwitchAlgorithm(loadedAlgo)}
                className="inline-flex items-center text-xs font-medium text-[#2563EB] dark:text-[#5B8CFF] hover:underline cursor-pointer"
              >
                <span>Switch Algorithm</span>
                <ArrowRight className="h-3 w-3 ml-1" />
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
          onClick={continueWithoutKey ? undefined : () => fileInputRef.current?.click()}
          className={`relative group w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden flex flex-col items-center justify-center p-8 sm:p-10 text-center select-none ${
            continueWithoutKey ? "cursor-default" : "cursor-pointer"
          } ${
            isDragOver
              ? "border-[#2563EB] dark:border-[#3B82F6] bg-blue-500/[0.05] dark:bg-blue-500/[0.09] ring-2 ring-blue-500/20 scale-[1.006]"
              : "border-[#DCDCD6] dark:border-[#242424] hover:border-[#2563EB]/70 dark:hover:border-[#3B82F6]/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] shadow-2xs"
          } ${dropzoneClassName || ""}`}
        >
          {/* Top checkbox: single outer box container with bigger font */}
          <div
            className="absolute left-4 right-4 top-4 z-20 rounded-xl border border-[#E8E8E3] dark:border-[#303030] bg-white/95 dark:bg-[#191919]/95 px-4 py-3 shadow-sm backdrop-blur-sm transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="flex cursor-pointer items-center gap-3 w-full select-none">
              <input
                type="checkbox"
                checked={continueWithoutKey}
                onChange={(e) => onContinueWithoutKeyChange?.(e.target.checked)}
                className="peer sr-only"
              />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#DCDCD6] dark:border-[#555550] bg-white dark:bg-[#171717] text-xs font-bold leading-none text-transparent transition-colors peer-checked:border-[#2563EB] dark:peer-checked:border-[#5B8CFF] peer-checked:bg-[#2563EB] dark:peer-checked:bg-[#5B8CFF] peer-checked:text-white">
                ✓
              </span>
              <span className="text-sm sm:text-base font-medium text-[#181818] dark:text-[#F2F2F0]">
                I don&apos;t have a key
              </span>
            </label>
          </div>

          {continueWithoutKey ? (
            /* Checked State: Big unlock icon and under that decrypt button in the center of the whole area */
            <div
              className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto text-center p-4 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mx-auto flex items-center justify-center mb-5 bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 text-[#2563EB] dark:text-[#5B8CFF] shadow-sm">
                <Unlock className="h-10 w-10 sm:h-12 sm:w-12 stroke-[1.8]" />
              </div>

              <div className="space-y-1.5 mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-[#181818] dark:text-[#F4F4F5]">
                  No Key Required
                </h3>
                <p className="text-xs sm:text-sm text-[#71717A] dark:text-[#A0A09B] max-w-xs mx-auto">
                  Proceed without an external key file. You can configure parameters directly in the workbench.
                </p>
              </div>

              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (canContinueWithoutKey && !isDecrypting) {
                    onContinueWithoutKey?.();
                  }
                }}
                disabled={!canContinueWithoutKey || isDecrypting}
                className="h-12 sm:h-13 px-8 rounded-xl text-base font-semibold cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 bg-[#202020] hover:bg-[#282828] dark:bg-[#202020] dark:hover:bg-[#282828] text-[#F2F2F0] border border-[#3A3A3A] hover:border-[#5B8CFF]/70 inline-flex items-center justify-center gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.2)] disabled:opacity-40 disabled:pointer-events-none"
              >
                {isDecrypting ? (
                  <>
                    <RotateCcw className="h-5 w-5 animate-spin text-[#7EA2FF] shrink-0" />
                    <span>Decrypting...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-5 w-5 text-[#7EA2FF] shrink-0" />
                    <span>{canContinueWithoutKey ? "Decrypt" : "Upload Ciphertext to Decrypt"}</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Normal Dropzone State */
            <div className="relative z-10 flex flex-col items-center justify-center max-w-md mx-auto pointer-events-none text-center">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-all duration-300 ${
                  isDragOver
                    ? "bg-[#2563EB] text-white scale-110 shadow-lg shadow-blue-500/25"
                    : "bg-blue-500/10 dark:bg-[#1E293B]/70 text-[#2563EB] dark:text-[#60A5FA] group-hover:scale-105 group-hover:bg-blue-500/15 dark:group-hover:bg-[#1E293B]"
                }`}
              >
                <KeyRound className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.8]" />
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181818] dark:text-[#F4F4F5] mb-2">
                {isDragOver ? "Release to upload" : "Drop key file here"}
              </h2>

              <div className="flex items-center gap-2.5 w-32 my-2.5">
                <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
                <span className="text-xs uppercase tracking-widest text-[#71717A] dark:text-[#71717A] font-medium">
                  or
                </span>
                <div className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#27272A]/90" />
              </div>

              <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium shadow-xs group-hover:shadow-md transition-all active:scale-98">
                <Upload className="h-4 w-4 stroke-[2]" />
                <span>Browse key file</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Callout (positioned below the checkbox with compact height) */}
      {errorMessage && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-4 right-4 z-40 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#EEF0EB] dark:bg-[#1E1E1E] border border-[#DCDEC6]/70 dark:border-[#2C2C2C] text-[#1E1E1E] dark:text-[#E8E8E6] flex items-center justify-between gap-3 text-left pointer-events-auto shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            loadedFileName ? "top-4" : "top-[70px] sm:top-[72px]"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-[#D92D20] text-white flex items-center justify-center shrink-0 shadow-xs">
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-[#EAEAE8] leading-tight break-words">
              {errorMessage}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-md text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#F1F3F4] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer shrink-0 transition-colors"
            title="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
