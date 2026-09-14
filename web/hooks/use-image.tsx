"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { ImageArtifact, SamplePreset } from "@/types/image";
import { generateCalibrationTarget } from "@/lib/utils/procedural";
import { getSamplePresets } from "@/lib/api/processing";

interface WorkspaceContextType {
  artifacts: ImageArtifact[];
  activeArtifact: ImageArtifact | null;
  presets: SamplePreset[];
  isBackendConnected: boolean;
  isMounted: boolean;
  addArtifact: (artifact: Omit<ImageArtifact, "id" | "timestamp">) => ImageArtifact;
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
  artifacts: [
    {
      id: "preset-target-cal512",
      name: "Optical Calibration Grid (512×512)",
      dataUri: "",
      width: 512,
      height: 512,
      sourceBench: "preset",
      timestamp: 0,
    },
  ],
  activeId: "preset-target-cal512",
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
    let restoredArtifacts: ImageArtifact[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cipherlens_artifacts") || localStorage.getItem("bat_signal_artifacts");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            restoredArtifacts = parsed.filter(
              (a) => a.dataUri && a.dataUri.length > 300
            );
          }
        } catch (e) {
          console.error("Failed to restore artifacts:", e);
        }
      }
    }

    if (restoredArtifacts.length === 0) {
      const proceduralUri =
        typeof document !== "undefined" ? generateCalibrationTarget(512) : "";
      restoredArtifacts = [
        {
          id: "preset-target-cal512",
          name: "Optical Calibration Grid (512×512)",
          dataUri: proceduralUri,
          width: 512,
          height: 512,
          sourceBench: "preset",
          timestamp: 0,
        },
      ];
    }

    clientSnapshot = {
      artifacts: restoredArtifacts,
      activeId: restoredArtifacts.length > 0 ? restoredArtifacts[0].id : null,
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

  // Persist to local storage
  if (typeof window !== "undefined" && next.artifacts.length > 0) {
    try {
      localStorage.setItem(
        "cipherlens_artifacts",
        JSON.stringify(next.artifacts.slice(0, 10))
      );
    } catch (e) {
      console.warn("Storage quota exceeded or error storing artifacts:", e);
    }
  }

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
          // Promote Cat Benchmark if only placeholder/cal512 was loaded
          updateStore((prev) => {
            const hasCat = prev.artifacts.some(
              (a) => a.id === "cat512" || a.name.includes("Cat")
            );
            if (!hasCat && res.samples[0]) {
              const catSample = res.samples[0];
              const catArtifact: ImageArtifact = {
                id: catSample.id,
                name: catSample.name,
                dataUri: catSample.image,
                width: catSample.width,
                height: catSample.height,
                sourceBench: "preset",
                timestamp: Date.now(),
              };
              return {
                artifacts: [
                  catArtifact,
                  ...prev.artifacts.filter((a) => a.id !== "preset-target-cal512"),
                ],
                activeId: catArtifact.id,
              };
            }
            return prev;
          });
        }
      })
      .catch((e) => {
        console.warn("Backend API not reachable for sample presets:", e);
        setIsBackendConnected(false);
      });
  }, []);

  const addArtifact = (
    newArt: Omit<ImageArtifact, "id" | "timestamp">
  ): ImageArtifact => {
    const created: ImageArtifact = {
      ...newArt,
      id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    updateStore((prev) => ({
      artifacts: [created, ...prev.artifacts],
      activeId: created.id,
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
    const defaultUri =
      typeof document !== "undefined" ? generateCalibrationTarget(512) : "";
    const resetArt: ImageArtifact = {
      id: "preset-target-cal512",
      name: "Optical Calibration Grid (512×512)",
      dataUri: defaultUri,
      width: 512,
      height: 512,
      sourceBench: "preset",
      timestamp: Date.now(),
    };
    if (typeof window !== "undefined") {
      localStorage.removeItem("cipherlens_artifacts");
      localStorage.removeItem("bat_signal_artifacts");
    }
    updateStore(() => ({
      artifacts: [resetArt],
      activeId: resetArt.id,
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
