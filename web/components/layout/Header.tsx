"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Binary,
  Compass,
  FolderKanban,
  ImageIcon,
  Menu,
  Moon,
  RefreshCw,
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
import { ChangeImageModal } from "@/components/upload/ChangeImageModal";

export function Header() {
  const pathname = usePathname();
  const { activeArtifact, isMounted } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isThumbnailHovered, setIsThumbnailHovered] = useState(false);

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
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8]/95 dark:bg-[#101010]/95 backdrop-blur-md">
        <div className="flex h-13 items-center justify-between px-4 sm:px-6">
          {/* Left: Brand & Mobile Toggle */}
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
              <span className="font-brand text-[22px] sm:text-[24px] font-normal tracking-tight text-[#181818] dark:text-[#F2F2F0] select-none">
                CipherLens
              </span>
            </Link>
          </div>

          {/* Right: Current Image Controller & Theme Switcher */}
          <div className="flex items-center gap-3">
            {/* Active Image Target Pill / Switcher */}
            {isMounted && activeArtifact && activeArtifact.dataUri ? (
              <div className="relative">
                <div
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full border border-[#E8E8E3] dark:border-[#292929] bg-white dark:bg-[#161616] shadow-2xs hover:border-[#D0D0C8] dark:hover:border-[#383838] transition-colors"
                >
                  {/* Thumbnail with Hover Trigger */}
                  <div
                    className="relative group cursor-pointer"
                    onMouseEnter={() => setIsThumbnailHovered(true)}
                    onMouseLeave={() => setIsThumbnailHovered(false)}
                    onClick={() => setIsChangeModalOpen(true)}
                    title="Hover to inspect · Click to change"
                  >
                    <div className="h-5.5 w-5.5 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-[#EFEFEA] dark:bg-[#202020] hover:ring-2 hover:ring-[#2563EB]/40 transition-all">
                      <img
                        src={activeArtifact.dataUri}
                        alt={activeArtifact.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div
                    className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                    onMouseEnter={() => setIsThumbnailHovered(true)}
                    onMouseLeave={() => setIsThumbnailHovered(false)}
                    onClick={() => setIsChangeModalOpen(true)}
                  >
                    <span
                      className="font-medium text-[#181818] dark:text-[#F2F2F0] max-w-[100px] sm:max-w-[140px] truncate"
                      title={activeArtifact.name}
                    >
                      {activeArtifact.name}
                    </span>
                    <span className="hidden sm:inline text-[#A0A09B] dark:text-[#6A6A6A] font-mono text-[11px]">
                      ({activeArtifact.width}×{activeArtifact.height})
                    </span>
                  </div>

                  {/* Change Button */}
                  <button
                    onClick={() => setIsChangeModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#181818] dark:text-[#F2F2F0] bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] rounded-full transition-colors cursor-pointer ml-1"
                  >
                    <RefreshCw className="h-3 w-3 text-[#6F6F6A] dark:text-[#A0A09B]" />
                    <span>Change</span>
                  </button>
                </div>

                {/* Large Hover Inspection Frame */}
                {isThumbnailHovered && (
                  <div
                    className="absolute right-0 top-full mt-2.5 z-50 p-2.5 rounded-xl border border-[#E8E8E3] dark:border-[#2D2D2D] bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
                    style={{ width: "320px" }}
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-[#0c0c0c] flex items-center justify-center checkerboard-pattern">
                      <img
                        src={activeArtifact.dataUri}
                        alt={activeArtifact.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="mt-2.5 px-1 flex items-center justify-between text-xs">
                      <div className="truncate font-medium text-[#181818] dark:text-[#F2F2F0] pr-2">
                        {activeArtifact.name}
                      </div>
                      <div className="shrink-0 font-mono text-[11px] text-[#8E8E88] dark:text-[#888882]">
                        {activeArtifact.width} × {activeArtifact.height} px
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : isMounted ? (
              <button
                onClick={() => setIsChangeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] border border-dashed border-[#D7D7D1] dark:border-[#333333] hover:border-[#999993] dark:hover:border-[#555555] rounded-full bg-white dark:bg-[#161616] transition-colors cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[#888880]" />
                <span>Select Target Image</span>
              </button>
            ) : null}

            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-[#FFAB5E]" />
              ) : (
                <Moon className="h-4 w-4 text-[#4B5563]" />
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

    {/* Change Image Modal with Artifact Gallery, Upload & Crop/Zoom */}
    <ChangeImageModal
      isOpen={isChangeModalOpen}
      onClose={() => setIsChangeModalOpen(false)}
    />
  </>
  );
}
