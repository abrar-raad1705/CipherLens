"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasViewer } from "@/components/image/CanvasViewer";
import { useWorkspace } from "@/hooks/use-image";

export default function WorkspacePage() {
  const {
    artifacts,
    activeArtifact,
    presets,
    addArtifact,
    setActiveArtifactId,
    loadPresetById,
    removeArtifact,
    clearArtifacts,
  } = useWorkspace();

  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        addArtifact({
          name: file.name,
          dataUri,
          width: img.width,
          height: img.height,
          sourceBench: "upload",
        });
        setUploadLoading(false);
        setShowUploadModal(false);
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-12 max-w-4xl py-4">
      {/* Workspace Header */}
      <div className="flex items-baseline justify-between border-b border-[#E8E8E3] dark:border-[#292929] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            WORKSPACE
          </div>
          {activeArtifact ? (
            <div className="mt-1">
              <h1 className="text-xl font-normal text-[#181818] dark:text-[#F2F2F0]">
                {activeArtifact.name}
              </h1>
              <div className="font-mono text-[11px] text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                {activeArtifact.width} × {activeArtifact.height} · RGB · {activeArtifact.sourceBench}
              </div>
            </div>
          ) : (
            <h1 className="text-xl font-light text-[#181818] dark:text-[#F2F2F0] mt-1">
              Select or Upload Target
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeArtifact && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadModal(!showUploadModal)}
            >
              {showUploadModal ? "Cancel" : "Change image"}
            </Button>
          )}
          {artifacts.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearArtifacts}
              title="Reset all artifacts"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Upload Dropzone (Shown when modal is open OR no artifact is selected) */}
      {(!activeArtifact || showUploadModal) && (
        <section className="space-y-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded-md p-10 sm:p-14 flex flex-col items-center justify-center cursor-pointer transition-colors text-center ${
              dragOver
                ? "border-[#2563EB] bg-[#2563EB]/5"
                : "border-[#D7D7D1] dark:border-[#383838] hover:border-[#181818] dark:hover:border-[#F2F2F0] bg-[#FFFFFF] dark:bg-[#171717]"
            }`}
          >
            <Upload className="h-5 w-5 text-[#999993] dark:text-[#6A6A6A] mb-3" />
            <span className="text-sm font-medium text-[#181818] dark:text-[#F2F2F0]">
              {uploadLoading ? "Reading image..." : "Drop an image here"}
            </span>
            <span className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-1">
              or choose a file
            </span>
            <span className="font-mono text-[10px] text-[#999993] dark:text-[#6A6A6A] mt-4">
              PNG · JPG · WEBP
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadLoading}
            />
          </label>
        </section>
      )}

      {/* Dominant Main Image Display */}
      {activeArtifact && activeArtifact.dataUri && (
        <section className="space-y-3">
          <CanvasViewer
            imageSrc={activeArtifact.dataUri}
            title={activeArtifact.name}
            subtitle={`${activeArtifact.width} × ${activeArtifact.height} px`}
          />
        </section>
      )}

      {/* Choose an Experiment */}
      {activeArtifact && (
        <section className="space-y-4 pt-2">
          <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            CHOOSE AN EXPERIMENT
          </div>

          <div className="border-t border-[#E8E8E3] dark:border-[#292929] divide-y divide-[#E8E8E3] dark:divide-[#292929]">
            <Link
              href="/processing/convolution"
              className="group flex items-baseline justify-between py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-sm transition-colors"
            >
              <div>
                <div className="text-xs font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                  CONVOLUTION
                </div>
                <div className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  Explore spatial filtering
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] transition-colors" />
            </Link>

            <Link
              href="/encryption/drpe"
              className="group flex items-baseline justify-between py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-sm transition-colors"
            >
              <div>
                <div className="text-xs font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                  ENCRYPTION
                </div>
                <div className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  Explore image encryption
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] transition-colors" />
            </Link>

            <Link
              href="/analysis"
              className="group flex items-baseline justify-between py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-sm transition-colors"
            >
              <div>
                <div className="text-xs font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] group-hover:text-[#2563EB] dark:group-hover:text-[#5B8CFF] transition-colors">
                  ANALYSIS
                </div>
                <div className="text-xs text-[#6F6F6A] dark:text-[#A0A09B] mt-0.5">
                  Quantitative evaluation
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#999993] dark:text-[#6A6A6A] group-hover:text-[#181818] dark:group-hover:text-[#F2F2F0] transition-colors" />
            </Link>
          </div>
        </section>
      )}

      {/* Optical Benchmark Calibration Standards & Artifacts Library */}
      <section className="space-y-6 pt-4 border-t border-[#E8E8E3] dark:border-[#292929]">
        {/* Presets List */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
            CALIBRATION STANDARDS
          </div>

          <div className="border border-[#E8E8E3] dark:border-[#292929] rounded-md divide-y divide-[#E8E8E3] dark:divide-[#292929] bg-white dark:bg-[#171717]">
            {presets.map((p) => {
              const isCurrent = activeArtifact?.name === p.name;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    loadPresetById(p.id);
                    setShowUploadModal(false);
                  }}
                  className="flex items-center justify-between p-2.5 hover:bg-[#F4F4F1] dark:hover:bg-[#1F1F1F] transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-7 w-7 rounded object-cover border border-[#E8E8E3] dark:border-[#292929] shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B]">
                        {p.width} × {p.height} · {p.description.slice(0, 48)}...
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isCurrent ? "primary" : "secondary"}
                    className="h-6 text-[11px] shrink-0 ml-2"
                  >
                    {isCurrent ? "Active" : "Load"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Artifacts History List */}
        {artifacts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase">
              <span>WORKSPACE ARTIFACTS ({artifacts.length})</span>
            </div>

            <div className="border border-[#E8E8E3] dark:border-[#292929] rounded-md divide-y divide-[#E8E8E3] dark:divide-[#292929] bg-white dark:bg-[#171717]">
              {artifacts.map((art) => {
                const isActive = activeArtifact?.id === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => setActiveArtifactId(art.id)}
                    className="flex items-center justify-between p-2.5 hover:bg-[#F4F4F1] dark:hover:bg-[#1F1F1F] transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {art.dataUri ? (
                        <img
                          src={art.dataUri}
                          alt={art.name}
                          className="h-7 w-7 rounded object-cover border border-[#E8E8E3] dark:border-[#292929] shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="font-medium text-[#181818] dark:text-[#F2F2F0] truncate">
                          {art.name}
                        </div>
                        <div className="font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B]">
                          {art.width} × {art.height} · {art.sourceBench}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isActive && (
                        <span className="text-[10px] font-mono text-[#2563EB] dark:text-[#5B8CFF]">
                          Active
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArtifact(art.id);
                        }}
                        className="text-[#999993] hover:text-[#DC2626] p-1 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
