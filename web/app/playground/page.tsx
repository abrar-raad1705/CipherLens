"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon as ArrowLeft,
  PlayIcon as Play,
  PauseIcon as Pause,
  ArrowPathIcon as RotateCcw,
  CheckIcon as Check,
  XMarkIcon as X,
  TrashIcon as Trash,
  PlusIcon as Plus,
  ArrowUpTrayIcon as Upload,
  DocumentIcon as FileText,
  PhotoIcon as ImageIcon,
  SparklesIcon as Sparkles,
  ShieldCheckIcon as ShieldCheck,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-image";

interface UploadFileItem {
  id: string;
  name: string;
  sizeStr: string;
  progress: number;
  status: "uploading" | "processing" | "completed";
  dataUri?: string;
}

export default function AnimationShowcasePage() {
  const { activeArtifact } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"circular" | "linear" | "batch" | "dark_crypto">("circular");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<"slow" | "normal" | "fast">("normal");

  // Single file upload simulation state
  const [fileProgress, setFileProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "completed">("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Batch upload items state
  const [batchItems, setBatchItems] = useState<UploadFileItem[]>([
    {
      id: "1",
      name: activeArtifact?.name || "optical_phase_target.png",
      sizeStr: "2.4 MB",
      progress: 100,
      status: "completed",
      dataUri: activeArtifact?.dataUri,
    },
    {
      id: "2",
      name: "fourier_calibration_mask.png",
      sizeStr: "1.8 MB",
      progress: 72,
      status: "uploading",
    },
    {
      id: "3",
      name: "arnold_cat_coordinate_map.png",
      sizeStr: "3.1 MB",
      progress: 35,
      status: "uploading",
    },
  ]);

  const defaultImg =
    activeArtifact?.dataUri ||
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=80";

  // Run authentic iLovePDF upload simulation
  const startSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSimulating(true);
    setUploadStatus("uploading");
    setFileProgress(0);

    const stepMs = simSpeed === "fast" ? 25 : simSpeed === "slow" ? 90 : 50;

    let p = 0;
    timerRef.current = setInterval(() => {
      p += Math.floor(Math.random() * 4) + 2;
      if (p >= 90 && p < 100) {
        setUploadStatus("processing");
      }
      if (p >= 100) {
        p = 100;
        setFileProgress(100);
        setUploadStatus("completed");
        setIsSimulating(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setFileProgress(p);
      }
    }, stepMs);
  };

  const resetSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSimulating(false);
    setFileProgress(0);
    setUploadStatus("idle");
  };

  useEffect(() => {
    startSimulation();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [simSpeed]);

  // Circular progress calculations for SVG
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fileProgress / 100) * circumference;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#27272a]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-mono text-xs text-[#a1a1aa] hover:text-[#3b82f6] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              OVERVIEW
            </Link>
            <span className="text-xs text-[#52525b]">/</span>
            <span className="font-mono text-xs text-[#3b82f6] font-medium">
              PLAYGROUND · ILOVEPDF UPLOAD ANIMATION
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-semibold text-[#f4f4f5] tracking-tight">
            iLovePDF Upload Animation Engine
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#a1a1aa] mt-1 max-w-3xl">
            Authentic iLovePDF-style upload experience: card elevation fly-in, circular radial SVG progress ring, real-time file size &amp; speed calculation, and completion checkmark transition.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="primary"
            onClick={startSimulation}
            disabled={isSimulating}
            className="h-8 gap-1.5 font-mono text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-xs"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{isSimulating ? `Uploading ${fileProgress}%` : "Replay Upload"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={resetSimulation}
            className="h-8 gap-1.5 font-mono text-xs border-[#27272a] text-[#a1a1aa] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>

          <Link href="/encryption">
            <Button size="sm" variant="outline" className="h-8 font-mono text-xs border-[#27272a] text-[#a1a1aa] hover:text-white">
              Back to Bench
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Bar: Mode Tabs, Speed & Progress Slider */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-[#27272a] bg-[#121214]/90 backdrop-blur-md">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-mono text-[11px] text-[#71717a] uppercase mr-1">Style:</span>
          {(
            [
              { id: "circular", label: "iLovePDF Circular Ring" },
              { id: "linear", label: "iLovePDF Linear Card" },
              { id: "batch", label: "iLovePDF Batch Queue" },
              { id: "dark_crypto", label: "CipherLens Dark Edition" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? "bg-[#3b82f6] text-white font-medium shadow-xs"
                  : "bg-[#18181b] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Speed Controls & Manual Progress Scrub */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-[#71717a] uppercase">Speed:</span>
            {(["slow", "normal", "fast"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSimSpeed(s)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] uppercase transition-colors cursor-pointer ${
                  simSpeed === s
                    ? "bg-[#3b82f6]/20 border border-[#3b82f6] text-[#3b82f6] font-semibold"
                    : "text-[#71717a] hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#71717a] uppercase">Scrub:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={fileProgress}
              onChange={(e) => {
                if (timerRef.current) clearInterval(timerRef.current);
                setIsSimulating(false);
                const val = Number(e.target.value);
                setFileProgress(val);
                setUploadStatus(val === 100 ? "completed" : val > 85 ? "processing" : "uploading");
              }}
              className="w-24 accent-[#3b82f6] cursor-pointer"
            />
            <span className="font-mono text-xs text-[#f4f4f5] w-9 text-right">{fileProgress}%</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Animation Display */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-[#27272a] bg-[#0c0c0e] rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="py-3.5 px-5 border-b border-[#27272a] flex flex-row items-center justify-between bg-[#121214]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-wider text-[#f4f4f5] font-medium">
                  {activeTab === "circular" && "Option 1: iLovePDF Iconic Circular Ring"}
                  {activeTab === "linear" && "Option 2: iLovePDF Linear Document Card"}
                  {activeTab === "batch" && "Option 3: iLovePDF Multi-File Batch Queue"}
                  {activeTab === "dark_crypto" && "Option 4: CipherLens Cryptographic Edition"}
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] text-[#3b82f6] border-[#3b82f6]/40">
                {uploadStatus === "completed"
                  ? "100% COMPLETE"
                  : uploadStatus === "processing"
                  ? "PROCESSING..."
                  : "UPLOADING"}
              </Badge>
            </CardHeader>

            <CardContent className="p-8 sm:p-12 min-h-[420px] flex items-center justify-center bg-[#09090b] relative overflow-hidden">
              {/* Subtle background grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: `radial-gradient(circle, #3b82f6 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />

              {/* -------------------------------------------------------------
                  MODE 1: iLovePDF Circular Ring Loader (The Classic)
                 ------------------------------------------------------------- */}
              {activeTab === "circular" && (
                <div className="w-full max-w-md mx-auto space-y-6 animate-in zoom-in-95 duration-200">
                  {/* Floating Elevated Card */}
                  <div className="relative p-5 rounded-2xl border border-[#27272a] bg-[#141417] shadow-2xl flex items-center justify-between gap-4 transition-all duration-300 hover:border-[#3b82f6]/50">
                    {/* Left: Thumbnail & File Metadata */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-14 h-16 rounded-xl bg-[#1c1c21] border border-[#2e2e38] overflow-hidden shrink-0 flex items-center justify-center shadow-inner group">
                        <img
                          src={defaultImg}
                          alt="File Preview"
                          className="w-full h-full object-cover opacity-80"
                        />
                        <span className="absolute bottom-1 right-1 font-mono text-[8px] font-bold bg-[#3b82f6] text-white px-1 rounded">
                          PNG
                        </span>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="font-sans text-sm font-semibold text-[#f4f4f5] truncate">
                          {activeArtifact?.name || "optical_phase_target.png"}
                        </div>
                        <div className="font-mono text-xs text-[#71717a] flex items-center gap-2">
                          <span>2.4 MB</span>
                          <span>·</span>
                          <span className="text-[#3b82f6]">
                            {uploadStatus === "completed"
                              ? "Uploaded"
                              : uploadStatus === "processing"
                              ? "Verifying buffer..."
                              : `${fileProgress}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Authentic iLovePDF Circular Progress Ring */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      {uploadStatus === "completed" ? (
                        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center animate-in zoom-in-75 duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          <Check className="h-7 w-7 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          {/* SVG Radial Progress Ring */}
                          <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 64 64">
                            {/* Track Circle */}
                            <circle
                              cx="32"
                              cy="32"
                              r={radius}
                              stroke="#27272a"
                              strokeWidth="4"
                              fill="none"
                            />
                            {/* Animated Active Progress Circle */}
                            <circle
                              cx="32"
                              cy="32"
                              r={radius}
                              stroke="#3b82f6"
                              strokeWidth="4"
                              fill="none"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-150 ease-out"
                            />
                          </svg>
                          {/* Percentage inside ring */}
                          <span className="absolute font-mono text-[11px] font-semibold text-[#f4f4f5]">
                            {fileProgress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Micro Hint Status */}
                  <div className="text-center font-mono text-xs text-[#71717a] flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-ping" />
                    <span>
                      {uploadStatus === "completed"
                        ? "Buffer loaded · Ready for cryptographic pipeline"
                        : "Ingesting image buffer into client memory..."}
                    </span>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  MODE 2: iLovePDF Linear Document Card with Horizontal Bar
                 ------------------------------------------------------------- */}
              {activeTab === "linear" && (
                <div className="w-full max-w-lg mx-auto space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="p-5 rounded-2xl border border-[#27272a] bg-[#141417] shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-sans text-sm font-semibold text-[#f4f4f5]">
                            {activeArtifact?.name || "optical_phase_target.png"}
                          </div>
                          <div className="font-mono text-xs text-[#71717a]">
                            2.4 MB of 2.4 MB · 1.8 MB/s
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={resetSimulation}
                        className="text-[#71717a] hover:text-white transition-colors"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Fluid Horizontal Progress Bar with Gradient Glow */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2.5 bg-[#202024] rounded-full overflow-hidden p-[1px]">
                        <div
                          className="h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                          style={{ width: `${fileProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between font-mono text-[11px] text-[#71717a]">
                        <span>{uploadStatus === "completed" ? "Completed" : "Uploading..."}</span>
                        <span className="text-[#3b82f6] font-medium">{fileProgress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  MODE 3: iLovePDF Multi-File Batch Queue
                 ------------------------------------------------------------- */}
              {activeTab === "batch" && (
                <div className="w-full max-w-lg mx-auto space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-mono text-xs text-[#71717a] uppercase">Files In Queue (3)</span>
                    <button
                      type="button"
                      className="font-mono text-xs text-[#3b82f6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Add more files
                    </button>
                  </div>

                  {batchItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-[#27272a] bg-[#141417] flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#202024] flex items-center justify-center text-[#3b82f6] shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans text-xs font-semibold text-[#f4f4f5] truncate">
                            {item.name}
                          </div>
                          <div className="font-mono text-[10px] text-[#71717a]">
                            {item.sizeStr} · {item.status === "completed" ? "Done" : `${item.progress}%`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === "completed" ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                            <Check className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        )}
                        <button
                          type="button"
                          className="text-[#52525b] hover:text-red-400 transition-colors p-1"
                          title="Remove file"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* -------------------------------------------------------------
                  MODE 4: CipherLens Dark Cryptographic Edition
                 ------------------------------------------------------------- */}
              {activeTab === "dark_crypto" && (
                <div className="w-full max-w-md mx-auto space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="p-[1px] rounded-2xl bg-gradient-to-r from-[#3b82f6]/40 via-[#6366f1]/35 to-[#a855f7]/40 shadow-xl">
                    <div className="p-6 rounded-[15px] bg-[#0c0c0e] flex flex-col items-center text-center space-y-4">
                      {/* Shield + Lock Image Protection Icon */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center">
                          <svg
                            className="h-8 w-8"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M10 6.5V5a2 2 0 1 1 4 0v1.5" strokeWidth="1.5" />
                            <path d="M8 14.5l2.5-2.5 3 3 2.5-2.5 1.5 1.5" strokeWidth="1.5" />
                            <circle cx="8.5" cy="10" r="1" fill="currentColor" />
                          </svg>
                        </div>
                        {uploadStatus === "completed" && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-sans text-base font-semibold text-[#f4f4f5]">
                          {activeArtifact?.name || "optical_phase_target.png"}
                        </h3>
                        <p className="font-mono text-xs text-[#71717a]">
                          512×512 px · 24-bit RGB · Ingested
                        </p>
                      </div>

                      {/* Progress Capsule */}
                      <div className="w-full space-y-2">
                        <div className="w-full h-1.5 bg-[#202024] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#3b82f6] transition-all duration-150"
                            style={{ width: `${fileProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between font-mono text-[10px] text-[#71717a]">
                          <span>SECURE BUFFER ALLOCATION</span>
                          <span className="text-[#3b82f6]">{fileProgress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Specifications & How it Compares */}
        <div className="space-y-5">
          <Card className="p-5 border border-[#27272a] bg-[#121214] rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <h3 className="font-sans text-sm font-semibold text-[#f4f4f5]">
                Why the iLovePDF Animation Works
              </h3>
            </div>
            <ul className="space-y-3 font-sans text-xs text-[#a1a1aa] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] font-mono text-sm leading-none mt-0.5">01</span>
                <span>
                  <strong className="text-[#f4f4f5]">Instant tactile feedback:</strong> The uploaded file immediately materializes as a physical card with preview thumbnail, so the user knows their file was registered.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] font-mono text-sm leading-none mt-0.5">02</span>
                <span>
                  <strong className="text-[#f4f4f5]">Radial circular progress:</strong> A circular ring draws the eye naturally to a single focal point, showing percentage completion without taking up wide horizontal space.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#3b82f6] font-mono text-sm leading-none mt-0.5">03</span>
                <span>
                  <strong className="text-[#f4f4f5]">Completion confirmation:</strong> The progress ring snaps into a clear checkmark badge before transitioning smoothly to the cryptographic workbench.
                </span>
              </li>
            </ul>
          </Card>

          <Card className="p-5 border border-[#27272a] bg-[#121214] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#3b82f6]" />
              <h3 className="font-sans text-sm font-semibold text-[#f4f4f5]">
                Dropzone Integration Status
              </h3>
            </div>
            <p className="font-sans text-xs text-[#a1a1aa] leading-relaxed">
              The primary dropzone in <strong className="text-white">/encryption</strong> and <strong className="text-white">/decryption</strong> has been updated with full-bleed drag listeners, gradient border, dot grid, and ghosted workflow preview cards.
            </p>
            <div className="pt-2">
              <Link href="/encryption">
                <Button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-sans text-xs">
                  Go Test Image Encryption Bench →
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
