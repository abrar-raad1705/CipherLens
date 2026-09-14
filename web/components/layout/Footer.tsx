"use client";

import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] py-3.5 text-xs text-[#6F6F6A] dark:text-[#A0A09B]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#181818] dark:text-[#F2F2F0]">CipherLens</span>
          <span>·</span>
          <span>Computational Imaging Laboratory</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-[#999993] dark:text-[#6A6A6A]">
          <span>4f Optical Simulation</span>
          <span>·</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
