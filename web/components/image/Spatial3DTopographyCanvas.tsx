"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box, Layers, Maximize2, RefreshCw, Sun, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";

interface Spatial3DTopographyCanvasProps {
  beforeSrc?: string;
  afterSrc?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

type DisplayTarget = "result" | "original" | "split-compare";
type RenderStyle = "surface" | "wireframe" | "points";
type ColormapPreset = "emerald" | "plasma" | "grayscale" | "viridis";

export function Spatial3DTopographyCanvas({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Result",
  className = "",
}: Spatial3DTopographyCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [displayTarget, setDisplayTarget] = useState<DisplayTarget>(
    afterSrc ? "result" : "original"
  );
  const [renderStyle, setRenderStyle] = useState<RenderStyle>("surface");
  const [colormap, setColormap] = useState<ColormapPreset>("emerald");
  const [elevationScale, setElevationScale] = useState<number>(40);
  const [gridResolution] = useState<number>(128); // 128x128 grid density
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // References for Three.js instance objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshBeforeRef = useRef<THREE.Mesh | THREE.Points | null>(null);
  const meshAfterRef = useRef<THREE.Mesh | THREE.Points | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Helper to calculate vertex colors based on height z (normalized 0..1)
  const getVertexColor = (normZ: number, cmap: ColormapPreset): THREE.Color => {
    const color = new THREE.Color();
    if (cmap === "grayscale") {
      color.setHSL(0, 0, normZ * 0.9 + 0.1);
    } else if (cmap === "plasma") {
      // Purple (0.8) -> Orange/Yellow (0.15)
      const hue = (1 - normZ) * 0.75 + 0.75;
      color.setHSL(hue % 1.0, 0.9, 0.2 + normZ * 0.6);
    } else if (cmap === "viridis") {
      // Dark Purple -> Teal -> Bright Yellow
      const hue = 0.7 - normZ * 0.55;
      color.setHSL(hue, 0.8, 0.25 + normZ * 0.55);
    } else {
      // Emerald / Signal Theme (Dark Teal -> Emerald -> Bright Cyan/White Peak)
      if (normZ < 0.3) {
        color.setHSL(0.55, 0.7, 0.15 + normZ * 0.3);
      } else if (normZ < 0.7) {
        color.setHSL(0.45, 0.85, 0.3 + normZ * 0.35);
      } else {
        color.setHSL(0.5, 0.9, 0.5 + normZ * 0.45);
      }
    }
    return color;
  };

  // Process image source into 2D grid array of normalized intensity values [0..1]
  const sampleImageIntensity = (
    imageUri: string,
    targetRes: number
  ): Promise<Float32Array> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetRes;
        canvas.height = targetRes;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(new Float32Array(targetRes * targetRes));
          return;
        }

        ctx.drawImage(img, 0, 0, targetRes, targetRes);
        const imgData = ctx.getImageData(0, 0, targetRes, targetRes).data;
        const intensities = new Float32Array(targetRes * targetRes);

