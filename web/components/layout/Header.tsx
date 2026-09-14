"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Binary,
  Compass,
  FolderKanban,
  Menu,
  Moon,
  ShieldCheck,
  Shuffle,
  Sliders,
  Sparkles,
  Sun,
  Waves,
  X,
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-image";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const pathname = usePathname();
  const { activeArtifact, isBackendConnected, isMounted } = useWorkspace();
  const { theme, toggleTheme, isMounted: isThemeMounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/", icon: Compass },
    { label: "Workspace", href: "/workspace", icon: FolderKanban },
    { label: "Convolution", href: "/processing/convolution", icon: Sliders },
    { label: "Deconvolution", href: "/processing/convolution?mode=deconvolution", icon: Sparkles },
    { label: "4f DRPE Optics", href: "/encryption/drpe?algo=drpe", icon: ShieldCheck },
    { label: "Fourier Phase", href: "/encryption/drpe?algo=fourier", icon: Waves },
    { label: "DCT Permutation", href: "/encryption/drpe?algo=dct", icon: Binary },
    { label: "Arnold Cat Map", href: "/encryption/drpe?algo=arnold", icon: Shuffle },
    { label: "Quantitative Analysis", href: "/analysis", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8]/95 dark:bg-[#101010]/95 backdrop-blur-md">
      <div className="flex h-13 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Mobile Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] rounded"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            href="/"
            className="flex items-center hover:opacity-85 transition-opacity"
          >
            <span className="font-brand font-serif text-[21px] sm:text-[22px] font-medium tracking-tight text-[#181818] dark:text-[#F2F2F0] select-none">
              CipherLens
            </span>
          </Link>
        </div>

        {/* Right: Current Image Metadata & System Status */}
        <div className="flex items-center gap-4 text-sm">
          {/* Active Image Metadata */}
          {isMounted && activeArtifact && activeArtifact.dataUri ? (
            <div className="flex items-center gap-2.5 text-[#6F6F6A] dark:text-[#A0A09B]">
              <span className="hidden sm:inline font-medium text-xs truncate max-w-[150px] text-[#181818] dark:text-[#F2F2F0]">
                {activeArtifact.name}
              </span>
              <span className="hidden sm:inline text-[#D7D7D1] dark:text-[#383838]">·</span>
              <span className="font-mono text-xs">
                {activeArtifact.width} × {activeArtifact.height} · RGB
              </span>
              <Link
                href="/workspace"
                className="text-xs text-[#2563EB] dark:text-[#5B8CFF] hover:underline font-medium ml-1"
              >
                Change
              </Link>
            </div>
          ) : isMounted ? (
            <Link
              href="/workspace"
              className="text-xs text-[#999993] dark:text-[#6A6A6A] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
            >
              No image loaded
            </Link>
          ) : null}

          {/* Core FastAPI Status Dot */}
          <div
            className="flex items-center gap-1.5"
            title={isBackendConnected ? "Core FastAPI Connected (Port 8000)" : "FastAPI Offline"}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isBackendConnected ? "bg-[#059669] dark:bg-[#34D399]" : "bg-[#D7D7D1] dark:bg-[#383838]"
              )}
            />
            <span className="hidden lg:inline text-xs text-[#999993] dark:text-[#6A6A6A]">
              {isBackendConnected ? "Core Online" : "FastAPI Offline"}
            </span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {!isThemeMounted ? (
              <div className="h-4 w-4" />
            ) : theme === "dark" ? (
              <Sun className="h-4 w-4 text-[#FFAB5E]" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href.split("?")[0]);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between py-2 px-2.5 text-sm rounded transition-colors",
                  isActive
                    ? "text-[#181818] dark:text-[#F2F2F0] font-medium bg-black/[0.04] dark:bg-white/[0.04]"
                    : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF]" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
