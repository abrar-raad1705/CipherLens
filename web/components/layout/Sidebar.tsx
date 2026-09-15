"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Binary,
  Compass,
  FolderKanban,
  ShieldCheck,
  Shuffle,
  Sliders,
  Sparkles,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  paramKey?: string;
  paramVal?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: "LABORATORY",
    items: [
      { label: "Overview", href: "/", icon: Compass },
    ],
  },
  {
    section: "PROCESSING",
    items: [
      {
        label: "Convolution",
        href: "/processing/convolution",
        icon: Sliders,
      },
      {
        label: "Deconvolution",
        href: "/processing/deconvolution",
        icon: Sparkles,
      },
    ],
  },
  {
    section: "ENCRYPTION",
    items: [
      {
        label: "4f DRPE Optics",
        href: "/encryption/drpe",
        icon: ShieldCheck,
      },
      {
        label: "Fourier Phase",
        href: "/encryption/fourier",
        icon: Waves,
      },
      {
        label: "DCT Permutation",
        href: "/encryption/dct",
        icon: Binary,
      },
      {
        label: "Arnold Cat Map",
        href: "/encryption/arnold",
        icon: Shuffle,
      },
    ],
  },
  {
    section: "ANALYSIS",
    items: [
      { label: "Quantitative Metrics", href: "/analysis", icon: BarChart3 },
    ],
  },
];

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.section} className="space-y-2">
          <div className="text-xs font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase px-2 font-medium">
            {group.section}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const baseHref = item.href.split("?")[0];
              const isPathMatch =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === baseHref;

              let isActive = isPathMatch;
              if (isPathMatch && item.paramKey) {
                const currentParam = searchParams.get(item.paramKey);
                if (currentParam) {
                  isActive = currentParam === item.paramVal;
                } else {
                  isActive = false;
                }
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between text-sm py-2 px-2.5 rounded-md transition-colors",
                    isActive
                      ? "text-[#181818] dark:text-[#F2F2F0] font-medium bg-black/[0.04] dark:bg-white/[0.04]"
                      : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-[#2563EB] dark:text-[#5B8CFF]"
                          : "text-[#999993] dark:text-[#6A6A6A]"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] dark:bg-[#5B8CFF] shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-[230px] shrink-0 border-r border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-4 select-none h-full overflow-y-auto overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-[#999993] p-2">Loading nav...</div>}>
        <SidebarNav />
      </Suspense>
    </aside>
  );
}
