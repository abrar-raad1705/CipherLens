"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownTrayIcon as Download,
  ArrowPathIcon as RotateCcw,
  ChevronDownIcon as ChevronDown,
  Squares2X2Icon,
  AdjustmentsHorizontalIcon,
  SunIcon,
  SwatchIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";

import {
  DriveDropzone,
  UploadedImageInfo,
} from "@/components/upload/DriveDropzone";
import { useWorkspace } from "@/hooks/use-image";
import { useProcessing } from "@/hooks/use-processing";

// ─── Types ─────────────────────────────────────────────────────────────────────
type FilterMode =
  | "presets"
  | "custom"
  | "brightness_contrast"
  | "heatmap"
  | "invert"
  | null;

// ─── Jet Heatmap Palette Lookup Table (256 entries) ──────────────────────────
const HEATMAP_LUT = Array.from({ length: 256 }, (_, i) => {
  const t = i / 255;
  const r = Math.min(
    255,
    Math.max(
      0,
      Math.round(255 * Math.min(Math.max(1.5 - Math.abs(6 * t - 4.5), 0), 1)),
    ),
  );
  const g = Math.min(
    255,
    Math.max(
      0,
      Math.round(255 * Math.min(Math.max(1.5 - Math.abs(6 * t - 3.0), 0), 1)),
    ),
  );
  const b = Math.min(
    255,
    Math.max(
      0,
      Math.round(255 * Math.min(Math.max(1.5 - Math.abs(6 * t - 1.5), 0), 1)),
    ),
  );
  return [r, g, b];
});

interface PresetEntry {
  id: string;
  label: string;
  tag: string;
  /** Integer kernel values — server normalises by sum when needed */
  matrix: number[][];
  serverOp?: "gaussian" | "median" | "sobel" | "custom";
}

// ─── Preset catalogue (integer kernels) ───────────────────────────────────────
const PRESET_CATALOGUE: PresetEntry[] = [
  {
    id: "gaussian",
    label: "Gaussian Blur",
    tag: "LOW-PASS",
    serverOp: "gaussian",
    matrix: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ],
  },
  {
    id: "sharpen",
    label: "Sharpen",
    tag: "HIGH-BOOST",
    serverOp: "custom",
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  },
  {
    id: "sobel",
    label: "Sobel Edge",
    tag: "GRADIENT",
    serverOp: "sobel",
    matrix: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
  },
  {
    id: "laplacian",
    label: "Laplacian",
    tag: "2nd DERIVATIVE",
    serverOp: "custom",
    matrix: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
  },
  {
    id: "box_blur",
    label: "Box Blur",
    tag: "AVERAGING",
    serverOp: "custom",
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
  },
  {
    id: "edge_detect",
    label: "Edge Detection",
    tag: "CONTOUR",
    serverOp: "custom",
    matrix: [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0],
    ],
  },
];

const DEFAULT_CUSTOM_MATRIX: number[][] = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];

const IDENTITY_MATRIX: number[][] = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];

// ─── Normalise an integer kernel by its sum for canvas convolution ─────────────
function normaliseKernel(matrix: number[][]): number[][] {
  const sum = matrix.reduce((a, row) => a + row.reduce((b, v) => b + v, 0), 0);
  if (Math.abs(sum) < 0.0001) return matrix; // zero-sum kernel (edge detect) — leave unchanged
  return matrix.map((row) => row.map((v) => v / sum));
}

