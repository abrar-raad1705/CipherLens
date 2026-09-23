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
import { listServerFiles, loadServerFile, deleteServerFile } from "@/lib/api/storage";
import {
  generateCalibrationTarget,
  generateSiemensStarTarget,
  generateFresnelZonePlate,
  generateCheckerboardTarget,
} from "@/lib/utils/procedural";

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
        console.warn("Backend API not reachable for sample presets, generating client procedural presets:", e);
        setIsBackendConnected(false);
        setPresets([
          {
            id: "siemens_star",
            name: "Siemens Star Target",
            description: "Standard radial MTF spoke resolution pattern for optical transfer function testing.",
            image: generateSiemensStarTarget(512),
            width: 512,
            height: 512,
          },
          {
            id: "frequency_grid",
            name: "Concentric Fresnel Zone Plate",
            description: "High-fidelity radial chirp pattern with smooth quadratic phase fringes.",
            image: generateFresnelZonePlate(512),
            width: 512,
            height: 512,
          },
          {
            id: "checkerboard",
            name: "High-Contrast Checkerboard",
            description: "32×32 binary tiles ideal for spatial filter boundary and edge analysis.",
            image: generateCheckerboardTarget(512),
            width: 512,
            height: 512,
          },
          {
            id: "calibration_standard",
            name: "Precision Optical Calibration Target",
            description: "Calibrated concentric chirps, radial spokes, and coordinate axes.",
            image: generateCalibrationTarget(512),
            width: 512,
            height: 512,
          },
        ]);
      });

    // Also populate any saved files from server disk into workspace artifacts
    listServerFiles()
      .then(async (res) => {
        if (res.files && res.files.length > 0) {
          for (const file of res.files.slice(0, 15)) {
            try {
              const loaded = await loadServerFile(file.category, file.filename);
              addArtifact(
                {
                  name: loaded.name,
                  dataUri: loaded.data_uri,
                  width: loaded.width,
                  height: loaded.height,
                  sourceBench: (file.category === "encrypted"
                    ? "encryption"
                    : file.category === "decryption"
                    ? "decryption"
                    : "upload") as any,
                  metadata: {
                    category: file.category,
                    filename: file.filename,
                  },
                },
                false
              );
            } catch {
              // ignore individually unparseable files
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const addArtifact = (
    newArt: Omit<ImageArtifact, "id" | "timestamp">,
    setActive: boolean = true
  ): ImageArtifact => {
    // Avoid duplicate artifact entries with identical dataUri
    const existing = store.artifacts.find((a) => a.dataUri === newArt.dataUri);
    if (existing) {
      if (setActive) {
        updateStore((prev) => ({
          ...prev,
          activeId: existing.id,
        }));
      }
      return existing;
    }

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
    // Find target artifact before removing from local store
    const target = store.artifacts.find((a) => a.id === id);
    if (target) {
      const category = (target.metadata?.category as string) || (target.sourceBench === "encryption" ? "encrypted" : target.sourceBench === "decryption" ? "decrypted" : "uploads");
      const filename = target.metadata?.filename as string | undefined;
      // Asynchronously delete from server storage
      deleteServerFile(category, filename, target.name).catch((err) => {
        console.warn("Failed to delete artifact from server:", err);
      });
    }

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
