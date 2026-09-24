"use client";

import { useState } from "react";
import {
  runArnoldXOR,
  runChaos,
  runDCT,
  runDRPEDecrypt,
  runDRPEEncrypt,
  runFeistel,
  runFourier,
  runSpectralHybrid,
  runV2Decrypt,
  runV2Encrypt,
} from "@/lib/api/encryption";
import {
  DRPEEncryptResponse,
  DRPEDecryptResponse,
  TransformResponse,
  KeyFileV2,
  EncryptResponseV2,
  DecryptResponseV2,
} from "@/types/encryption";

export function useEncryption() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drpeEncryptResult, setDrpeEncryptResult] = useState<DRPEEncryptResponse | null>(null);
  const [drpeDecryptResult, setDrpeDecryptResult] = useState<DRPEDecryptResponse | null>(null);
  const [transformResult, setTransformResult] = useState<TransformResponse | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    return err instanceof Error ? err.message : fallback;
  };

  const executeDRPEEncrypt = async (imageUri: string, seed1: number, seed2: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runDRPEEncrypt(imageUri, seed1, seed2);
      setDrpeEncryptResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "DRPE encryption failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeDRPEDecrypt = async (
    ciphertextUri: string,
    seed1: number,
    seed2: number,
    referenceUri?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runDRPEDecrypt(ciphertextUri, seed1, seed2, referenceUri);
      setDrpeDecryptResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "DRPE decryption failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeFourier = async (imageUri: string, seed: number, action: "encrypt" | "decrypt") => {
    setLoading(true);
    setError(null);
    try {
      const res = await runFourier(imageUri, seed, action);
      setTransformResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Fourier operation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeDCT = async (imageUri: string, seed: number, action: "encrypt" | "decrypt") => {
    setLoading(true);
    setError(null);
    try {
      const res = await runDCT(imageUri, seed, action);
      setTransformResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "DCT operation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeArnoldXOR = async (
    imageUri: string,
    itr: number,
    xorVal: number,
    action: "encrypt" | "decrypt"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runArnoldXOR(imageUri, itr, xorVal, action);
      setTransformResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Arnold-XOR operation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeChaos = async (
    imageUri: string,
    x0: number,
    r: number,
    action: "encrypt" | "decrypt"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runChaos(imageUri, x0, r, action);
      setTransformResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Chaos cipher operation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeSpectralHybrid = async (
    imageUri: string,
    scrambleSeed: number,
    maskSeed: number,
    kernelSeed: number,
    action: "encrypt" | "decrypt"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runSpectralHybrid(imageUri, scrambleSeed, maskSeed, kernelSeed, action);
      setTransformResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Spectral Hybrid operation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeFeistel = async (
    imageUri: string,
    seed: number,
    rounds: number,
    action: "encrypt" | "decrypt"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runFeistel(imageUri, seed, rounds, action);
      setTransformResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Feistel cipher operation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeV2Encrypt = async (
    imageUri: string,
    algorithm: string,
    parameters?: Record<string, unknown>
  ): Promise<EncryptResponseV2> => {
    setLoading(true);
    setError(null);
    try {
      const res = await runV2Encrypt(imageUri, algorithm, parameters);
      return res;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Layer 2 encryption failed");
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeV2Decrypt = async (
    ciphertextUri: string,
    keyFile: KeyFileV2 | string | Record<string, unknown>,
    referenceUri?: string | null
  ): Promise<DecryptResponseV2> => {
    setLoading(true);
    setError(null);
    try {
      const res = await runV2Decrypt(ciphertextUri, keyFile, referenceUri);
      return res;
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Layer 2 decryption failed");
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    drpeEncryptResult,
    drpeDecryptResult,
    transformResult,
    executeDRPEEncrypt,
    executeDRPEDecrypt,
    executeFourier,
    executeDCT,
    executeArnoldXOR,
    executeChaos,
    executeSpectralHybrid,
    executeFeistel,
    executeV2Encrypt,
    executeV2Decrypt,
    clearResults: () => {
      setDrpeEncryptResult(null);
      setDrpeDecryptResult(null);
      setTransformResult(null);
    },
  };
}
