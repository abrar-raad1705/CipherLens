"use client";

import { useState } from "react";
import { runConvolution, runDeconvolution, runGaussian, runMedian, runSobel } from "@/lib/api/processing";
import { ProcessingResponse } from "@/types/processing";

export function useProcessing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResponse | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    return err instanceof Error ? err.message : fallback;
  };

  const executeGaussian = async (imageUri: string, kernelSize: number, sigma: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runGaussian(imageUri, kernelSize, sigma);
      setResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Gaussian blur failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeMedian = async (imageUri: string, kernelSize: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runMedian(imageUri, kernelSize);
      setResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Median filter failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeSobel = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runSobel(imageUri);
      setResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Sobel filter failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeConvolution = async (imageUri: string, kernel: number[][], normalize: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runConvolution(imageUri, kernel, normalize);
      setResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Convolution failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeDeconvolution = async (
    imageUri: string,
    mode: string,
    kernelSize: number,
    sigma: number,
    K: number,
    kernel?: number[][]
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runDeconvolution(imageUri, mode, kernelSize, sigma, K, kernel);
      setResult(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Deconvolution failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    result,
    executeGaussian,
    executeMedian,
    executeSobel,
    executeConvolution,
    executeDeconvolution,
    clearResult: () => setResult(null),
  };
}
