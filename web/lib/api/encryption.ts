import { apiClient } from "./client";
import { DRPEEncryptResponse, DRPEDecryptResponse, TransformResponse } from "@/types/encryption";

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
