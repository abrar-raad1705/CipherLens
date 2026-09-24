"use client";

import { useState } from "react";
import {
  runCorrelation,
  runEntropy,
  runFullAnalysis,
  runHistogram,
  runMetrics,
} from "@/lib/api/analysis";
import { CorrelationData, FullAnalysisData, HistogramData, MetricsData } from "@/types/analysis";

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entropy, setEntropy] = useState<number | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [histogram, setHistogram] = useState<HistogramData | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysisData | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    return err instanceof Error ? err.message : fallback;
  };

  const executeEntropy = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runEntropy(imageUri);
      setEntropy(res.entropy);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Entropy calculation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeCorrelation = async (imageUri: string, samples: number = 1500) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runCorrelation(imageUri, samples);
      setCorrelation(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Correlation calculation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeMetrics = async (originalUri: string, targetUri: string, differential: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runMetrics(originalUri, targetUri, differential);
      setMetrics(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Metrics calculation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeHistogram = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runHistogram(imageUri);
      setHistogram(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Histogram calculation failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const executeFullAnalysis = async (
    plainUri: string,
    cipherUri?: string | null,
    recoveredUri?: string | null,
    diffX: number = 0,
    diffY: number = 0,
    algorithm: string = "DRPE",
    keyParams: Record<string, unknown> = {}
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runFullAnalysis(plainUri, cipherUri, recoveredUri, diffX, diffY, algorithm, keyParams);
      setFullAnalysis(res);
      return res;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Full analysis failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    entropy,
    correlation,
    metrics,
    histogram,
    fullAnalysis,
    executeEntropy,
    executeCorrelation,
    executeMetrics,
    executeHistogram,
    executeFullAnalysis,
  };
}
