"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When route (pathname or searchParams) changes, initiate a brief smooth loading progress
    setIsNavigating(true);
    setProgress(15);

    const t1 = setTimeout(() => setProgress(65), 60);
    const t2 = setTimeout(() => setProgress(90), 160);
    const t3 = setTimeout(() => {
      setProgress(100);
      const t4 = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(t4);
    }, 280);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, searchParams]);

  // Listen for internal Link clicks to show instant responsiveness
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        target.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // Only trigger if going to a different location
        const currentFull = window.location.pathname + window.location.search;
        if (href !== currentFull) {
          setIsNavigating(true);
          setProgress(25);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-[2px] bg-transparent overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 dark:from-blue-500 dark:via-cyan-400 dark:to-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.7)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
          transitionDuration: progress === 100 ? "200ms" : "200ms",
        }}
      />
    </div>
  );
}
