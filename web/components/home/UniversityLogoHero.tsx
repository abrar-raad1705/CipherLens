"use client";

import { useCallback, useRef, useState } from "react";

/** Original/encrypted image comparison used on the overview page. */
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
            src="/ece_encrypted.png"
            alt="Encrypted ECE image"
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
        >
          <div className="absolute left-1/2 top-1/2 flex h-7 w-4.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-white shadow-[0_1px_5px_rgba(0,0,0,0.3)] select-none">
            <div className="grid grid-cols-2 gap-x-[3px] gap-y-[3px]">
              <span className="size-[2.5px] rounded-full bg-[#71717A]" />
              <span className="size-[2.5px] rounded-full bg-[#71717A]" />
              <span className="size-[2.5px] rounded-full bg-[#71717A]" />
              <span className="size-[2.5px] rounded-full bg-[#71717A]" />
              <span className="size-[2.5px] rounded-full bg-[#71717A]" />
              <span className="size-[2.5px] rounded-full bg-[#71717A]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
