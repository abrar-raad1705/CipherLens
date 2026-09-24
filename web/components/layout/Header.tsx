"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AdjustmentsHorizontalIcon as Sliders,
  Bars3Icon as Menu,
  ChartBarIcon as Chart,
  GlobeAltIcon as Compass,
  LockClosedIcon as Lock,
  LockOpenIcon as Unlock,
  MoonIcon as Moon,
  SunIcon as Sun,
  XMarkIcon as X,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme, isMounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/", icon: Compass },
    { label: "Image Processing", href: "/processing/convolution", icon: Sliders },
    { label: "Encryption", href: "/encryption", icon: Lock },
    { label: "Decryption", href: "/decryption", icon: Unlock },
    { label: "Cryptanalysis", href: "/analysis", icon: Chart },
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

          {/* Right: Theme Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {!isMounted ? (
                <div className="h-4 w-4" />
              ) : theme === "dark" ? (
                <Sun className="h-4 w-4 text-[#FFAB5E]" />
              ) : (
                <Moon className="h-4 w-4 text-[#4B5563]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
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
    </>
  );
}
