import { apiClient } from "./client";
import { ProcessingResponse } from "@/types/processing";
import { SamplePreset } from "@/types/image";

export async function getSamplePresets(): Promise<{ samples: SamplePreset[] }> {
  return apiClient<{ samples: SamplePreset[] }>("/api/processing/samples");
}

export async function runConvolution(
  image: string,
  kernel: number[][],
  normalize: boolean = false
): Promise<ProcessingResponse> {
  return apiClient<ProcessingResponse>("/api/processing/convolution", {
    method: "POST",
    body: JSON.stringify({ image, kernel, normalize }),
  });
}

export async function runGaussian(
  image: string,
  kernel_size: number = 5,
  sigma: number = 1.5
): Promise<ProcessingResponse> {
  return apiClient<ProcessingResponse>("/api/processing/gaussian", {
    method: "POST",
    body: JSON.stringify({ image, kernel_size, sigma }),
  });
}

export async function runMedian(
  image: string,
  kernel_size: number = 3
): Promise<ProcessingResponse> {
  return apiClient<ProcessingResponse>("/api/processing/median", {
    method: "POST",
    body: JSON.stringify({ image, kernel_size }),
  });
}

export async function runSobel(image: string): Promise<ProcessingResponse> {
  return apiClient<ProcessingResponse>("/api/processing/sobel", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
}

export async function runDeconvolution(
  image: string,
  mode: string = "GAUSSIAN",
  kernel_size: number = 5,
  sigma: number = 1.0,
  K: number = 0.01,
  kernel?: number[][]
): Promise<ProcessingResponse> {
  return apiClient<ProcessingResponse>("/api/processing/deconvolution", {
    method: "POST",
    body: JSON.stringify({ image, mode, kernel_size, sigma, K, kernel }),
  });
}
