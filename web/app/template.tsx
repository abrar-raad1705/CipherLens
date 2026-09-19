"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reset and trigger smooth mounting transition on route change
    setMounted(false);
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`w-full transition-all duration-300 ease-out ${
        mounted
          ? "opacity-100 translate-y-0 filter-none"
          : "opacity-0 translate-y-1 blur-[1px]"
      }`}
    >
      {children}
    </div>
  );
}
