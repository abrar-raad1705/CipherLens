const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // fallback to status text
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}
