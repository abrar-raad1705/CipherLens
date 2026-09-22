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
      const errText = await res.text();
      try {
        const errJson = JSON.parse(errText);
        if (errJson && errJson.detail) {
          errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {
        if (errText) errorMsg += ` - ${errText.slice(0, 200)}`;
      }
    } catch {
      // fallback to status text
    }
    throw new Error(errorMsg);
  }

  const text = await res.text();
  if (!text || text.trim() === "") {
    throw new Error("API returned an empty response.");
  }

  try {
    return JSON.parse(text) as T;
  } catch (parseErr: unknown) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.error("Failed to parse JSON response from", url, "Text length:", text.length, "Preview:", text.slice(0, 200));
    throw new Error(`Invalid JSON received from server (${msg}). Response length: ${text.length} chars.`);
  }
}
