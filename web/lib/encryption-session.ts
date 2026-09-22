export type EncryptionAlgorithm = "drpe" | "fourier" | "dct" | "arnold";

export interface DRPEKeys {
  seed1: number;
  seed2: number;
}

export interface FourierKeys {
  seed: number;
}

export interface DCTKeys {
  seed: number;
}

export interface ArnoldKeys {
  itr: number;
  xor_value: number;
}

export interface EncryptionSessionKeys {
  // DRPE
  seed1?: number;
  seed2?: number;
  // Fourier
  fourierSeed?: number;
  // DCT
  dctSeed?: number;
  // Arnold
  iterations?: number;
  xorValue?: number;
}

export interface EncryptionSession {
  algorithm: EncryptionAlgorithm;
  realImageUri: string;
  realImageName: string;
  cipherImageUri: string;
  keys: EncryptionSessionKeys;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = "cipherlens_encryption_session";

let inMemorySession: EncryptionSession | null = null;
const sessionListeners = new Set<(session: EncryptionSession | null) => void>();

export function notifySessionListeners() {
  for (const listener of sessionListeners) {
    try {
      listener(inMemorySession);
    } catch (e) {
      console.error("Session listener error:", e);
    }
  }
}

export function subscribeToSession(
  listener: (session: EncryptionSession | null) => void
): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function saveEncryptionSession(session: EncryptionSession): void {
  inMemorySession = session;
  if (typeof window !== "undefined") {
    setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (e) {
        console.warn("Could not save encryption session to storage:", e);
      }
    }, 0);
  }
  notifySessionListeners();
}

export function getEncryptionSession(): EncryptionSession | null {
  if (inMemorySession) {
    return inMemorySession;
  }
  if (typeof window !== "undefined") {
    try {
      const stored =
        sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as EncryptionSession;
        inMemorySession = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn("Could not load encryption session from storage:", e);
    }
  }
  return null;
}

export function clearEncryptionSession(): void {
  inMemorySession = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear encryption session storage:", e);
    }
  }
  notifySessionListeners();
}
