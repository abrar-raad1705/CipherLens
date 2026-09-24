export interface DRPEStages {
  original: string;
  r1_phase: string;
  fourier_spectrum: string;
  r2_phase: string;
  ciphertext: string;
  [key: string]: string;
}

export interface DRPEEncryptResponse {
  status: string;
  algorithm: string;
  ciphertext: string;
  stages: DRPEStages;
  metadata: Record<string, unknown>;
  latency_ms: number;
  // Complex ciphertext package for JSON key file (cross-session decryption)
  ciphertext_real?: string;
  ciphertext_imag?: string;
  ciphertext_shape?: number[];
}

export interface DRPEDecryptResponse {
  status: string;
  algorithm: string;
  decrypted_image: string;
  diff_heatmap?: string | null;
  stages?: Record<string, string>;
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
  stages?: Record<string, string>;
  metadata: Record<string, unknown>;
  latency_ms: number;
  ciphertext_real?: string;
  ciphertext_imag?: string;
  ciphertext_shape?: number[];
}

// ── Layer 2 Structured Interfaces ──────────────────────────────────

export interface AuthenticationMetaV2 {
  algorithm: string;
  tag: string;
}

export interface KeyFileV2 {
  format_version: number;
  algorithm: string;
  created_at: string;
  master_key: string;
  salt: string;
  nonce?: string | null;
  parameters: Record<string, unknown>;
  dimensions: [number, number] | number[];
  raw_dtype: string;
  authentication: AuthenticationMetaV2;
}

export interface EncryptRequestV2 {
  image: string;
  algorithm: string;
  parameters?: Record<string, unknown>;
}

export interface EncryptResponseV2 {
  status: string;
  algorithm: string;
  ciphertext: string;
  stages: Record<string, string>;
  key_file: KeyFileV2;
  key_file_text: string;
  metadata: Record<string, unknown>;
  latency_ms: number;
}

export interface DecryptRequestV2 {
  ciphertext: string;
  key_file: KeyFileV2 | string | Record<string, unknown>;
  reference_image?: string | null;
}

export interface DecryptResponseV2 {
  status: string;
  algorithm: string;
  decrypted_image: string;
  diff_heatmap?: string | null;
  stages: Record<string, string>;
  quality: {
    mse?: number;
    psnr?: number | string;
    ssim?: number;
  };
  metadata: Record<string, unknown>;
  latency_ms: number;
}

