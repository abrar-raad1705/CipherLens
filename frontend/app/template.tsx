"use client";

import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full animate-in fade-in duration-150">
      {children}
    </div>
  );
}
