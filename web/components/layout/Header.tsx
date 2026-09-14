"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useWorkspace } from "@/hooks/use-image";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const pathname = usePathname();
  const { activeArtifact, isBackendConnected, isMounted } = useWorkspace();
  const { theme, toggleTheme, isMounted: isThemeMounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/" },
    { label: "Workspace", href: "/workspace" },
    { label: "Convolution", href: "/processing/convolution" },
    { label: "DRPE Optics", href: "/encryption/drpe" },
    { label: "Quantitative Analysis", href: "/analysis" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8]/90 dark:bg-[#101010]/90 backdrop-blur-md">
      <div className="flex h-12 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Mobile Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link
            href="/"
            className="text-xs font-semibold tracking-wider text-[#181818] dark:text-[#F2F2F0] uppercase hover:opacity-80 transition-opacity"
          >
            BAT SIGNAL
          </Link>
        </div>

        {/* Right: Current Image Metadata & Tools */}
        <div className="flex items-center gap-4 text-xs">
          {/* Active Image Metadata */}
          {isMounted && activeArtifact && activeArtifact.dataUri ? (
            <div className="flex items-center gap-2 text-[#6F6F6A] dark:text-[#A0A09B]">
              <span className="hidden sm:inline font-mono text-[11px] truncate max-w-[140px] text-[#181818] dark:text-[#F2F2F0]">
                {activeArtifact.name}
              </span>
              <span className="hidden sm:inline text-[#D7D7D1] dark:text-[#383838]">·</span>
              <span className="font-mono text-[11px]">
                {activeArtifact.width} × {activeArtifact.height} · RGB
              </span>
              <Link
                href="/workspace"
                className="text-[11px] text-[#2563EB] dark:text-[#5B8CFF] hover:underline ml-1"
              >
                Change
              </Link>
            </div>
          ) : isMounted ? (
            <Link
              href="/workspace"
              className="text-[11px] text-[#999993] dark:text-[#6A6A6A] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            >
              No image loaded
            </Link>
          ) : null}

          {/* Core Status Dot */}
          <div
            className="flex items-center gap-1.5"
            title={isBackendConnected ? "Core FastAPI Connected (8000)" : "FastAPI Offline"}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isBackendConnected ? "bg-[#059669] dark:bg-[#34D399]" : "bg-[#D7D7D1] dark:bg-[#383838]"
              )}
            />
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] p-1 transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {!isThemeMounted ? (
              <div className="h-3.5 w-3.5" />
            ) : theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Clean list, no nested cards) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-4 space-y-2">
          {navLinks.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between py-2 px-2 text-xs rounded transition-colors",
                  isActive
                    ? "text-[#181818] dark:text-[#F2F2F0] font-medium"
                    : "text-[#6F6F6A] dark:text-[#A0A09B]"
                )}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="h-1 w-1 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF]" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
