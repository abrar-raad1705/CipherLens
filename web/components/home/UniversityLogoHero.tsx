"use client";

import { useCallback, useRef, useState } from "react";

/** Spatial/Fourier 2D frequency domain image comparison used on the overview page. */
export function UniversityLogoHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);

  const updateFromPointer = useCallback((clientX: number) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const next = ((clientX - bounds.left) / bounds.width) * 100;
    setSplit(Math.max(0, Math.min(100, next)));
  }, []);

  return (
    <div className="w-full max-w-[480px] lg:max-w-[500px] select-none">
      <div
        ref={containerRef}
        onPointerDown={(event) => updateFromPointer(event.clientX)}
        onPointerMove={(event) => updateFromPointer(event.clientX)}
        className="relative aspect-square w-full overflow-hidden bg-transparent cursor-ew-resize touch-none"
      >
        <div
          className="absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(ellipse at center, black 58%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 58%, transparent 100%)",
          }}
        >
          <img
            src="/ece_fourier.png"
            alt="2D Fourier domain of ECE image"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div
          className="absolute inset-0 overflow-hidden bg-[#101010] dark:bg-[#101010]"
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        >
          <img
            src="/ece.png"
            alt="Original ECE image"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          style={{ left: `${split}%` }}
        />
      </div>
    </div>
  );
}
