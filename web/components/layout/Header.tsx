"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  Database,
  Layers,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
  Check,
  Compass,
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-image";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const pathname = usePathname();
  const {
    activeArtifact,
    artifacts,
    presets,
    isBackendConnected,
    isMounted,
    setActiveArtifactId,
    loadPresetById,
  } = useWorkspace();

  const { theme, toggleTheme, isMounted: isThemeMounted } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { label: "Workspace", step: "01", href: "/workspace", icon: Database },
    { label: "Filtering", step: "02", href: "/processing/convolution", icon: Layers },
    { label: "DRPE Optics", step: "03", href: "/encryption/drpe", icon: ShieldCheck },
    { label: "Analysis", step: "04", href: "/analysis", icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#EDEDEB] dark:border-[#2E2E2E] bg-white/85 dark:bg-[#191919]/85 backdrop-blur-md transition-colors duration-150">
      <div className="mx-auto flex h-13 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F1F1EF] dark:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#383838] text-[#37352F] dark:text-[#E6E5E3] transition-colors">
              <Compass className="h-4 w-4 text-[#37352F] dark:text-[#E6E5E3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-tight text-[#37352F] dark:text-[#E6E5E3] font-sans">
                CipherLens
              </span>
              <span className="text-[10px] text-[#787774] dark:text-[#9B9B9B] -mt-0.5">
                Optical Lab
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Stepper */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname?.startsWith(
                item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href
              );
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors font-medium select-none",
                    isActive
                      ? "bg-[#EFEFED] dark:bg-[#2A2A2A] text-[#37352F] dark:text-[#FFFFFF]"
                      : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-[#E6E5E3] hover:bg-[#F7F6F5] dark:hover:bg-[#242424]"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-mono",
                      isActive
                        ? "text-[#37352F] dark:text-[#E6E5E3]"
                        : "text-[#9B9A97] dark:text-[#6A6A6A]"
                    )}
                  >
                    {item.step}
                  </span>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Active Target, Theme Toggle & Status */}
        <div className="flex items-center gap-2.5">
          {/* Target Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
              className="flex items-center gap-2 bg-white dark:bg-[#222222] hover:bg-[#F7F6F5] dark:hover:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#2E2E2E] px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer shadow-xs"
              title="Switch active target or load benchmark presets"
            >
              {!isMounted ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-[#F1F1EF] dark:bg-[#2A2A2A] animate-pulse" />
                  <div className="h-3 w-16 bg-[#F1F1EF] dark:bg-[#2A2A2A] rounded animate-pulse hidden sm:block" />
                </div>
              ) : activeArtifact ? (
                <>
                  <div className="h-5 w-5 rounded overflow-hidden flex-shrink-0 border border-[#EDEDEB] dark:border-[#383838]">
                    <img
                      src={activeArtifact.dataUri}
                      alt={activeArtifact.name}
                      className="h-full w-full object-cover"
                      suppressHydrationWarning
                    />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div
                      suppressHydrationWarning
                      className="text-xs font-medium text-[#37352F] dark:text-[#E6E5E3] max-w-[110px] truncate"
                    >
                      {activeArtifact.name}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#9B9A97] dark:text-[#787774]" />
                </>
              ) : (
                <span className="text-xs text-[#787774] dark:text-[#9B9B9B]">Select Target</span>
              )}
            </button>

            {/* Target Dropdown Menu */}
            {targetDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 rounded-lg bg-white dark:bg-[#222222] border border-[#EDEDEB] dark:border-[#2E2E2E] shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[11px] font-medium text-[#787774] dark:text-[#9B9B9B] border-b border-[#EDEDEB] dark:border-[#2E2E2E] flex items-center justify-between">
                  <span>Artifacts ({artifacts.length})</span>
                  <Link
                    href="/workspace"
                    onClick={() => setTargetDropdownOpen(false)}
                    className="text-[#2383E2] hover:underline cursor-pointer"
                  >
                    Manage
                  </Link>
                </div>

                <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
                  {artifacts.map((art) => {
                    const isSelected = activeArtifact?.id === art.id;
                    return (
                      <button
                        key={art.id}
                        onClick={() => {
                          setActiveArtifactId(art.id);
                          setTargetDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-1.5 rounded-md text-left transition-colors cursor-pointer text-xs",
                          isSelected
                            ? "bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-white font-medium"
                            : "hover:bg-[#F7F6F5] dark:hover:bg-[#2A2A2A] text-[#787774] dark:text-[#E6E5E3]"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={art.dataUri}
                            alt={art.name}
                            className="h-6 w-6 rounded border border-[#EDEDEB] dark:border-[#383838] object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-xs">{art.name}</div>
                            <div className="text-[10px] text-[#9B9A97] dark:text-[#787774]">
                              {art.width}×{art.height} • {art.sourceBench}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#37352F] dark:text-white flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                {presets.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-[#EDEDEB] dark:border-[#2E2E2E]">
                    <div className="px-2 pb-1 text-[10px] uppercase font-semibold tracking-wider text-[#9B9A97] dark:text-[#787774]">
                      Presets
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      {presets.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            loadPresetById(p.id);
                            setTargetDropdownOpen(false);
                          }}
                          className="flex items-center gap-1.5 p-1.5 rounded bg-[#F7F6F5] dark:bg-[#2A2A2A] hover:bg-[#EFEFED] dark:hover:bg-[#333333] text-[11px] text-[#37352F] dark:text-[#E6E5E3] transition-colors cursor-pointer text-left"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-4 w-4 rounded object-cover flex-shrink-0"
                          />
                          <span className="truncate">{p.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-[#E6E5E3] hover:bg-[#F7F6F5] dark:hover:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#2E2E2E] transition-colors cursor-pointer shadow-xs"
            title={
              !isThemeMounted
                ? "Toggle Theme"
                : theme === "dark"
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
            }
            aria-label="Toggle theme"
          >
            {!isThemeMounted ? (
              <Moon className="h-4 w-4" />
            ) : theme === "dark" ? (
              <Sun className="h-4 w-4 text-[#FFAB5E]" />
            ) : (
              <Moon className="h-4 w-4 text-[#37352F]" />
            )}
          </button>

          {/* Backend Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-[#787774] dark:text-[#9B9B9B] border border-[#EDEDEB] dark:border-[#2E2E2E]">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isBackendConnected ? "bg-[#0F7B6C] dark:bg-[#4DAB9A]" : "bg-[#D9730D]"
              )}
            />
            <span>{isBackendConnected ? "Core Online" : "FastAPI 8000"}</span>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-[#787774] dark:text-[#9B9B9B] hover:bg-[#F7F6F5] dark:hover:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#2E2E2E]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EDEDEB] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] p-3 space-y-1 animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(
              item.href.split("/")[1] ? `/${item.href.split("/")[1]}` : item.href
            );
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-[#EFEFED] dark:bg-[#2A2A2A] text-[#37352F] dark:text-white"
                    : "text-[#787774] dark:text-[#9B9B9B] hover:bg-[#F7F6F5] dark:hover:bg-[#242424]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-[#9B9A97] dark:text-[#6A6A6A]">
                    {item.step}
                  </span>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
