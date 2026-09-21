export interface ImageArtifact {
  id: string;
  name: string;
  dataUri: string;
  width: number;
  height: number;
  sourceBench: "upload" | "preset" | "processing" | "encryption" | "decryption" | "analysis";
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  image: string;
  width: number;
  height: number;
}
