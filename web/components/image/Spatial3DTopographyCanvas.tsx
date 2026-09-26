"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CubeIcon as Box,
  CheckIcon as Check,
  ChevronDownIcon as ChevronDown,
  ViewfinderCircleIcon as CircleDot,
  Square3Stack3DIcon as Layers,
  ArrowPathIcon as RotateCcw,
} from "@heroicons/react/24/outline";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/hooks/use-theme";

interface Spatial3DTopographyCanvasProps {
  beforeSrc?: string;
  afterSrc?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  isFullscreen?: boolean;
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
  isFullscreen = false,
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
  const [isColormapOpen, setIsColormapOpen] = useState(false);
  const colormapDropdownRef = useRef<HTMLDivElement | null>(null);

  const colormapOptions: {
    value: ColormapPreset;
    label: string;
    gradient: string;
  }[] = [
    {
      value: "emerald",
      label: "Signal Emerald",
      gradient: "from-[#064e3b] via-[#10b981] to-[#6ee7b7]",
    },
    {
      value: "plasma",
      label: "Plasma Heat",
      gradient: "from-[#0d0887] via-[#cc4778] to-[#f0f921]",
    },
    {
      value: "viridis",
      label: "Viridis Spectrum",
      gradient: "from-[#440154] via-[#21918c] to-[#fde725]",
    },
    {
      value: "grayscale",
      label: "Monochrome",
      gradient: "from-[#171717] via-[#737373] to-[#f5f5f5]",
    },
  ];

