"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { ImageArtifact, SamplePreset } from "@/types/image";
import { getSamplePresets } from "@/lib/api/processing";

interface WorkspaceContextType {
  artifacts: ImageArtifact[];
  activeArtifact: ImageArtifact | null;
  presets: SamplePreset[];
  isBackendConnected: boolean;
  isMounted: boolean;
  addArtifact: (
    artifact: Omit<ImageArtifact, "id" | "timestamp">,
    setActive?: boolean
  ) => ImageArtifact;
  setActiveArtifactId: (id: string) => void;
  loadPresetById: (id: string) => void;
  removeArtifact: (id: string) => void;
  clearArtifacts: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface StoreSnapshot {
  artifacts: ImageArtifact[];
  activeId: string | null;
}

// Server snapshot used during SSR and initial hydration
const SERVER_SNAPSHOT: StoreSnapshot = {
  artifacts: [],
  activeId: null,
};

// Client singleton store
let clientSnapshot: StoreSnapshot | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function getClientSnapshot(): StoreSnapshot {
  if (clientSnapshot === null) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cipherlens_artifacts");
        localStorage.removeItem("bat_signal_artifacts");
      } catch (e) {
        // ignore
      }
    }

    clientSnapshot = {
      artifacts: [],
      activeId: null,
    };
  }
  return clientSnapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateStore(updater: (prev: StoreSnapshot) => StoreSnapshot) {
  const current = getClientSnapshot();
  const next = updater(current);
  clientSnapshot = next;
  notify();
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const store = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const [presets, setPresets] = useState<SamplePreset[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    // Fetch official benchmark presets from FastAPI backend
    getSamplePresets()
      .then((res) => {
        setIsBackendConnected(true);
        if (res.samples && res.samples.length > 0) {
          setPresets(res.samples);
        }
      })
      .catch((e) => {
        console.warn("Backend API not reachable for sample presets:", e);
        setIsBackendConnected(false);
      });
  }, []);

  const addArtifact = (
    newArt: Omit<ImageArtifact, "id" | "timestamp">,
    setActive: boolean = true
  ): ImageArtifact => {
    const created: ImageArtifact = {
      ...newArt,
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    updateStore((prev) => ({
      artifacts: [created, ...prev.artifacts],
      activeId: setActive ? created.id : prev.activeId,
    }));
    return created;
  };

  const loadPresetById = (id: string) => {
    const p = presets.find((item) => item.id === id);
    if (!p) return;
    const existing = store.artifacts.find((a) => a.id === p.id);
    if (existing) {
      updateStore((prev) => ({
        ...prev,
        activeId: existing.id,
      }));
      return;
    }
    const created: ImageArtifact = {
      id: p.id,
      name: p.name,
      dataUri: p.image,
      width: p.width,
      height: p.height,
      sourceBench: "preset",
      timestamp: Date.now(),
    };
    updateStore((prev) => ({
      artifacts: [created, ...prev.artifacts],
      activeId: created.id,
    }));
  };

  const removeArtifact = (id: string) => {
    updateStore((prev) => {
      const nextArtifacts = prev.artifacts.filter((a) => a.id !== id);
      const nextActiveId =
        prev.activeId === id
          ? nextArtifacts.length > 0
            ? nextArtifacts[0].id
            : null
          : prev.activeId;
      return {
        artifacts: nextArtifacts,
        activeId: nextActiveId,
      };
    });
  };

  const clearArtifacts = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cipherlens_artifacts");
      localStorage.removeItem("bat_signal_artifacts");
      localStorage.removeItem("cipherlens_user_has_selected");
    }
    updateStore(() => ({
      artifacts: [],
      activeId: null,
    }));
  };

  const activeArtifact =
    store.artifacts.find((a) => a.id === store.activeId) ||
    store.artifacts[0] ||
    null;

  return (
    <WorkspaceContext.Provider
      value={{
        artifacts: store.artifacts,
        activeArtifact,
        presets,
        isBackendConnected,
        isMounted,
        addArtifact,
        setActiveArtifactId: (id) =>
          updateStore((prev) => ({ ...prev, activeId: id })),
        loadPresetById,
        removeArtifact,
        clearArtifacts,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
