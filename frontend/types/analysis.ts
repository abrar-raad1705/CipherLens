export interface ScatterPoint {
  x: number;
  y: number;
}

export interface CorrelationData {
  coefficients: {
    horizontal: number;
    vertical: number;
    diagonal: number;
  };
  scatter_samples: {
    horizontal: ScatterPoint[];
    vertical: ScatterPoint[];
    diagonal: ScatterPoint[];
  };
  latency_ms: number;
}

export interface MetricsData {
  mse: number;
  psnr: number | string;
  ssim: number;
  npcr?: number | null;
  uaci?: number | null;
  latency_ms: number;
}

export interface HistogramData {
  bins: number[];
  mean: number;
  std: number;
  latency_ms: number;
}

export interface FullAnalysisData {
  entropy: {
    plain: number;
    cipher?: number;
    recovered?: number;
  };
  correlation: {
    plain: { horizontal: number; vertical: number; diagonal: number };
    cipher?: { horizontal: number; vertical: number; diagonal: number };
    recovered?: { horizontal: number; vertical: number; diagonal: number };
  };
  scatter: {
    plain: { horizontal: ScatterPoint[]; vertical: ScatterPoint[]; diagonal: ScatterPoint[] };
    cipher?: { horizontal: ScatterPoint[]; vertical: ScatterPoint[]; diagonal: ScatterPoint[] };
  };
  histograms: {
    plain: number[];
    cipher?: number[];
    recovered?: number[];
  };
  quality: {
    mse: number;
    psnr: number | string;
    ssim: number;
  };
  differential: {
    perturbed_pixel: string;
    npcr: number;
    uaci: number;
    npcr_expected: number;
    uaci_expected: number;
  };
  latency_ms: number;
}
