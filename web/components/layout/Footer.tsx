"use client";

import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] py-3 text-[11px] text-[#999993] dark:text-[#6A6A6A]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]">BAT SIGNAL</span>
          <span>·</span>
          <span>Computational Imaging Laboratory</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>4f Optical Simulation</span>
          <span>·</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