        for (let i = 0; i < intensities.length; i++) {
          const r = imgData[i * 4];
          const g = imgData[i * 4 + 1];
          const b = imgData[i * 4 + 2];
          // Grayscale luminance formula
          intensities[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        }
        resolve(intensities);
      };
      img.onerror = () => resolve(new Float32Array(targetRes * targetRes));
      img.src = imageUri;
    });
  };

  // Create or Update 3D Geometry for an intensity map
  const createTopographyMesh = (
    intensities: Float32Array,
    res: number,
    scale: number,
    cmap: ColormapPreset,
    style: RenderStyle,
    xOffset: number = 0
  ): THREE.Mesh | THREE.Points => {
    const geometry = new THREE.PlaneGeometry(100, 100, res - 1, res - 1);
    geometry.rotateX(-Math.PI / 2); // Orient plane horizontally on XZ plane

    const posAttr = geometry.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const normZ = intensities[i] || 0;
      // Height elevation z = normZ * scale
      posAttr.setY(i, normZ * scale);

      const col = getVertexColor(normZ, cmap);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    if (style === "points") {
      const pMat = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geometry, pMat);
      points.position.x = xOffset;
      return points;
    }

    const matProps = {
      vertexColors: true,
      wireframe: style === "wireframe",
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1,
    };

    const material = new THREE.MeshStandardMaterial(matProps);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = xOffset;
    return mesh;
  };

  // Primary WebGL Initialization and Render Loop
  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const width = mountNode.clientWidth || 700;
    const height = mountNode.clientHeight || 460;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x121212 : 0xfcfcfb);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 90, 140);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountNode.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going under grid
    controls.target.set(0, 15, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.7 : 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(80, 120, 80);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x2563eb, 0.6);
    dirLight2.position.set(-80, -40, -80);
    scene.add(dirLight2);

    // Ground Helper Grid
    const gridHelper = new THREE.GridHelper(
      220,
      22,
      isDark ? 0x333333 : 0xdddddd,
      isDark ? 0x222222 : 0xeeeeee
    );
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Render Animation Loop
    let isActive = true;
    const animate = () => {
      if (!isActive) return;
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        if (autoRotate) {
          controlsRef.current.autoRotate = true;
          controlsRef.current.autoRotateSpeed = 1.5;
        } else {
          controlsRef.current.autoRotate = false;
        }
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Window Resize Handler
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

  // Load Image Data & Rebuild 3D Meshes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const buildMeshes = async () => {
      const scene = sceneRef.current;
      if (!scene) return;

      // Remove existing topography meshes
      if (meshBeforeRef.current) {
        scene.remove(meshBeforeRef.current);
        meshBeforeRef.current.geometry.dispose();
        meshBeforeRef.current = null;
      }
      if (meshAfterRef.current) {
        scene.remove(meshAfterRef.current);
        meshAfterRef.current.geometry.dispose();
        meshAfterRef.current = null;
      }

      const activeSrc =
        displayTarget === "original"
          ? beforeSrc
          : displayTarget === "result"
          ? afterSrc || beforeSrc
          : null;

      if (displayTarget === "split-compare" && beforeSrc && afterSrc) {
        const [intBefore, intAfter] = await Promise.all([
          sampleImageIntensity(beforeSrc, gridResolution),
          sampleImageIntensity(afterSrc, gridResolution),
        ]);
        if (isCancelled) return;

        const meshB = createTopographyMesh(
          intBefore,
          gridResolution,
          elevationScale,
          colormap,
          renderStyle,
          -60
        );
        const meshA = createTopographyMesh(
          intAfter,
          gridResolution,
          elevationScale,
          colormap,
          renderStyle,
          60
        );

        meshBeforeRef.current = meshB;
        meshAfterRef.current = meshA;
        scene.add(meshB);
        scene.add(meshA);
        if (controlsRef.current) controlsRef.current.target.set(0, 15, 0);
      } else if (activeSrc) {
        const intensities = await sampleImageIntensity(activeSrc, gridResolution);
        if (isCancelled) return;

        const mesh = createTopographyMesh(
          intensities,
          gridResolution,
          elevationScale,
          colormap,
          renderStyle,
          0
        );

        meshAfterRef.current = mesh;
        scene.add(mesh);
        if (controlsRef.current) controlsRef.current.target.set(0, 15, 0);
      }

      setLoading(false);
    };

    buildMeshes();

    return () => {
      isCancelled = true;
    };
  }, [
    beforeSrc,
    afterSrc,
    displayTarget,
    renderStyle,
    colormap,
    elevationScale,
    gridResolution,
  ]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 90, 140);
    controlsRef.current.target.set(0, 15, 0);
    controlsRef.current.update();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full rounded-md border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#121212] overflow-hidden ${className}`}
    >
      {/* HUD Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#171717]">
        {/* Left Side: Display Target Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#E8E8E3]/50 dark:bg-[#222222] p-0.5 rounded border border-[#E8E8E3] dark:border-[#292929]">
            {afterSrc && (
              <button
                onClick={() => setDisplayTarget("result")}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
                  displayTarget === "result"
                    ? "bg-white dark:bg-[#171717] text-[#2563EB] dark:text-[#5B8CFF] font-medium shadow-xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                }`}
              >
                {afterLabel} 3D
              </button>
            )}
            {beforeSrc && (
              <button
                onClick={() => setDisplayTarget("original")}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
                  displayTarget === "original"
                    ? "bg-white dark:bg-[#171717] text-[#2563EB] dark:text-[#5B8CFF] font-medium shadow-xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                }`}
              >
                {beforeLabel} 3D
              </button>
            )}
            {beforeSrc && afterSrc && (
              <button
                onClick={() => setDisplayTarget("split-compare")}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
                  displayTarget === "split-compare"
                    ? "bg-white dark:bg-[#171717] text-[#2563EB] dark:text-[#5B8CFF] font-medium shadow-xs"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                }`}
              >
                Side-by-Side 3D
              </button>
            )}
          </div>

          {loading && (
            <Badge variant="outline" className="animate-pulse text-[11px] font-mono">
              Rendering WebGL...
            </Badge>
          )}
        </div>

        {/* Right Side: Style & View Controls */}
        <div className="flex items-center gap-2">
          {/* Render Style Toggle */}
          <div className="flex items-center gap-1 bg-[#E8E8E3]/50 dark:bg-[#222222] p-0.5 rounded border border-[#E8E8E3] dark:border-[#292929]">
            <button
              onClick={() => setRenderStyle("surface")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                renderStyle === "surface"
                  ? "bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0]"
                  : "text-[#6F6F6A] dark:text-[#A0A09B]"
              }`}
              title="Solid Surface Mesh"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setRenderStyle("wireframe")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                renderStyle === "wireframe"
                  ? "bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0]"
                  : "text-[#6F6F6A] dark:text-[#A0A09B]"
              }`}
              title="Wireframe Mesh"
            >
              <Box className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setRenderStyle("points")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                renderStyle === "points"
                  ? "bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0]"
                  : "text-[#6F6F6A] dark:text-[#A0A09B]"
              }`}
              title="3D Point Cloud"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Colormap Selector */}
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as ColormapPreset)}
            className="h-7 px-2 text-xs font-mono rounded border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0] cursor-pointer"
          >
            <option value="emerald">Signal Emerald</option>
            <option value="plasma">Plasma Heat</option>
            <option value="viridis">Viridis Spectrum</option>
            <option value="grayscale">Monochrome</option>
          </select>

          {/* Auto Rotate Button */}
          <Button
            size="sm"
            variant={autoRotate ? "primary" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Auto Rotation"
          >
            <Zap className="h-3 w-3 mr-1" />
            <span>{autoRotate ? "Orbiting" : "Orbit"}</span>
          </Button>

          {/* Reset Camera */}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleResetCamera}
            title="Reset Camera View"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#6F6F6A] dark:text-[#A0A09B]" />
          </Button>
        </div>
      </div>

      {/* Main 3D WebGL Canvas Surface */}
      <div className="relative w-full h-[420px] sm:h-[480px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Instruction & Telemetry Overlay */}
        <div className="absolute bottom-3 left-3 pointer-events-none flex flex-col gap-1 font-mono text-[10px] text-[#6F6F6A] dark:text-[#A0A09B] bg-white/80 dark:bg-[#121212]/80 p-2 rounded border border-[#E8E8E3] dark:border-[#292929] backdrop-blur-xs">
          <div>Drag mouse to rotate 360° · Scroll to zoom</div>
          <div>Surface Height: z = Intensity(x,y) ({elevationScale}x)</div>
        </div>

        {/* Floating Elevation Scale Slider */}
        <div className="absolute bottom-3 right-3 w-48 bg-white/90 dark:bg-[#171717]/90 p-2.5 rounded border border-[#E8E8E3] dark:border-[#292929] shadow-sm backdrop-blur-xs space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#6F6F6A] dark:text-[#A0A09B]">
            <span>Height Scale</span>
            <span className="font-medium text-[#181818] dark:text-[#F2F2F0]">{elevationScale}px</span>
          </div>
          <Slider
            min={5}
            max={90}
            step={1}
            value={elevationScale}
            onChange={(e) => setElevationScale(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
