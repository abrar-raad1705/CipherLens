export type FilterType = "GAUSSIAN" | "MEDIAN" | "SOBEL" | "CUSTOM" | "DECONVOLUTION";

export interface ProcessingResponse {
  status: string;
  filter: string;
  output_image: string;
  metadata: Record<string, unknown>;
  latency_ms: number;
}