// ─── Main component ────────────────────────────────────────────────────────────
function ConvolutionBenchContent() {
  const router = useRouter();
  const { activeArtifact, addArtifact } = useWorkspace();

  const [uploadedImage, setUploadedImage] = useState<UploadedImageInfo | null>(
    null,
  );

  const { loading, error, result } = useProcessing();

  // ── Mode (none selected initially)
  const [filterMode, setFilterMode] = useState<FilterMode>(null);

  // ── Preset selection (none selected initially)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPreset = selectedPresetId
    ? (PRESET_CATALOGUE.find((p) => p.id === selectedPresetId) ?? null)
    : null;

  // ── Kernel matrices (integers)
  const [presetMatrix, setPresetMatrix] = useState<number[][]>(
    PRESET_CATALOGUE[0].matrix,
  );
  const [customMatrix, setCustomMatrix] = useState<number[][]>(
    DEFAULT_CUSTOM_MATRIX,
  );

  // ── Brightness: -50 to +50, center 0
  const [brightness, setBrightness] = useState<number>(0);
  // ── Contrast offset: -0.5 to +0.5, center 0 → actual multiplier = 1 + contrast
  const [contrast, setContrast] = useState<number>(0);

  // ── Live canvas result
  const [liveCanvasResult, setLiveCanvasResult] = useState<string | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVersionRef = useRef(0);
  const outputUrlRef = useRef<string | null>(null);
  const realtimeUpdaterRef = useRef<() => void>(() => undefined);

  const activeMatrix =
    filterMode === "presets" && selectedPreset
      ? presetMatrix
      : filterMode === "custom"
        ? customMatrix
        : IDENTITY_MATRIX;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const p = PRESET_CATALOGUE.find((x) => x.id === id);
    if (p) setPresetMatrix(p.matrix);
    setIsDropdownOpen(false);
  };

  const handleResetFilter = () => {
    setFilterMode(null);
    setSelectedPresetId(null);
    setPresetMatrix(PRESET_CATALOGUE[0].matrix);
    setCustomMatrix(DEFAULT_CUSTOM_MATRIX);
    if (brightness === 0 && contrast === 0) {
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      setLiveCanvasResult(null);
    }
  };

  const handleResetBC = () => {
    setBrightness(0);
    setContrast(0);
    if (filterMode === null && selectedPresetId === null) {
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      setLiveCanvasResult(null);
    }
  };

  const handleResetAll = () => {
    setFilterMode(null);
    setSelectedPresetId(null);
    setPresetMatrix(PRESET_CATALOGUE[0].matrix);
    setCustomMatrix(DEFAULT_CUSTOM_MATRIX);
    setBrightness(0);
    setContrast(0);
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setLiveCanvasResult(null);
  };

  // ── Build effective float kernel (contrast multiplier applied to spatial weights)
  const effectiveKernel = useMemo((): number[][] => {
    const contrastMult = 1 + contrast;
    const norm = normaliseKernel(activeMatrix);
    return norm.map((row) =>
      row.map((val) => Number((val * contrastMult).toFixed(4))),
    );
  }, [activeMatrix, contrast]);

  // DC Pixel Bias Offset: Brightness offset - mid-gray contrast pivot (128 * contrast)
  const effectiveBiasOffset = brightness - 128 * contrast;

  // ── Source image pixel data cache for instant lag-free canvas preview
  const srcCanvasRef = useRef<{
    width: number;
    height: number;
    data: Uint8ClampedArray;
  } | null>(null);

  // ── Live canvas preview. Keep this work bounded and publish frames off the
  // main interaction path so dragging a control never waits on PNG encoding.
  const updateRealtimeCanvas = useCallback(() => {
    const cached = srcCanvasRef.current;
    if (!cached) return;

    const { width, height, data: src } = cached;
    const canvas = outputCanvasRef.current ?? document.createElement("canvas");
    outputCanvasRef.current = canvas;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dstData = ctx.createImageData(width, height);
    const dst = dstData.data;
    const kernel = effectiveKernel;
    const biasOffset = effectiveBiasOffset;
    const kLen = kernel.length;
    const half = Math.floor(kLen / 2);
    const isPlainAdjustment = kLen === 3 &&
      activeMatrix === IDENTITY_MATRIX &&
      filterMode !== "presets" && filterMode !== "custom";
    const renderVersion = ++renderVersionRef.current;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        let r = 0,
          g = 0,
          b = 0;
        if (isPlainAdjustment) {
          const mult = 1 + contrast;
          r = src[outIdx] * mult;
          g = src[outIdx + 1] * mult;
          b = src[outIdx + 2] * mult;
        } else {
          for (let ky = 0; ky < kLen; ky++) {
            const iy = Math.min(Math.max(y + ky - half, 0), height - 1);
            for (let kx = 0; kx < kLen; kx++) {
              const ix = Math.min(Math.max(x + kx - half, 0), width - 1);
              const w = kernel[ky][kx];
              const idx = (iy * width + ix) * 4;
              r += src[idx] * w;
              g += src[idx + 1] * w;
              b += src[idx + 2] * w;
            }
          }
        }
        const pr = Math.min(255, Math.max(0, r + biasOffset));
        const pg = Math.min(255, Math.max(0, g + biasOffset));
        const pb = Math.min(255, Math.max(0, b + biasOffset));

        if (filterMode === "heatmap") {
          const gray = Math.min(
            255,
            Math.max(0, Math.round(0.299 * pr + 0.587 * pg + 0.114 * pb)),
          );
          const [hr, hg, hb] = HEATMAP_LUT[gray];
          dst[outIdx] = hr;
          dst[outIdx + 1] = hg;
          dst[outIdx + 2] = hb;
        } else if (filterMode === "invert") {
          dst[outIdx] = 255 - pr;
          dst[outIdx + 1] = 255 - pg;
          dst[outIdx + 2] = 255 - pb;
        } else {
          dst[outIdx] = pr;
          dst[outIdx + 1] = pg;
          dst[outIdx + 2] = pb;
        }
        dst[outIdx + 3] = 255;
      }
    }

    const isUnfiltered =
      filterMode === null &&
      selectedPresetId === null &&
      brightness === 0 &&
      contrast === 0;

    if (isUnfiltered) {
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      setLiveCanvasResult(null);
      return;
    }

    ctx.putImageData(dstData, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob || renderVersion !== renderVersionRef.current) return;
      const nextUrl = URL.createObjectURL(blob);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = nextUrl;
      setLiveCanvasResult(nextUrl);
    }, "image/jpeg", 0.88);
  }, [activeMatrix, effectiveKernel, effectiveBiasOffset, filterMode, selectedPresetId, brightness, contrast]);

  useEffect(() => {
    realtimeUpdaterRef.current = updateRealtimeCanvas;
  }, [updateRealtimeCanvas]);

  // Pre-decode & cache image pixels whenever activeArtifact changes
  useEffect(() => {
    if (!activeArtifact?.dataUri) {
      srcCanvasRef.current = null;
      setLiveCanvasResult(null);
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeArtifact.dataUri;
    img.onload = () => {
      const maxDim = 560; // bounded preview surface keeps pointer updates responsive
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      srcCanvasRef.current = { width: w, height: h, data: imgData.data };
      realtimeUpdaterRef.current();
    };
  }, [activeArtifact?.dataUri]);

  // Render the latest slider value once per animation frame. A trailing frame
  // is enough; intermediate values can be dropped while the pointer moves.
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(updateRealtimeCanvas);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateRealtimeCanvas]);

  useEffect(() => () => {
    renderVersionRef.current += 1;
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, []);

  // ── Download
  const handleDownload = () => {
    const outputImg =
      liveCanvasResult ||
      (result ? result.output_image : null) ||
      activeArtifact?.dataUri;
    if (!outputImg) return;
    const a = document.createElement("a");
    a.href = outputImg;
    a.download = `processed_${uploadedImage?.name ?? "image"}.png`;
    a.click();
  };

  const hasActiveFilter =
    filterMode !== null ||
    selectedPresetId !== null ||
    brightness !== 0 ||
    contrast !== 0;

  const currentOutputImage = hasActiveFilter
    ? (liveCanvasResult || (result ? result.output_image : activeArtifact?.dataUri))
    : activeArtifact?.dataUri;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-7xl py-1">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            PROCESSING
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Spatial Image Processing
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {uploadedImage && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={!currentOutputImage}
                className="group h-10 px-4 text-xs sm:text-sm font-medium rounded-lg border border-[#E8E8E3] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                title="Download Image"
              >
                <Download className="h-4 w-4 text-[#2563EB] dark:text-[#5B8CFF] group-hover:text-[#1D4ED8] dark:group-hover:text-[#7EA2FF] group-hover:translate-y-0.5 transition-all duration-200 shrink-0" />
                <span>Download Image</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUploadedImage(null);
                  setLiveCanvasResult(null);
                  setFilterMode(null);
                  setSelectedPresetId(null);
                }}
                className="group h-10 px-4 text-xs sm:text-sm font-medium rounded-lg border border-[#E8E8E3] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] shadow-xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4 text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] group-hover:-rotate-45 transition-transform duration-200 shrink-0" />
                <span>Change Image</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {!uploadedImage ? (
        <DriveDropzone
          title="Drop your image here"
          description=""
          actionLabel="Browse files"
          onImageUploaded={(img) => {
            setUploadedImage(img);
            addArtifact({
              name: img.name,
              dataUri: img.dataUri,
              width: img.width,
              height: img.height,
              sourceBench: "processing",
            });
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
          {/* Canvas */}
          <div className="lg:col-span-8 space-y-3">
            {activeArtifact?.dataUri ? (
              <SplitCompareCanvas
                beforeSrc={activeArtifact.dataUri}
                afterSrc={currentOutputImage || activeArtifact.dataUri}
                beforeLabel="ORIGINAL"
                afterLabel="PROCESSED"
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center rounded-md border border-[#E8E8E3] dark:border-[#292929] text-sm text-[#6F6F6A]">
                Loading image...
              </div>
            )}
          </div>

          {/* Controls */}
          <Card className="lg:col-span-4 p-3.5 space-y-4 overflow-visible border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#161616] shadow-xs">
            {/* ── FILTER METHOD ── */}
            <div className="space-y-3">
              <div className="flex min-h-7 items-center justify-between gap-2">
                <h2
                  id="filter-method-heading"
                  className="text-[11px] font-mono tracking-wider text-[#666660] dark:text-[#A0A09B] uppercase font-semibold"
                >
                  Filter Method
                </h2>
                <button
                  type="button"
                  onClick={handleResetAll}
                  disabled={
                    filterMode === null &&
                    selectedPresetId === null &&
                    brightness === 0 &&
                    contrast === 0
                  }
                  className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#555550] dark:text-[#B0B0AA] hover:bg-[#F4F4F1] dark:hover:bg-[#242424] hover:text-[#181818] dark:hover:text-[#F2F2F0] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] dark:focus-visible:outline-[#5B8CFF]"
                  title="Reset all filters and adjustments"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset all
                </button>
              </div>

              <div
                role="group"
                aria-labelledby="filter-method-heading"
                className="relative flex flex-col gap-2"
              >
                {[
                  {
                    id: "presets",
                    label: "Convolution Presets",
                    description: "Blur, emboss & detect edges",
                    icon: Squares2X2Icon,
                  },
                  {
                    id: "custom",
                    label: "Custom 2D Convolution",
                    description: "Build your own kernel",
                    icon: AdjustmentsHorizontalIcon,
                  },
                  {
                    id: "brightness_contrast",
                    label: "Brightness & Contrast",
                    description: "Tune light & tonal range",
                    icon: SunIcon,
                  },
                  {
                    id: "heatmap",
                    label: "Heatmap / Pseudo-Color",
                    description: "Map intensity to color",
                    icon: SwatchIcon,
                  },
                  {
                    id: "invert",
                    label: "Invert Colors",
                    description: "Reverse pixel intensities",
                    icon: ArrowsRightLeftIcon,
                  },
                ].map(({ id, label, description, icon: Icon }) => {
                  const isActive = filterMode === id;

                  return (
                    <div key={id} className="space-y-2">
                      <button
                        type="button"
                        aria-pressed={isActive}
                        aria-expanded={isActive}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setFilterMode((prev) =>
                            prev === id ? null : (id as FilterMode),
                          );
                        }}
                        className={[
                          "group w-full flex items-center gap-3 rounded-md border p-3 text-left transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] dark:focus-visible:outline-[#5B8CFF]",
                          isActive
                            ? "border-[#2563EB] dark:border-[#5B8CFF] bg-[#2563EB]/[0.03] dark:bg-[#5B8CFF]/[0.04]"
                            : "border-[#E8E8E3] dark:border-[#242424] bg-white dark:bg-[#141414] hover:border-[#D0D0CA] dark:hover:border-[#383838]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                            isActive
                              ? "bg-[#2563EB]/10 dark:bg-[#5B8CFF]/10 text-[#2563EB] dark:text-[#5B8CFF]"
                              : "bg-black/[0.03] dark:bg-white/[0.04] text-[#6F6F6A] dark:text-[#A0A09B]",
                          ].join(" ")}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="block text-sm font-medium leading-snug text-[#181818] dark:text-[#F2F2F0]">
                            {label}
                          </span>
                          <span className="block text-xs leading-relaxed text-[#555550] dark:text-[#CCCCCC]">
                            {description}
                          </span>
                        </span>
                        <ChevronDown
                          className={[
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            isActive
                              ? "rotate-180 text-[#2563EB] dark:text-[#5B8CFF]"
                              : "text-[#6F6F6A] dark:text-[#A0A09B] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0]",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                      </button>

                      {/* ── DROPDOWN PARAMETERS (DIRECTLY UNDER OPTION) ── */}
                      <div
                        className={[
                          "relative",
                          isActive
                            ? "z-20 block origin-top animate-in fade-in slide-in-from-top-1 duration-300 ease-out"
                            : "z-0 hidden",
                        ].join(" ")}
                      >
                        <div className="overflow-visible">
                          <div className="pt-1 pb-1">
                          {id === "presets" && (
                            <div className="space-y-3 rounded-md border border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#111] p-3.5">
                              <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                                Select Preset
                              </div>

                              {/* Dropdown */}
                              <div className="relative z-[201]" ref={dropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => setIsDropdownOpen((v) => !v)}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-[#D7D7D1] dark:border-[#3A3A3A] bg-white dark:bg-[#171717] hover:border-[#2563EB]/60 dark:hover:border-[#5B8CFF]/60 dark:hover:border-[#484848] text-sm text-[#181818] dark:text-[#F2F2F0] transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium truncate">
                                      {selectedPreset
                                        ? selectedPreset.label
                                        : "Select a Preset..."}
                                    </span>
                                    {selectedPreset && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F4F1] dark:bg-[#222] text-[#999993] dark:text-[#6A6A6A] shrink-0">
                                        {selectedPreset.tag}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 text-[#6F6F6A] shrink-0 transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
                                  />
                                </button>

                                {isDropdownOpen && (
                                  <div className="absolute z-[200] left-0 right-0 top-[calc(100%+4px)] rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#161616] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {PRESET_CATALOGUE.map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSelectPreset(p.id)}
                                        className={[
                                          "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer",
                                          p.id === selectedPresetId
                                            ? "bg-[#2563EB]/5 dark:bg-[#5B8CFF]/8 text-[#2563EB] dark:text-[#5B8CFF]"
                                            : "hover:bg-[#F4F4F1] dark:hover:bg-[#1E1E1E] text-[#181818] dark:text-[#F2F2F0]",
                                        ].join(" ")}
                                      >
                                        <span className="font-medium truncate">
                                          {p.label}
                                        </span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F4F1] dark:bg-[#222] text-[#999993] dark:text-[#6A6A6A] shrink-0">
                                          {p.tag}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Kernel matrix when a preset is selected */}
                              {selectedPreset && (
                                <div className="space-y-2 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
                                  <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#181818] dark:text-[#E8E8E3]">
                                      3 × 3 CONVOLUTION KERNEL
                                    </span>
                                    <span className="shrink-0 text-[11px] font-mono tracking-wider uppercase font-semibold text-[#2563EB] dark:text-[#7EA2FF]">
                                      SUM = {presetMatrix.flat().reduce((a, b) => a + b, 0)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[#F5F5F0] dark:bg-[#1A1A1A] border border-[#E8E8E3] dark:border-[#2F2F2F] p-1.5">
                                    {presetMatrix.map((row, rIdx) =>
                                      row.map((val, cIdx) => (
                                        <input
                                          key={`preset-${rIdx}-${cIdx}`}
                                          type="number"
                                          value={val}
                                          onChange={(e) => {
                                            const newMatrix = presetMatrix.map((r) => [...r]);
                                            newMatrix[rIdx][cIdx] = parseInt(e.target.value) || 0;
                                            setPresetMatrix(newMatrix);
                                          }}
                                          aria-label={`Kernel coefficient row ${rIdx + 1}, column ${cIdx + 1}`}
                                          className="w-full h-8 text-center font-mono text-sm font-semibold rounded-md border border-[#D7D7D1] dark:border-[#383838] bg-white dark:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] hover:border-[#AFAFAA] dark:hover:border-[#505050] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#5B8CFF] focus:ring-1 focus:ring-[#2563EB]/30 dark:focus:ring-[#5B8CFF]/30 transition-colors"
                                        />
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {id === "custom" && (
                            <div className="space-y-3 rounded-md border border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#111] p-3.5">
                              <div className="space-y-2">
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#181818] dark:text-[#E8E8E3]">
                                    3 × 3 CONVOLUTION KERNEL
                                  </span>
                                  <span className="shrink-0 text-[11px] font-mono tracking-wider uppercase font-semibold text-[#2563EB] dark:text-[#7EA2FF]">
                                    SUM = {customMatrix.flat().reduce((a, b) => a + b, 0)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[#F5F5F0] dark:bg-[#1A1A1A] border border-[#E8E8E3] dark:border-[#2F2F2F] p-1.5">
                                  {customMatrix.map((row, rIdx) =>
                                    row.map((val, cIdx) => (
                                      <input
                                        key={`custom-${rIdx}-${cIdx}`}
                                        type="number"
                                        value={val}
                                        onChange={(e) => {
                                          const newMatrix = customMatrix.map((r) => [...r]);
                                          newMatrix[rIdx][cIdx] = parseInt(e.target.value) || 0;
                                          setCustomMatrix(newMatrix);
                                        }}
                                        aria-label={`Custom kernel coefficient row ${rIdx + 1}, column ${cIdx + 1}`}
                                        className="w-full h-8 text-center font-mono text-sm font-semibold rounded-md border border-[#D7D7D1] dark:border-[#383838] bg-white dark:bg-[#242424] text-[#181818] dark:text-[#F2F2F0] hover:border-[#AFAFAA] dark:hover:border-[#505050] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#5B8CFF] focus:ring-1 focus:ring-[#2563EB]/30 dark:focus:ring-[#5B8CFF]/30 transition-colors"
                                      />
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {id === "brightness_contrast" && (
                            <div className="space-y-4 rounded-md border border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#111] p-3.5">
                              <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#666660] dark:text-[#A0A09B] uppercase font-semibold">
                                <span>BRIGHTNESS &amp; CONTRAST</span>
                                {(brightness !== 0 || contrast !== 0) && (
                                  <button
                                    type="button"
                                    onClick={handleResetBC}
                                    className="flex items-center gap-1 text-[11px] text-[#555550] dark:text-[#B0B0AA] hover:text-[#2563EB] dark:hover:text-[#5B8CFF] transition-colors cursor-pointer capitalize font-sans font-medium"
                                    title="Reset brightness and contrast to 0"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" />
                                    <span>Reset B&amp;C</span>
                                  </button>
                                )}
                              </div>

                              {/* Brightness: −50 to +50, centre 0 */}
                              <Slider
                                label="Brightness"
                                hint="−50   0   +50"
                                value={brightness}
                                valueDisplay={
                                  brightness > 0 ? `+${brightness}` : String(brightness)
                                }
                                min={-50}
                                max={50}
                                step={1}
                                onChange={(e) => setBrightness(Number(e.target.value))}
                              />

                              {/* Contrast: −0.5 to +0.5, centre 0 (multiplier = 1 + value) */}
                              <Slider
                                label="Contrast"
                                hint="−0.5   0   +0.5"
                                value={contrast}
                                valueDisplay={
                                  contrast > 0
                                    ? `+${contrast.toFixed(2)}`
                                    : contrast.toFixed(2)
                                }
                                min={-0.5}
                                max={0.5}
                                step={0.05}
                                onChange={(e) => setContrast(Number(e.target.value))}
                              />

                              {/* Brightness & Contrast Transfer Equation */}
                              {(() => {
                                const bVal = brightness;
                                const cVal = contrast;
                                const bStr = bVal > 0 ? `+${bVal}` : `${bVal}`;
                                const cStr = cVal > 0 ? `+${cVal.toFixed(2)}` : `${cVal.toFixed(2)}`;
                                const scale = Number((1 + cVal).toFixed(2));
                                const biasNum = Number(effectiveBiasOffset.toFixed(1));
                                const biasFormatted = biasNum % 1 === 0 ? biasNum : biasNum.toFixed(1);
                                const biasSignStr = biasNum >= 0 ? `+ ${biasFormatted}` : `− ${Math.abs(Number(biasFormatted))}`;

                                const stateLabel =
                                  bVal === 0 && cVal === 0
                                    ? "Baseline Identity"
                                    : bVal >= 0 && cVal >= 0
                                      ? "High Brightness + High Contrast"
                                      : bVal >= 0 && cVal < 0
                                        ? "High Brightness + Low Contrast"
                                        : bVal < 0 && cVal >= 0
                                          ? "Low Brightness + High Contrast"
                                          : "Low Brightness + Low Contrast";

                                return (
                                  <div className="space-y-2.5 pt-3 border-t border-[#E8E8E3] dark:border-[#292929]">
                                    <div className="flex items-baseline justify-between gap-3">
                                      <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#181818] dark:text-[#E8E8E3]">
                                        TRANSFER EQUATION
                                      </span>
                                      <span className="shrink-0 text-[11px] font-mono tracking-wider uppercase font-semibold text-[#2563EB] dark:text-[#7EA2FF]">
                                        {stateLabel} (B = {bStr}, C = {cStr})
                                      </span>
                                    </div>

                                    <div className="rounded-lg bg-[#F5F5F0] dark:bg-[#1A1A1A] border border-[#E8E8E3] dark:border-[#2F2F2F] p-3 space-y-2 text-xs font-mono">
                                      <div className="text-[#6F6F6A] dark:text-[#A0A09B] text-[11px]">
                                        Here, the parameters are:
                                      </div>

                                      <ul className="space-y-1.5 pl-1 text-[#181818] dark:text-[#F2F2F0]">
                                        <li className="flex items-start gap-2">
                                          <span className="text-[#2563EB] dark:text-[#7EA2FF]">•</span>
                                          <span>
                                            <span className="text-[#6F6F6A] dark:text-[#A0A09B]">effectiveBiasOffset</span> = {bVal} − (128 × {cVal.toFixed(2)}) = <strong className="font-semibold text-[#2563EB] dark:text-[#7EA2FF]">{biasFormatted}</strong>
                                          </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <span className="text-[#2563EB] dark:text-[#7EA2FF]">•</span>
                                          <span>
                                            <span className="text-[#6F6F6A] dark:text-[#A0A09B]">Scale factor:</span> 1 + C = <strong className="font-semibold text-[#2563EB] dark:text-[#7EA2FF]">{scale}</strong>
                                          </span>
                                        </li>
                                        <li className="flex items-start gap-2 pt-1 border-t border-[#E8E8E3]/60 dark:border-[#2F2F2F]">
                                          <span className="text-[#2563EB] dark:text-[#7EA2FF]">•</span>
                                          <span className="font-medium text-[#181818] dark:text-[#F2F2F0] flex flex-wrap items-center gap-1.5">
                                            <span>Formula:</span>
                                            <span className="bg-white dark:bg-[#121212] px-2 py-0.5 rounded border border-[#E8E8E3] dark:border-[#333] text-[#2563EB] dark:text-[#5B8CFF] font-semibold">
                                              Pixel<sub>out</sub> = clamp<sub>[0, 255]</sub>({scale} × Pixel<sub>in</sub> {biasSignStr})
                                            </span>
                                          </span>
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {id === "heatmap" && (
                            <div className="space-y-3 rounded-md border border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#111] p-3.5">
                              <div className="flex items-center justify-between gap-3 text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                                <span>HEATMAP / PSEUDO-COLOR MAP</span>
                                <span className="text-[#2563EB] dark:text-[#7EA2FF]">INTENSITY</span>
                              </div>
                              <div className="rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] p-4 space-y-3">
                                <div className="h-7 w-full rounded-lg shadow-inner" style={{ background: "linear-gradient(90deg, #1746D1 0%, #4D7BD0 20%, #B4B9A3 38%, #F5C500 54%, #FF8A00 76%, #E5180A 100%)" }} />
                                <div className="flex justify-between px-1 text-[11px] font-mono text-[#777B75] dark:text-[#A3A7A2]">
                                  <span>0 <span className="text-[#999993] dark:text-[#6A6A6A]">(Dark)</span></span>
                                  <span>128</span>
                                  <span>255 <span className="text-[#999993] dark:text-[#6A6A6A]">(Bright)</span></span>
                                </div>
                              </div>
                            </div>
                          )}

                          {id === "invert" && (
                            <div className="space-y-3 rounded-md border border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8] dark:bg-[#111] p-3.5">
                              <div className="flex items-center justify-between gap-3 text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                                <span>COLOR INVERSION</span>
                                <span className="text-[#2563EB] dark:text-[#7EA2FF]">NEGATIVE</span>
                              </div>
                              <div className="rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] px-4 py-5 text-center space-y-3">
                                <p className="text-xl sm:text-2xl font-mono text-[#2563EB] dark:text-[#5B8CFF] font-semibold tracking-tight">
                                  RGB<sub>out</sub> <span className="text-[#777B75] dark:text-[#A3A7A2]">=</span> 255 <span className="text-[#777B75] dark:text-[#A3A7A2]">−</span> RGB<sub>in</sub>
                                </p>
                                <p className="text-sm leading-relaxed text-[#6F6F6A] dark:text-[#A0A09B] max-w-sm mx-auto">
                                  Reverses color channel values to produce a photographic negative preview.
                                </p>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
          </div>

            {/* ── ERRORS ── */}
            {error && (
              <div className="text-xs text-[#DC2626] font-mono text-center py-1">
                Error: {error}
              </div>
            )}


          </Card>
        </div>
      )}
    </div>
  );
}

export default function ConvolutionBenchPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-[#6F6F6A]">Loading...</div>}
    >
      <ConvolutionBenchContent />
    </Suspense>
  );
}
