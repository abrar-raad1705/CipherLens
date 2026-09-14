import { apiClient } from "./client";
import {
  CorrelationData,
  FullAnalysisData,
  HistogramData,
  MetricsData,
} from "@/types/analysis";

export async function runEntropy(image: string): Promise<{ entropy: number; latency_ms: number }> {
  return apiClient<{ entropy: number; latency_ms: number }>("/api/analysis/entropy", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
}

export async function runCorrelation(
  image: string,
  num_samples: number = 1500
): Promise<CorrelationData> {
  return apiClient<CorrelationData>("/api/analysis/correlation", {
    method: "POST",
    body: JSON.stringify({ image, num_samples }),
  });
}

export async function runMetrics(
  original_image: string,
  target_image: string,
  differential: boolean = false
): Promise<MetricsData> {
  return apiClient<MetricsData>("/api/analysis/metrics", {
    method: "POST",
    body: JSON.stringify({ original_image, target_image, differential }),
  });
}

export async function runHistogram(image: string): Promise<HistogramData> {
  return apiClient<HistogramData>("/api/analysis/histogram", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
}

export async function runFullAnalysis(
  plain_image: string,
  cipher_image: string,
  recovered_image?: string,
  diff_x: number = 0,
  diff_y: number = 0,
  algorithm: string = "DRPE",
  key_params: Record<string, unknown> = {}
): Promise<FullAnalysisData> {
  return apiClient<FullAnalysisData>("/api/analysis/full", {
    method: "POST",
    body: JSON.stringify({
      plain_image,
      cipher_image,
      recovered_image,
      diff_x,
      diff_y,
      algorithm,
      key_params,
    }),
  });
}
