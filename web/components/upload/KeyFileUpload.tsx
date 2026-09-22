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
import { cn } from "@/lib/utils/cn";

interface KeyFileUploadProps {
  selectedAlgo: EncryptionAlgorithm;
  onKeyLoaded: (params: {
    algorithm: EncryptionAlgorithm;
    keys: ParsedKeyData;
    fileName: string;
  }) => void;
  onKeyCleared?: () => void;
  onSwitchAlgorithm?: (algo: EncryptionAlgorithm) => void;
}

export function KeyFileUpload({
  selectedAlgo,
  onKeyLoaded,
  onKeyCleared,
  onSwitchAlgorithm,
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

    if (!file.name.endsWith(".txt") && !file.name.endsWith(".json") && file.type && !file.type.includes("text")) {
      setErrorMessage("Please upload a .txt cryptographic key file.");
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
    onKeyCleared?.();
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
        accept=".txt,.json,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processKeyFile(file);
          e.target.value = "";
        }}
      />

      {/* Upload or Loaded State */}
      {loadedFileName && loadedKeys && loadedAlgo ? (
        /* Key Loaded Successfully - Refined Site-Blending Dark Aesthetic */
        <div className="rounded-lg border border-[#E8E8E3] dark:border-[#282828] bg-zinc-50 dark:bg-[#141414] p-2.5 space-y-2 shadow-2xs transition-all">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-blue-500/10 dark:bg-[#1E293B]/70 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                <KeyRound className="h-3 w-3 text-blue-600 dark:text-blue-400 stroke-[2]" />
              </div>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[190px]" title={loadedFileName}>
                {loadedFileName}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 p-0.5 rounded cursor-pointer transition-colors shrink-0"
              title="Remove key file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 flex items-center justify-between bg-white dark:bg-[#1C1C1C] px-2 py-1.5 rounded border border-[#E8E8E3] dark:border-[#242424]">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{loadedAlgo.toUpperCase()}</span>
            <span className="truncate max-w-[180px] text-zinc-600 dark:text-zinc-400">{formatKeySummary(loadedKeys, loadedAlgo)}</span>
          </div>

          {/* Algorithm Mismatch Action - Clickable text with edge matching the key box */}
          {loadedAlgo !== selectedAlgo && onSwitchAlgorithm && (
            <div className="flex items-center justify-end -mt-0.5">
              <button
                type="button"
                onClick={() => onSwitchAlgorithm(loadedAlgo)}
                className="group py-0.5 px-0 rounded inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all cursor-pointer"
              >
                <span>Switch to {loadedAlgo.toUpperCase()}?</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty / Idle Dropzone for Key File - Compact Horizontal Layout */
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
          className={cn(
            "relative group w-full rounded-lg border border-dashed transition-all duration-200 cursor-pointer overflow-hidden py-3.5 px-3 flex items-center justify-between gap-2 select-none",
            isDragOver
              ? "border-[#2563EB] dark:border-[#3B82F6] bg-blue-500/[0.08] ring-2 ring-blue-500/20"
              : "border-[#DCDCD6] dark:border-[#282828] hover:border-[#2563EB]/70 dark:hover:border-[#3B82F6]/70 bg-white/60 dark:bg-[#121212]/90 hover:bg-white dark:hover:bg-[#151515] shadow-2xs"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
            {/* Blue Key Icon container */}
            <div
              className={cn(
                "w-8.5 h-8.5 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200",
                isDragOver
                  ? "bg-[#2563EB] text-white scale-105"
                  : "bg-blue-500/10 dark:bg-[#1E293B]/70 text-[#2563EB] dark:text-[#60A5FA] group-hover:bg-blue-500/15"
              )}
            >
              <KeyRound className="h-4.5 w-4.5 stroke-[1.8]" />
            </div>

            <div className="min-w-0 text-left">
              <div className="text-[11.5px] font-semibold text-[#181818] dark:text-[#F4F4F5] leading-tight truncate">
                {isDragOver ? "Drop key file" : "Upload Key File (.txt)"}
              </div>
              <div className="text-[9.5px] text-[#71717A] dark:text-[#8E8E93] leading-tight whitespace-nowrap mt-0.5">
                Click or drag &amp; drop to auto-fill
              </div>
            </div>
          </div>

          {/* Mini Browse Button (without icon) */}
          <div className="shrink-0 px-2.5 py-1 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10.5px] font-medium shadow-2xs group-hover:shadow-xs transition-all active:scale-95 flex items-center justify-center">
            <span>Browse</span>
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
