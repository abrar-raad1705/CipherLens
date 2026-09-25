"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownTrayIcon as Download,
  ArrowPathIcon as RotateCcw,
  ChevronDownIcon as ChevronDown,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { SplitCompareCanvas } from "@/components/image/SplitCompareCanvas";
import { KernelGrid } from "@/components/processing/KernelGrid";
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
    id: "median",
    label: "Median Filter",
    tag: "NOISE REDUCTION",
    serverOp: "median",
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
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
    id: "sharpen",
    label: "Sharpen",
    tag: "HIGH-PASS",
    serverOp: "custom",
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
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
    id: "emboss",
    label: "Emboss",
    tag: "RELIEF",
    serverOp: "custom",
    matrix: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
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
  {
    id: "high_pass",
    label: "High Pass",
    tag: "FREQUENCY",
    serverOp: "custom",
    matrix: [
      [-1, -1, -1],
      [-1, 9, -1],
      [-1, -1, -1],
    ],
  },
  {
    id: "low_pass",
    label: "Low Pass",
    tag: "SMOOTHING",
    serverOp: "custom",
    matrix: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
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
  };

  const handleResetBC = () => {
    setBrightness(0);
    setContrast(0);
  };

  const handleResetAll = () => {
    setFilterMode(null);
    setSelectedPresetId(null);
    setPresetMatrix(PRESET_CATALOGUE[0].matrix);
    setCustomMatrix(DEFAULT_CUSTOM_MATRIX);
    setBrightness(0);
    setContrast(0);
  };

  // ── Build effective float kernel (contrast multiplier applied to spatial weights)
  const buildEffectiveKernel = useCallback((): number[][] => {
    const contrastMult = 1 + contrast;
    const norm = normaliseKernel(activeMatrix);
    return norm.map((row) =>
      row.map((val) => Number((val * contrastMult).toFixed(4))),
    );
  }, [activeMatrix, contrast]);

  const effectiveKernel = buildEffectiveKernel();
  // DC Pixel Bias Offset: Brightness offset - mid-gray contrast pivot (128 * contrast)
  const effectiveBiasOffset = brightness - 128 * contrast;

  // ── Source image pixel data cache for instant lag-free canvas preview
  const srcCanvasRef = useRef<{
    width: number;
    height: number;
    data: Uint8ClampedArray;
  } | null>(null);

  // ── Live canvas convolution using cached source pixels
  const updateRealtimeCanvas = useCallback(() => {
    const cached = srcCanvasRef.current;
    if (!cached) return;

    const { width, height, data: src } = cached;
    const canvas = document.createElement("canvas");
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

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0;
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
        const outIdx = (y * width + x) * 4;
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
    ctx.putImageData(dstData, 0, 0);
    setLiveCanvasResult(canvas.toDataURL("image/png"));
  }, [effectiveKernel, effectiveBiasOffset, filterMode]);

  // Pre-decode & cache image pixels whenever activeArtifact changes
  useEffect(() => {
    if (!activeArtifact?.dataUri) {
      srcCanvasRef.current = null;
      setLiveCanvasResult(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeArtifact.dataUri;
    img.onload = () => {
      const maxDim = 800; // max preview resolution for ultra-fast response
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
      updateRealtimeCanvas();
    };
  }, [activeArtifact?.dataUri, updateRealtimeCanvas]);

  // Ultra-responsive 50ms debounced update
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateRealtimeCanvas();
    }, 50);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [updateRealtimeCanvas]);

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

  const currentOutputImage =
    liveCanvasResult ||
    (result ? result.output_image : activeArtifact?.dataUri);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl py-2">
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-3">
        <div>
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
            PROCESSING
          </div>
          <h1 className="text-2xl font-normal text-[#181818] dark:text-[#F2F2F0] mt-0.5">
            Spatial Image Processing
          </h1>
        </div>
      </div>

      {!uploadedImage ? (
        <DriveDropzone
          title="Drop your image here"
          description="PNG, JPG, WEBP, BMP supported"
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
          <Card className="lg:col-span-4 p-5 space-y-5 overflow-visible">
            {/* ── FILTER METHOD ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                <span>FILTER METHOD</span>
                {(filterMode !== null ||
                  selectedPresetId !== null ||
                  brightness !== 0 ||
                  contrast !== 0) && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="flex items-center gap-1 text-[10px] text-[#6F6F6A] hover:text-[#DC2626] dark:hover:text-[#EF4444] transition-colors cursor-pointer capitalize font-sans"
                    title="Reset all filters, brightness, contrast, and matrices"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Reset All</span>
                  </button>
                )}
              </div>

              {/* Stacked filter method buttons */}
              <div className="flex flex-col gap-2">
                {[
                  { id: "presets", label: "Convolution Presets" },
                  { id: "custom", label: "Custom 2D Convolution" },
                  { id: "brightness_contrast", label: "Brightness & Contrast" },
                  { id: "heatmap", label: "Heatmap / Pseudo-Color" },
                  { id: "invert", label: "Invert Colors" },
                ].map(({ id, label }) => {
                  const isActive = filterMode === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setFilterMode((prev) =>
                          prev === id ? null : (id as FilterMode),
                        )
                      }
                      className={[
                        "w-full py-3 px-4 rounded-lg border transition-all duration-150 cursor-pointer text-center font-medium text-sm sm:text-base flex items-center justify-center gap-2",
                        isActive
                          ? "border-[#2563EB] dark:border-[#5B8CFF] bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 text-[#2563EB] dark:text-[#5B8CFF] font-semibold shadow-sm hover:bg-[#2563EB]/15 dark:hover:bg-[#5B8CFF]/20"
                          : "border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#141414] text-[#6F6F6A] dark:text-[#A0A09B] hover:border-[#2563EB]/60 dark:hover:border-[#5B8CFF]/60 hover:bg-[#2563EB]/5 dark:hover:bg-[#5B8CFF]/10 hover:text-[#2563EB] dark:hover:text-[#5B8CFF]",
                      ].join(" ")}
                    >
                      <span>{label}</span>
                      {isActive && (
                        <span className="h-2 w-2 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF] shrink-0 ring-2 ring-[#2563EB]/30 dark:ring-[#5B8CFF]/30" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── PRESETS ── */}
            {filterMode === "presets" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase text-center">
                  Select Preset
                </div>

                {/* Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#141414] hover:border-[#B0B0A8] dark:hover:border-[#484848] text-sm text-[#181818] dark:text-[#F2F2F0] transition-colors cursor-pointer"
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
                    <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#161616] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
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

                {/* Always show kernel matrix when a preset is selected */}
                {selectedPreset && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
                      <span>Kernel Matrix (integers)</span>
                      <button
                        type="button"
                        onClick={() => setPresetMatrix(selectedPreset.matrix)}
                        className="flex items-center gap-0.5 hover:text-[#2563EB] dark:hover:text-[#5B8CFF] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                    <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#111]">
                      <KernelGrid
                        matrix={presetMatrix}
                        onChange={setPresetMatrix}
                      />
                    </div>
                    <p className="text-[10px] text-[#999993] dark:text-[#6A6A6A] text-center">
                      ↑↓ or scroll ±1 · Shift+↑↓ ±5 · ←→ navigate
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── CUSTOM MODE ── */}
            {filterMode === "custom" && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase text-center">
                  Custom Kernel Matrix
                </div>
                <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#111]">
                  <KernelGrid
                    matrix={customMatrix}
                    onChange={setCustomMatrix}
                  />
                </div>
                <p className="text-[10px] text-[#999993] dark:text-[#6A6A6A] text-center">
                  Click & type · ↑↓ ±1 · Shift+↑↓ ±5 · scroll ±1
                </p>
              </div>
            )}

            {/* ── BRIGHTNESS & CONTRAST MODE ── */}
            {filterMode === "brightness_contrast" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase font-medium">
                  <span>BRIGHTNESS &amp; CONTRAST</span>
                  {(brightness !== 0 || contrast !== 0) && (
                    <button
                      type="button"
                      onClick={handleResetBC}
                      className="flex items-center gap-1 text-[10px] text-[#6F6F6A] hover:text-[#2563EB] dark:hover:text-[#5B8CFF] transition-colors cursor-pointer capitalize font-sans"
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

                {/* Effective Kernel Weights & Pixel Bias */}
                <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#0F0F0F] space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#999993] dark:text-[#6A6A6A] uppercase tracking-wider">
                    <span>Effective Kernel Weights</span>
                    <span className="text-[#2563EB] dark:text-[#5B8CFF]">
                      Scale: ×{(1 + contrast).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {effectiveKernel.map((row, r) =>
                      row.map((cell, c) => {
                        const sz = effectiveKernel.length;
                        const isCenter =
                          r === Math.floor(sz / 2) && c === Math.floor(sz / 2);
                        return (
                          <div
                            key={`ek-${r}-${c}`}
                            className={[
                              "text-center py-1.5 text-[11px] font-mono rounded border",
                              isCenter
                                ? "bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 border-[#2563EB]/40 dark:border-[#5B8CFF]/40 text-[#2563EB] dark:text-[#5B8CFF] font-semibold"
                                : "bg-white dark:bg-[#181818] border-[#E8E8E3] dark:border-[#2D2D2D] text-[#181818] dark:text-[#F2F2F0]",
                            ].join(" ")}
                          >
                            {parseFloat(cell.toFixed(3))}
                          </div>
                        );
                      }),
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-[#E8E8E3]/60 dark:border-[#292929]/60">
                    <span className="text-[#6F6F6A] dark:text-[#A0A09B]">
                      Brightness Pixel Bias:
                    </span>
                    <span className="font-semibold text-[#181818] dark:text-[#F2F2F0]">
                      {effectiveBiasOffset >= 0
                        ? `+${effectiveBiasOffset.toFixed(1)}`
                        : effectiveBiasOffset.toFixed(1)}{" "}
                      px
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── HEATMAP MODE ── */}
            {filterMode === "heatmap" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase text-center">
                  HEATMAP / PSEUDO-COLOR MAP
                </div>
                <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#0F0F0F] space-y-2 text-center">
                  <div className="h-4 w-full rounded bg-gradient-to-r from-blue-700 via-green-500 via-yellow-400 to-red-600 shadow-inner" />
                  <div className="flex justify-between text-[10px] font-mono text-[#999993] dark:text-[#6A6A6A] px-1">
                    <span>0 (Dark)</span>
                    <span>128</span>
                    <span>255 (Bright)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── INVERT MODE ── */}
            {filterMode === "invert" && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase text-center">
                  COLOR INVERSION
                </div>
                <div className="p-3 rounded-lg border border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#0F0F0F] text-center space-y-1">
                  <p className="text-xs font-mono text-[#2563EB] dark:text-[#5B8CFF] font-semibold">
                    RGB<sub>out</sub> = 255 − RGB<sub>in</sub>
                  </p>
                  <p className="text-[11px] text-[#6F6F6A] dark:text-[#A0A09B]">
                    Reverses color channel values to produce a photographic
                    negative preview.
                  </p>
                </div>
              </div>
            )}

            {/* ── ERRORS ── */}
            {error && (
              <div className="text-xs text-[#DC2626] font-mono text-center py-1">
                Error: {error}
              </div>
            )}

            {/* ── ACTIONS ── */}
            <div className="pt-2 border-t border-[#E8E8E3] dark:border-[#292929]">
              <Button
                variant="primary"
                onClick={handleDownload}
                disabled={!currentOutputImage}
                className="w-full h-9"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                <span>Download Image</span>
              </Button>
            </div>
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