  // Close colormap dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        colormapDropdownRef.current &&
        !colormapDropdownRef.current.contains(e.target as Node)
      ) {
        setIsColormapOpen(false);
      }
    };
    if (isColormapOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isColormapOpen]);
  const [elevationScale, setElevationScale] = useState<number>(40);
  const [gridResolution] = useState<number>(128); // 128x128 grid density
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
    // 20% enlarged from 100 to 120 for commanding hero presence
    const planeSize = 120;
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize, res - 1, res - 1);
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
        size: 1.6,
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
      roughness: 0.38,
      metalness: 0.08,
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
    const height = mountNode.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? 0x141414 : 0xfafaf8);
    sceneRef.current = scene;

    // Camera: Lower angle & controlled perspective (FOV 40°) for clear scientific surface inspection
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
    camera.position.set(0, 56, 120);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountNode.appendChild(renderer.domElement);

    // OrbitControls: Vertically centered on terrain
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Prevent camera sinking under grid
    controls.minDistance = 25;
    controls.maxDistance = 350;
    controls.target.set(0, 10, 0);
    controlsRef.current = controls;

    // Lighting: Precision scientific directional + subtle fill
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.75 : 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight1.position.set(70, 110, 70);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x2563eb, 0.45);
    dirLight2.position.set(-70, -30, -70);
    scene.add(dirLight2);

    // Ground Helper Grid: Clean, visible scientific coordinate reference lines
    const gridHelper = new THREE.GridHelper(
      260,
      26,
      isDark ? 0x5a5a5a : 0x787870,
      isDark ? 0x383838 : 0xc0c0b8
    );
    gridHelper.position.y = -0.5;
    if (gridHelper.material instanceof THREE.LineBasicMaterial) {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = isDark ? 0.75 : 0.75;
    }
    scene.add(gridHelper);

    // Render Animation Loop
    let isActive = true;
    const animate = () => {
      if (!isActive) return;
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // ResizeObserver on mountNode to adapt smoothly to container resizing
    const resizeObserver = new ResizeObserver(() => {
      if (!mountNode || !rendererRef.current || !cameraRef.current) return;
      const newW = mountNode.clientWidth;
      const newH = mountNode.clientHeight;
      if (newW > 0 && newH > 0) {
        cameraRef.current.aspect = newW / newH;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newW, newH);
      }
    });
    resizeObserver.observe(mountNode);

    return () => {
      isActive = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDark]);

  // Keep references to current sampled intensities for fast height scaling without re-sampling/rebuilding
  const intensitiesBeforeRef = useRef<Float32Array | null>(null);
  const intensitiesAfterRef = useRef<Float32Array | null>(null);

  // Load Image Data & Build 3D Meshes (Only when source, target, colormap, style, or resolution changes)
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

        intensitiesBeforeRef.current = intBefore;
        intensitiesAfterRef.current = intAfter;

        const meshB = createTopographyMesh(
          intBefore,
          gridResolution,
          elevationScale,
          colormap,
          renderStyle,
          -70
        );
        const meshA = createTopographyMesh(
          intAfter,
          gridResolution,
          elevationScale,
          colormap,
          renderStyle,
          70
        );

        meshBeforeRef.current = meshB;
        meshAfterRef.current = meshA;
        scene.add(meshB);
        scene.add(meshA);

        if (controlsRef.current && cameraRef.current) {
          controlsRef.current.target.set(0, 10, 0);
          cameraRef.current.position.set(0, 68, 160);
          controlsRef.current.update();
        }
      } else if (activeSrc) {
        const intensities = await sampleImageIntensity(activeSrc, gridResolution);
        if (isCancelled) return;

        intensitiesBeforeRef.current = null;
        intensitiesAfterRef.current = intensities;

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

        if (controlsRef.current && cameraRef.current) {
          controlsRef.current.target.set(0, 10, 0);
          cameraRef.current.position.set(0, 56, 120);
          controlsRef.current.update();
        }
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
    gridResolution,
  ]);

  // Fast In-Place Elevation Scale Update (Zero stutter / lag when dragging height slider)
  useEffect(() => {
    const updateMeshHeight = (
      mesh: THREE.Mesh | THREE.Points | null,
      intensities: Float32Array | null
    ) => {
      if (!mesh || !intensities) return;
      const posAttr = mesh.geometry.attributes.position;
      if (!posAttr) return;

      for (let i = 0; i < posAttr.count; i++) {
        const normZ = intensities[i] || 0;
        posAttr.setY(i, normZ * elevationScale);
      }
      posAttr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    };

    if (displayTarget === "split-compare") {
      updateMeshHeight(meshBeforeRef.current, intensitiesBeforeRef.current);
      updateMeshHeight(meshAfterRef.current, intensitiesAfterRef.current);
    } else if (displayTarget === "original") {
      updateMeshHeight(meshBeforeRef.current, intensitiesBeforeRef.current);
    } else {
      updateMeshHeight(meshAfterRef.current, intensitiesAfterRef.current);
    }
  }, [elevationScale, displayTarget]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (displayTarget === "split-compare") {
      cameraRef.current.position.set(0, 68, 160);
      controlsRef.current.target.set(0, 10, 0);
    } else {
      cameraRef.current.position.set(0, 56, 120);
      controlsRef.current.target.set(0, 10, 0);
    }
    controlsRef.current.update();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full flex-1 overflow-hidden ${className}`}
    >
      {/* 2nd Row: Precision Topography Controls */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-3.5 py-1.5 border-b border-[#E8E8E3] dark:border-[#242424] bg-[#FAFAF8]/95 dark:bg-[#141414]/95 backdrop-blur-sm shrink-0">
        {/* Left Side: Target Segmented Control */}
        <div className="inline-flex items-center p-0.5 rounded-md bg-[#F0F0EC] dark:bg-[#181818] border border-[#E2E2DC] dark:border-[#262626]">
          {afterSrc && (
            <button
              type="button"
              onClick={() => setDisplayTarget("result")}
              className={`px-2.5 py-1 text-[11px] font-mono tracking-tight rounded-[4px] transition-all cursor-pointer ${
                displayTarget === "result"
                  ? "bg-white dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] font-medium shadow-2xs"
                  : "text-[#73736E] dark:text-[#8E8E88] hover:text-[#181818] dark:hover:text-[#EDEDED]"
              }`}
            >
              {afterLabel} 3D
            </button>
          )}
          {beforeSrc && (
            <button
              type="button"
              onClick={() => setDisplayTarget("original")}
              className={`px-2.5 py-1 text-[11px] font-mono tracking-tight rounded-[4px] transition-all cursor-pointer ${
                displayTarget === "original"
                  ? "bg-white dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] font-medium shadow-2xs"
                  : "text-[#73736E] dark:text-[#8E8E88] hover:text-[#181818] dark:hover:text-[#EDEDED]"
              }`}
            >
              {beforeLabel} 3D
            </button>
          )}
          {beforeSrc && afterSrc && (
            <button
              type="button"
              onClick={() => setDisplayTarget("split-compare")}
              className={`px-2.5 py-1 text-[11px] font-mono tracking-tight rounded-[4px] transition-all cursor-pointer ${
                displayTarget === "split-compare"
                  ? "bg-white dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] font-medium shadow-2xs"
                  : "text-[#73736E] dark:text-[#8E8E88] hover:text-[#181818] dark:hover:text-[#EDEDED]"
              }`}
            >
              Side-by-Side 3D
            </button>
          )}
        </div>

        {/* Right Side: Grouped Visualization Controls */}
        <div className="flex items-center gap-2">
          {/* Render Style Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-[#F0F0EC] dark:bg-[#181818] border border-[#E2E2DC] dark:border-[#262626]">
            <button
              type="button"
              onClick={() => setRenderStyle("surface")}
              className={`p-1 rounded-[4px] text-xs transition-all cursor-pointer ${
                renderStyle === "surface"
                  ? "bg-white dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] shadow-2xs"
                  : "text-[#73736E] dark:text-[#8E8E88] hover:text-[#111111] dark:hover:text-[#EDEDED]"
              }`}
              title="Solid Surface Mesh"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRenderStyle("wireframe")}
              className={`p-1 rounded-[4px] text-xs transition-all cursor-pointer ${
                renderStyle === "wireframe"
                  ? "bg-white dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] shadow-2xs"
                  : "text-[#73736E] dark:text-[#8E8E88] hover:text-[#111111] dark:hover:text-[#EDEDED]"
              }`}
              title="Wireframe Mesh"
            >
              <Box className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRenderStyle("points")}
              className={`p-1 rounded-[4px] text-xs transition-all cursor-pointer ${
                renderStyle === "points"
                  ? "bg-white dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] shadow-2xs"
                  : "text-[#73736E] dark:text-[#8E8E88] hover:text-[#111111] dark:hover:text-[#EDEDED]"
              }`}
              title="Point Cloud"
            >
              <CircleDot className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#E2E2DC] dark:bg-[#262626]" />

          {/* Colormap Selector Dropdown with Color Swatch Preview */}
          <div ref={colormapDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsColormapOpen((prev) => !prev)}
              className="h-7 text-xs font-mono bg-white dark:bg-[#181818] border border-[#E2E2DC] dark:border-[#262626] text-[#181818] dark:text-[#F2F2F0] rounded-md px-2 flex items-center justify-between gap-2 min-w-[152px] shadow-2xs hover:bg-[#F5F5F2] dark:hover:bg-[#222222] transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`w-3 h-3 rounded-[3px] shrink-0 border border-black/15 dark:border-white/20 bg-gradient-to-r ${
                    colormapOptions.find((opt) => opt.value === colormap)?.gradient || ""
                  }`}
                />
                <span className="truncate text-[11px] whitespace-nowrap">
                  {colormapOptions.find((opt) => opt.value === colormap)?.label || "Colormap"}
                </span>
              </div>
              <ChevronDown
                className={`h-3 w-3 text-[#73736E] dark:text-[#8E8E88] transition-transform duration-150 shrink-0 ${
                  isColormapOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isColormapOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-[100] w-max min-w-[172px] rounded-md border border-[#E2E2DC] dark:border-[#262626] bg-white dark:bg-[#181818] p-1 shadow-lg font-mono text-xs animate-in fade-in-0 zoom-in-95 duration-100"
              >
                {colormapOptions.map((opt) => {
                  const isSelected = opt.value === colormap;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setColormap(opt.value);
                        setIsColormapOpen(false);
                      }}
                      className={`relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-[4px] py-1.5 px-2 text-xs outline-none transition-colors whitespace-nowrap ${
                        isSelected
                          ? "bg-[#EBEBE6] dark:bg-[#262626] text-[#111111] dark:text-[#EDEDED] font-medium"
                          : "text-[#73736E] dark:text-[#8E8E88] hover:bg-[#F5F5F2] dark:hover:bg-[#222222] hover:text-[#111111] dark:hover:text-[#EDEDED]"
                      }`}
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`w-3.5 h-3.5 rounded-[3px] shrink-0 border border-black/15 dark:border-white/20 bg-gradient-to-r ${opt.gradient}`}
                        />
                        <span className="text-[11px] whitespace-nowrap">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-3 w-3 text-[#111111] dark:text-[#EDEDED] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reset Camera View */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="h-7 w-7 rounded-md border border-[#E2E2DC] dark:border-[#262626] bg-white dark:bg-[#181818] text-[#73736E] dark:text-[#8E8E88] hover:text-[#111111] dark:hover:text-[#EDEDED] hover:bg-[#F5F5F2] dark:hover:bg-[#222222] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Reset Camera View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D WebGL Canvas Surface */}
      <div className={`relative w-full overflow-hidden ${isFullscreen ? "flex-1 min-h-0" : "h-[500px] sm:h-[560px]"}`}>
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none" />

        {/* Minimalist Shimmer Overlay - Sweeps across viewing window when loading / switching options */}
        {loading && (
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/25 dark:via-white/15 to-transparent skew-x-12 animate-shimmer-sweep" />
          </div>
        )}

        {/* Bottom-Left Scientific Interaction HUD - Horizontally Centered, No Dot */}
        <div className="absolute bottom-3 left-3 pointer-events-none select-none flex items-center justify-center text-center px-3 py-1.5 rounded-md bg-[#101010]/75 dark:bg-[#0A0A0A]/80 border border-white/10 text-white/70 backdrop-blur-md shadow-xs font-mono text-[10px] tracking-tight">
          <span>Rotate: Drag · Zoom: Scroll</span>
        </div>

        {/* Bottom-Right Compact Floating Height Scale HUD - Website Blue Accent */}
        <div className="absolute bottom-3 right-3 select-none flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#101010]/75 dark:bg-[#0A0A0A]/80 border border-white/10 text-white/80 backdrop-blur-md shadow-xs font-mono text-[11px]">
          <span className="text-white/50 text-[10px] uppercase tracking-wider font-medium">Height</span>
          <div className="w-24 sm:w-28 flex items-center">
            <Slider
              min={5}
              max={90}
              step={1}
              value={elevationScale}
              showInput={false}
              onChange={(e) => setElevationScale(Number(e.target.value))}
              className="py-0.5 [&_[data-slot=slider-range]]:bg-[#2563EB] dark:[&_[data-slot=slider-range]]:bg-[#5B8CFF] [&_[data-slot=slider-thumb]]:border-[#2563EB] dark:[&_[data-slot=slider-thumb]]:border-[#5B8CFF]"
            />
          </div>
          <span className="text-white font-medium text-[11px] w-7 text-right tabular-nums">
            {elevationScale}×
          </span>
        </div>
      </div>
    </div>
  );
}
