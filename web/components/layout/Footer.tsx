"use client";

import { useWorkspace } from "@/hooks/use-image";

export function Footer() {
  const { isBackendConnected, artifacts } = useWorkspace();

  return (
    <footer className="border-t border-[#EDEDEB] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] py-4 text-[11px] text-[#787774] dark:text-[#9B9B9B] transition-colors duration-150">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isBackendConnected
                  ? "bg-[#0F7B6C] dark:bg-[#4DAB9A]"
                  : "bg-[#D9730D] dark:bg-[#FFAB5E]"
              }`}
            />
            <span>{isBackendConnected ? "REST API Connected" : "Offline / Mock"}</span>
          </div>
          <span className="text-[#D3D1CB] dark:text-[#383838]">•</span>
          <span>CipherLens v0.1.0</span>
          <span className="text-[#D3D1CB] dark:text-[#383838]">•</span>
          <span>{artifacts.length} {artifacts.length === 1 ? "Artifact" : "Artifacts"}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#9B9A97] dark:text-[#787774]">
          <span>Computational Imaging</span>
          <span>•</span>
          <span>4f Optical DRPE Simulator</span>
        </div>
      </div>
    </footer>
  );
}
