"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Database,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Bench Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#EDEDEB] dark:border-[#2E2E2E] pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">BENCH 01</Badge>
            <span className="text-xs text-[#787774] dark:text-[#9B9B9B]">
              INGESTION &amp; TARGET REPOSITORY
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E5E3] mt-1">
            Image Workspace &amp; Calibration Targets
          </h1>
          <p className="text-xs text-[#787774] dark:text-[#9B9B9B] mt-0.5">
            Load optical calibration standards or upload custom 2D imagery. Target artifacts persist automatically across all laboratory benches.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {artifacts.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearArtifacts}
              className="text-[#787774] dark:text-[#9B9B9B] hover:text-[#EB5757]"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Workspace
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload, Presets & Artifact Library (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Upload className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                <span>Upload Custom Image</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-[#2383E2] bg-[#D3E5EF]/20"
                    : "border-[#D3D1CB] dark:border-[#383838] hover:border-[#9B9A97] bg-[#FAFAF9] dark:bg-[#222222]"
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-white dark:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#383838] flex items-center justify-center mb-2 text-[#787774] dark:text-[#9B9B9B] shadow-xs">
                  <Upload className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-[#37352F] dark:text-[#E6E5E3]">
                  {uploadLoading ? "Reading image..." : "Click or drag & drop image here"}
                </span>
                <span className="text-[11px] text-[#787774] dark:text-[#9B9B9B] mt-0.5">
                  PNG, JPG, WEBP, BMP (Autoconverts to grayscale 2D array)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadLoading}
                />
              </label>
            </CardContent>
          </Card>

          {/* Standard Benchmark Calibration Presets */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Sparkles className="h-4 w-4 text-[#2383E2]" />
                <span>Optical Calibration Targets</span>
              </CardTitle>
              <span className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
                {presets.length} Presets
              </span>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {presets.length === 0 ? (
                <div className="text-xs text-[#787774] dark:text-[#9B9B9B] py-3 text-center">
                  Loading benchmark presets...
                </div>
              ) : (
                presets.map((p) => {
                  const isCurrent = activeArtifact?.name === p.name;
                  return (
                    <div
                      key={p.id}
                      onClick={() => loadPresetById(p.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                        isCurrent
                          ? "bg-[#EFEFED] dark:bg-[#2A2A2A] border-[#D3D1CB] dark:border-[#383838]"
                          : "bg-white dark:bg-[#222222] border-[#EDEDEB] dark:border-[#2E2E2E] hover:bg-[#F7F6F5] dark:hover:bg-[#262626]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-8 w-8 rounded border border-[#EDEDEB] dark:border-[#383838] object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[#37352F] dark:text-[#E6E5E3] truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-[#787774] dark:text-[#9B9B9B] truncate">
                            {p.width}×{p.height} • {p.description.slice(0, 42)}...
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isCurrent ? "primary" : "secondary"}
                        className="h-6 text-[11px] flex-shrink-0 ml-2"
                      >
                        {isCurrent ? "Active" : "Load"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Active Artifacts Library */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Database className="h-4 w-4 text-[#787774] dark:text-[#9B9B9B]" />
                <span>Active Artifacts ({artifacts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {artifacts.map((art) => {
                const isActive = activeArtifact?.id === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => setActiveArtifactId(art.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                      isActive
                        ? "bg-[#EFEFED] dark:bg-[#2A2A2A] border-[#D3D1CB] dark:border-[#383838] font-medium"
                        : "bg-white dark:bg-[#222222] border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-[#E6E5E3] hover:bg-[#F7F6F5] dark:hover:bg-[#262626]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={art.dataUri}
                        alt={art.name}
                        className="h-7 w-7 rounded border border-[#EDEDEB] dark:border-[#383838] object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs truncate text-[#37352F] dark:text-[#E6E5E3]">
                          {art.name}
                        </div>
                        <div className="text-[10px] text-[#787774] dark:text-[#9B9B9B] flex items-center gap-1.5">
                          <span>{art.width}×{art.height}</span>
                          <span>•</span>
                          <span className="capitalize">{art.sourceBench}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {isActive && <Check className="h-3.5 w-3.5 text-[#37352F] dark:text-white" />}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-[#9B9A97] hover:text-[#EB5757]"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArtifact(art.id);
                        }}
                        title="Delete artifact"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Target Inspection & Pipeline Dispatch (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeArtifact ? (
            <div className="space-y-4">
              <CanvasViewer
                imageSrc={activeArtifact.dataUri}
                title={activeArtifact.name}
                subtitle={`${activeArtifact.width}×${activeArtifact.height} px • Source: ${activeArtifact.sourceBench}`}
              />

              {/* Action launchpad */}
              <div className="p-3.5 rounded-lg bg-[#F7F6F5] dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-[#787774] dark:text-[#9B9B9B]">
                  Send <strong className="text-[#37352F] dark:text-[#E6E5E3]">&quot;{activeArtifact.name}&quot;</strong> directly to research benches:
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link href="/processing/convolution" className="flex-1 sm:flex-initial">
                    <Button variant="secondary" size="sm" className="w-full">
                      <Layers className="h-3 w-3 text-[#2383E2]" />
                      <span>Filter in Lab 02</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Link href="/encryption/drpe" className="flex-1 sm:flex-initial">
                    <Button variant="primary" size="sm" className="w-full">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Encrypt in Lab 03</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center rounded-lg bg-[#FAFAF9] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] text-xs gap-3 p-6 text-center">
              <div className="p-3 rounded-full bg-white dark:bg-[#282828] border border-[#EDEDEB] dark:border-[#383838]">
                <Database className="h-5 w-5 text-[#787774] dark:text-[#9B9B9B]" />
              </div>
              <span className="font-semibold text-[#37352F] dark:text-[#E6E5E3]">
                No Target Selected
              </span>
              <p className="max-w-sm text-[#787774] dark:text-[#9B9B9B]">
                Choose an optical calibration preset on the left or upload an image to begin your experiment.
              </p>
              {presets.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => loadPresetById(presets[0].id)}
                >
                  Load {presets[0].name}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
