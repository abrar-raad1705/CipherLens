import { apiClient } from "./client";
import {
  DRPEEncryptResponse,
  DRPEDecryptResponse,
  TransformResponse,
  KeyFileV2,
  EncryptResponseV2,
  DecryptResponseV2,
} from "@/types/encryption";


export async function runDRPEEncrypt(
  image: string,
  seed1: number = 1234,
  seed2: number = 5678
): Promise<DRPEEncryptResponse> {
  return apiClient<DRPEEncryptResponse>("/api/encryption/drpe/encrypt", {
    method: "POST",
    body: JSON.stringify({ image, seed1, seed2 }),
  });
}

export async function runDRPEDecrypt(
  ciphertext: string,
  seed1: number = 1234,
  seed2: number = 5678,
  reference_image?: string
): Promise<DRPEDecryptResponse> {
  return apiClient<DRPEDecryptResponse>("/api/encryption/drpe/decrypt", {
    method: "POST",
    body: JSON.stringify({ ciphertext, seed1, seed2, reference_image }),
  });
}

export async function runFourier(
  image: string,
  seed: number = 100,
  action: "encrypt" | "decrypt" = "encrypt"
): Promise<TransformResponse> {
  return apiClient<TransformResponse>("/api/encryption/fourier", {
    method: "POST",
    body: JSON.stringify({ image, seed, action }),
  });
}

export async function runDCT(
  image: string,
  seed: number = 42,
  action: "encrypt" | "decrypt" = "encrypt"
): Promise<TransformResponse> {
  return apiClient<TransformResponse>("/api/encryption/dct", {
    method: "POST",
    body: JSON.stringify({ image, seed, action }),
  });
}

export async function runArnoldXOR(
  image: string,
  itr: number = 10,
  xor_value: number = 170,
  action: "encrypt" | "decrypt" = "encrypt"
): Promise<TransformResponse> {
  return apiClient<TransformResponse>("/api/encryption/arnold-xor", {
    method: "POST",
    body: JSON.stringify({ image, itr, xor_value, action }),
  });
}

export async function preloadDRPECiphertext(
  ciphertext_real: string,
  ciphertext_imag: string,
  ciphertext_shape: number[],
  visual_uri: string
): Promise<{ status: string; shape: number[]; message: string }> {
  return apiClient("/api/encryption/drpe/preload", {
    method: "POST",
    body: JSON.stringify({ ciphertext_real, ciphertext_imag, ciphertext_shape, visual_uri }),
  });
}

export async function preloadFourierCiphertext(
  ciphertext_real: string,
  ciphertext_imag: string,
  ciphertext_shape: number[],
  visual_uri: string
): Promise<{ status: string; shape: number[]; message: string }> {
  return apiClient("/api/encryption/fourier/preload", {
    method: "POST",
    body: JSON.stringify({ ciphertext_real, ciphertext_imag, ciphertext_shape, visual_uri }),
  });
}

export async function preloadDCTCiphertext(
  ciphertext_real: string,
  ciphertext_shape: number[],
  visual_uri: string
): Promise<{ status: string; shape: number[]; message: string }> {
  return apiClient("/api/encryption/dct/preload", {
    method: "POST",
    body: JSON.stringify({ ciphertext_real, ciphertext_shape, visual_uri }),
  });
}

export async function runChaos(
  image: string,
  x0: number = 0.4,
  r: number = 3.99,
  action: "encrypt" | "decrypt" = "encrypt"
): Promise<TransformResponse> {
  return apiClient<TransformResponse>("/api/encryption/chaos", {
    method: "POST",
    body: JSON.stringify({ image, x0, r, action }),
  });
}

export async function runSpectralHybrid(
  image: string,
  scramble_seed: number = 42,
  mask_seed: number = 99,
  kernel_seed: number = 7,
  action: "encrypt" | "decrypt" = "encrypt"
): Promise<TransformResponse> {
  return apiClient<TransformResponse>("/api/encryption/spectral-hybrid", {
    method: "POST",
    body: JSON.stringify({ image, scramble_seed, mask_seed, kernel_seed, action }),
  });
}

export async function preloadSpectralHybridCiphertext(
  ciphertext_real: string,
  ciphertext_imag: string,
  ciphertext_shape: number[],
  visual_uri: string
): Promise<{ status: string; shape: number[]; message: string }> {
  return apiClient("/api/encryption/spectral-hybrid/preload", {
    method: "POST",
    body: JSON.stringify({ ciphertext_real, ciphertext_imag, ciphertext_shape, visual_uri }),
  });
}

export async function runFeistel(
  image: string,
  seed: number = 42,
  rounds: number = 8,
  action: "encrypt" | "decrypt" = "encrypt"
): Promise<TransformResponse> {
  return apiClient<TransformResponse>("/api/encryption/feistel", {
    method: "POST",
    body: JSON.stringify({ image, seed, rounds, action }),
  });
}

// ── Layer 2 Endpoints ──────────────────────────────────────────────

export async function runV2Encrypt(
  image: string,
  algorithm: string,
  parameters: Record<string, unknown> = {}
): Promise<EncryptResponseV2> {
  return apiClient<EncryptResponseV2>("/api/encryption/v2/encrypt", {
    method: "POST",
    body: JSON.stringify({ image, algorithm, parameters }),
  });
}

export async function runV2Decrypt(
  ciphertext: string,
  key_file: KeyFileV2 | string | Record<string, unknown>,
  reference_image?: string | null
): Promise<DecryptResponseV2> {
  return apiClient<DecryptResponseV2>("/api/encryption/v2/decrypt", {
    method: "POST",
    body: JSON.stringify({ ciphertext, key_file, reference_image }),
  });
}

