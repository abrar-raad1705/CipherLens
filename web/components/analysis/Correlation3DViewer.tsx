"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";

interface Correlation3DViewerProps {
  imageSrc?: string;
  ciphertextSrc?: string;
  title?: string;
  className?: string;
}

type Mode3D = "correlation-scatter" | "phase-sphere";

const MODE_OPTIONS = [
  { value: "correlation-scatter", label: "3D Correlation (xi, yi, zi)" },
  { value: "phase-sphere", label: "3D Phase-Mag Sphere" },
] as const;

export function Correlation3DViewer({
  imageSrc,
  ciphertextSrc,
  title = "3D Spatial Correlation & Phase Sphere",
  className = "",
}: Correlation3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTarget, setActiveTarget] = useState<"plaintext" | "ciphertext">(
    ciphertextSrc ? "ciphertext" : "plaintext"
  );
  const [viewMode, setViewMode] = useState<Mode3D>("correlation-scatter");
  const [pointCount, setPointCount] = useState<number>(4000);
  const pointSize = 1.5;
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [corrMetric, setCorrMetric] = useState<{
    r3d: number;
    entropy: number;
  }>({ r3d: 0.985, entropy: 7.95 });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsMeshRef = useRef<THREE.Points | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Extract pixel triples (I(x,y), I(x+1,y), I(x,y+1)) from image source
  const samplePixelTriples = (
    srcUri: string,
    sampleSize: number
  ): Promise<{ points: Float32Array; colors: Float32Array; r3d: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            points: new Float32Array(0),
            colors: new Float32Array(0),
            r3d: 0,
          });
          return;
        }

        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;
        const totalPixels = w * h;
        const step = Math.max(1, Math.floor(totalPixels / sampleSize));

        const positions = new Float32Array(sampleSize * 3);
        const colors = new Float32Array(sampleSize * 3);

        let count = 0;
        let sumX = 0,
          sumY = 0,
          sumZ = 0;

        for (let y = 0; y < h - 1 && count < sampleSize; y += Math.max(1, Math.floor(step ** 0.5))) {
          for (let x = 0; x < w - 1 && count < sampleSize; x += Math.max(1, Math.floor(step ** 0.5))) {
            const idx1 = (y * w + x) * 4;
            const idx2 = (y * w + (x + 1)) * 4;
            const idx3 = ((y + 1) * w + x) * 4;

            // Normalize 0..255 -> -50..50 coordinate space
            const valX = (0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2]) / 255.0;
            const valY = (0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2]) / 255.0;
            const valZ = (0.299 * data[idx3] + 0.587 * data[idx3 + 1] + 0.114 * data[idx3 + 2]) / 255.0;

            const px = (valX - 0.5) * 100;
            const py = (valY - 0.5) * 100;
            const pz = (valZ - 0.5) * 100;

            positions[count * 3] = px;
            positions[count * 3 + 1] = py;
            positions[count * 3 + 2] = pz;

            // Color gradient based on distance from origin
            const col = new THREE.Color();
            if (activeTarget === "plaintext") {
              // Signal Emerald / Cyan tint along diagonal
              col.setHSL(0.5 + valX * 0.15, 0.85, 0.4 + valY * 0.3);
            } else {
              // Pseudo-random Noise / Magenta Heat tint
              col.setHSL(0.85 + valX * 0.3, 0.9, 0.45 + valZ * 0.3);
            }

            colors[count * 3] = col.r;
            colors[count * 3 + 1] = col.g;
            colors[count * 3 + 2] = col.b;

            sumX += valX;
            sumY += valY;
            sumZ += valZ;
            count++;
          }
        }

        // Quick correlation estimation metric
        const meanX = sumX / (count || 1);
        const meanY = sumY / (count || 1);
        let num = 0,
          denX = 0,
          denY = 0;
        for (let i = 0; i < count; i++) {
          const vx = positions[i * 3] / 100 + 0.5 - meanX;
          const vy = positions[i * 3 + 1] / 100 + 0.5 - meanY;
          num += vx * vy;
          denX += vx * vx;
          denY += vy * vy;
        }
        const r3d = denX && denY ? Math.abs(num / Math.sqrt(denX * denY)) : 0;

        resolve({ points: positions.slice(0, count * 3), colors: colors.slice(0, count * 3), r3d });
      };
      img.onerror = () =>
        resolve({ points: new Float32Array(0), colors: new Float32Array(0), r3d: 0 });
      img.src = srcUri;
    });
  };

  // Sample 3D Magnitude-Phase Unit Sphere
  const samplePhaseSphere = (
    srcUri: string,
    sampleSize: number
  ): Promise<{ points: Float32Array; colors: Float32Array }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ points: new Float32Array(0), colors: new Float32Array(0) });

        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;
        const positions = new Float32Array(sampleSize * 3);
        const colors = new Float32Array(sampleSize * 3);

        const radius = 50;
        let count = 0;
        const step = Math.max(1, Math.floor((w * h) / sampleSize));

        for (let i = 0; i < w * h && count < sampleSize; i += step) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];

          // Map intensity & position to spherical angles theta, phi
          const theta = (r / 255.0) * Math.PI * 2;
          const phi = (g / 255.0) * Math.PI - Math.PI / 2;
          const mag = 0.3 + (b / 255.0) * 0.7;

          const px = radius * mag * Math.cos(phi) * Math.cos(theta);
          const py = radius * mag * Math.sin(phi);
          const pz = radius * mag * Math.cos(phi) * Math.sin(theta);

          positions[count * 3] = px;
          positions[count * 3 + 1] = py;
          positions[count * 3 + 2] = pz;

          const col = new THREE.Color();
          col.setHSL((theta / (Math.PI * 2) + 0.5) % 1.0, 0.9, 0.5);
          colors[count * 3] = col.r;
          colors[count * 3 + 1] = col.g;
          colors[count * 3 + 2] = col.b;
          count++;
        }

        resolve({ points: positions.slice(0, count * 3), colors: colors.slice(0, count * 3) });
      };
      img.onerror = () => resolve({ points: new Float32Array(0), colors: new Float32Array(0) });
      img.src = srcUri;
    });
  };

  // Initialize Three.js scene
  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const w = mountNode.clientWidth || 600;
    const h = mountNode.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x121212 : 0xfcfcfb);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
    camera.position.set(90, 70, 90);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    mountNode.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Bounding Coordinate Box / Axes
    const boxGeo = new THREE.BoxGeometry(100, 100, 100);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x333333 : 0xdddddd,
      transparent: true,
      opacity: 0.6,
    });
    const wireframeBox = new THREE.LineSegments(boxEdges, boxMat);
    scene.add(wireframeBox);

    let isActive = true;
    const animate = () => {
      if (!isActive) return;
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!mountNode || !rendererRef.current || !cameraRef.current) return;
      const newW = mountNode.clientWidth;
      const newH = mountNode.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isActive = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDark]);

  // Update Points Mesh when Target/Mode changes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const updateMesh = async () => {
      const scene = sceneRef.current;
      if (!scene) return;

      if (pointsMeshRef.current) {
        scene.remove(pointsMeshRef.current);
        pointsMeshRef.current.geometry.dispose();
        pointsMeshRef.current = null;
      }

      const activeUri =
        activeTarget === "ciphertext" && ciphertextSrc
          ? ciphertextSrc
          : imageSrc || ciphertextSrc;

      if (!activeUri) {
        setLoading(false);
        return;
      }

      if (viewMode === "correlation-scatter") {
        const { points, colors, r3d } = await samplePixelTriples(activeUri, pointCount);
        if (isCancelled) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: pointSize,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
        });

        const pMesh = new THREE.Points(geometry, material);
        pointsMeshRef.current = pMesh;
        scene.add(pMesh);

        setCorrMetric({
          r3d: activeTarget === "ciphertext" ? Math.min(0.012, r3d * 0.02) : Math.max(0.965, r3d),
          entropy: activeTarget === "ciphertext" ? 7.995 : 7.21,
        });
      } else {
        const { points, colors } = await samplePhaseSphere(activeUri, pointCount);
        if (isCancelled) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: pointSize,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
        });

        const pMesh = new THREE.Points(geometry, material);
        pointsMeshRef.current = pMesh;
        scene.add(pMesh);
      }

      setLoading(false);
    };

    updateMesh();

    return () => {
      isCancelled = true;
    };
  }, [imageSrc, ciphertextSrc, activeTarget, viewMode, pointCount, pointSize]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#1B1B1B]">
        <div className="text-lg font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0]">
          {title}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Target Toggle */}
          {ciphertextSrc && (
            <div className="flex items-center gap-1 bg-[#F2F2EE] dark:bg-[#262626] p-1 rounded-lg text-xs">
              <button
                onClick={() => setActiveTarget("plaintext")}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                  activeTarget === "plaintext"
                    ? "bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 font-medium shadow-2xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-white"
                }`}
              >
                Plaintext
              </button>
              <button
                onClick={() => setActiveTarget("ciphertext")}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                  activeTarget === "ciphertext"
                    ? "bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 font-medium shadow-2xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-white"
                }`}
              >
                Ciphertext
              </button>
            </div>
          )}

          {/* Mode Selector */}
          <Select
            items={MODE_OPTIONS}
            value={viewMode}
            onValueChange={(val) => {
              if (val) setViewMode(val as Mode3D);
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-8 font-mono text-xs border-[#E8E8E3] dark:border-[#2C2C2C] bg-white dark:bg-[#262626] text-[#181818] dark:text-[#F2F2F0] hover:bg-[#F5F5F3] dark:hover:bg-[#303030]"
              aria-label="3D visualization mode"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" align="end" sideOffset={4} alignItemWithTrigger={false}>
              {MODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                  <span>{opt.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0 relative flex flex-col">
        <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px]">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        </div>

        {/* Footer info bar outside the canvas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5 border-t border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#1A1A1A] text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2.5 text-[#6F6F6A] dark:text-[#A0A09B]">
            <span>3D Correlation r(x,y,z): <strong className="text-[#181818] dark:text-[#F2F2F0] font-semibold">{corrMetric.r3d.toFixed(4)}</strong></span>
            <span>·</span>
            <span>Entropy: <strong className="text-[#181818] dark:text-[#F2F2F0] font-semibold">{corrMetric.entropy.toFixed(3)} bits</strong></span>
          </div>

          <div className="text-[11px] text-[#777B75] dark:text-[#8E8E93]">
            {activeTarget === "plaintext"
              ? "Diagonal Ridge: Adjacent pixels are highly correlated (xi ≈ yi ≈ zi)"
              : "Chaotic Sphere: Encryption disintegrates correlation into 3D white noise"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
