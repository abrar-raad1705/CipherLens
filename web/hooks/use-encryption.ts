"use client";

import { useState } from "react";
import {
  runArnoldXOR,
  runDCT,
  runDRPEDecrypt,
  runDRPEEncrypt,
  runFourier,
} from "@/lib/api/encryption";
import { DRPEEncryptResponse, DRPEDecryptResponse, TransformResponse } from "@/types/encryption";

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
    clearResults: () => {
      setDrpeEncryptResult(null);
      setDrpeDecryptResult(null);
      setTransformResult(null);
    },
  };
}
