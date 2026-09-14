export interface DRPEStages {
  original: string;
  r1_phase: string;
  fourier_spectrum: string;
  r2_phase: string;
  ciphertext: string;
}

export interface DRPEEncryptResponse {
  status: string;
  algorithm: string;
  ciphertext: string;
  stages: DRPEStages;
  metadata: Record<string, unknown>;
  latency_ms: number;
}

export interface DRPEDecryptResponse {
  status: string;
  algorithm: string;
  decrypted_image: string;
  diff_heatmap?: string | null;
  quality: {
    mse?: number;
    psnr?: number | string;
    ssim?: number;
  };
  metadata: Record<string, unknown>;
  latency_ms: number;
}

export interface TransformResponse {
  status: string;
  algorithm: string;
  action: string;
  output_image: string;
  spectrum?: string;
  metadata: Record<string, unknown>;
  latency_ms: number;
}
