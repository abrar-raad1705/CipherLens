import { apiClient } from "./client";

export interface ServerSavedFile {
  id: string;
  name: string;
  filename: string;
  category: "uploads" | "encrypted" | "decrypted" | string;
  path: string;
  file_url: string;
  size_bytes: number;
  timestamp: number;
}

export interface SaveImageResult {
  id: string;
  name: string;
  filename: string;
  category: string;
  path: string;
  file_url: string;
  data_uri: string;
  width: number;
  height: number;
  size_bytes: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface LoadedServerFile {
  id: string;
  name: string;
  filename: string;
  category: string;
  data_uri: string;
  width: number;
  height: number;
  size_bytes: number;
}

export async function saveImageToServer(
  category: "uploads" | "encrypted" | "decrypted",
  name: string,
  image: string,
  metadata: Record<string, unknown> = {}
): Promise<SaveImageResult> {
  return apiClient<SaveImageResult>("/api/storage/save", {
    method: "POST",
    body: JSON.stringify({ category, name, image, metadata }),
  });
}

export async function listServerFiles(
  category?: string
): Promise<{ files: ServerSavedFile[] }> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiClient<{ files: ServerSavedFile[] }>(`/api/storage/list${query}`);
}

export async function loadServerFile(
  category: string,
  filename: string
): Promise<LoadedServerFile> {
  return apiClient<LoadedServerFile>(
    `/api/storage/load/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`
  );
}

export async function deleteServerFile(
  category?: string,
  filename?: string,
  name?: string
): Promise<{ success: boolean; deleted: boolean }> {
  return apiClient<{ success: boolean; deleted: boolean }>("/api/storage/delete", {
    method: "POST",
    body: JSON.stringify({ category, filename, name }),
  });
}

