"use client";

import React, { useRef, useCallback } from "react";

interface KernelGridProps {
  matrix: number[][];
  onChange: (matrix: number[][]) => void;
  readOnly?: boolean;
}

/**
 * Interactive N×N integer kernel grid.
 * Edit: type · ↑↓ ±1 · Shift+↑↓ ±5 · scroll ±1 · ←→ navigate cells
 */
export function KernelGrid({ matrix, onChange, readOnly = false }: KernelGridProps) {
  const size = matrix.length;
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: size }, () => Array(size).fill(null))
  );

  const updateCell = useCallback(
    (r: number, c: number, val: number) => {
      const next = matrix.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? val : cell))
      );
      onChange(next);
    },
    [matrix, onChange]
  );

  const focusCell = (r: number, c: number) => {
    const el = inputRefs.current[r]?.[c];
    if (el) { el.focus(); el.select(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      updateCell(r, c, matrix[r][c] + step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      updateCell(r, c, matrix[r][c] - step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const nc = c + 1 < size ? c + 1 : 0;
      const nr = c + 1 < size ? r : (r + 1 < size ? r + 1 : 0);
      focusCell(nr, nc);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const nc = c - 1 >= 0 ? c - 1 : size - 1;
      const nr = c - 1 >= 0 ? r : (r - 1 >= 0 ? r - 1 : size - 1);
      focusCell(nr, nc);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>, r: number, c: number) => {
    if (readOnly) return;
    e.preventDefault();
    updateCell(r, c, matrix[r][c] + (e.deltaY < 0 ? 1 : -1));
  };

  const matrixSum = matrix.reduce(
    (acc, row) => acc + row.reduce((s, v) => s + (Number(v) || 0), 0),
    0
  );

  return (
    <div className="space-y-2.5">
      {/* Grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            const isCenter = r === Math.floor(size / 2) && c === Math.floor(size / 2);
            return (
              <input
                key={`${r}-${c}`}
                ref={(el) => {
                  if (!inputRefs.current[r]) inputRefs.current[r] = [];
                  inputRefs.current[r][c] = el;
                }}
                type="number"
                step="1"
                value={cell}
                readOnly={readOnly}
                onChange={(e) => {
                  if (readOnly) return;
                  const raw = e.target.value;
                  const val = parseInt(raw, 10);
                  updateCell(r, c, isNaN(val) ? 0 : val);
                }}
                onKeyDown={(e) => !readOnly && handleKeyDown(e, r, c)}
                onWheel={(e) => handleWheel(e, r, c)}
                onFocus={(e) => e.target.select()}
                className={[
                  "w-full text-center py-2 px-0.5 text-xs font-mono rounded border transition-all outline-none",
                  "focus:ring-1 focus:ring-[#2563EB] dark:focus:ring-[#5B8CFF]",
                  readOnly ? "cursor-default" : "cursor-text",
                  isCenter
                    ? "bg-[#2563EB]/8 dark:bg-[#5B8CFF]/12 border-[#2563EB]/50 dark:border-[#5B8CFF]/50 text-[#2563EB] dark:text-[#5B8CFF] font-bold"
                    : "bg-white dark:bg-[#181818] border-[#E0E0DA] dark:border-[#2D2D2D] text-[#181818] dark:text-[#F2F2F0] hover:border-[#B0B0A8] dark:hover:border-[#484848]",
                ].join(" ")}
                title={`[${r},${c}]${isCenter ? " — center" : ""}  ↑↓=±1  Shift+↑↓=±5  Scroll=±1`}
              />
            );
          })
        )}
      </div>

      {/* Footer: Sum + quick tools */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E8E8E3] dark:border-[#292929]">
        {/* Sum display */}
        <span className="text-[#999993] dark:text-[#6A6A6A]">
          Sum:{" "}
          <span className={[
            "font-semibold",
            Math.abs(matrixSum - 1) < 0.01 ? "text-emerald-500" :
            Math.abs(matrixSum) < 0.01 ? "text-amber-500" :
            "text-[#181818] dark:text-[#F2F2F0]",
          ].join(" ")}>
            {matrixSum}
          </span>
        </span>

        {!readOnly && (
          <div className="flex items-center gap-2.5 text-[#999993] dark:text-[#6A6A6A]">
            <button
              type="button"
              onClick={() => {
                const identity = Array.from({ length: size }, (_, r) =>
                  Array.from({ length: size }, (_, c) =>
                    r === Math.floor(size / 2) && c === Math.floor(size / 2) ? 1 : 0
                  )
                );
                onChange(identity);
              }}
              className="underline hover:text-[#2563EB] dark:hover:text-[#5B8CFF] cursor-pointer transition-colors"
            >
              Identity
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onChange(matrix.map((row) => row.map(() => 0)))}
              className="underline hover:text-[#2563EB] dark:hover:text-[#5B8CFF] cursor-pointer transition-colors"
            >
              Zero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
