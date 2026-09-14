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
      { label: "Workspace", href: "/workspace", icon: FolderKanban },
    ],
  },
  {
    section: "PROCESSING",
    items: [
      {
        label: "Convolution",
        href: "/processing/convolution",
        icon: Sliders,
        paramKey: "mode",
        paramVal: "gaussian",
      },
      {
        label: "Deconvolution",
        href: "/processing/convolution?mode=deconvolution",
        icon: Sparkles,
        paramKey: "mode",
        paramVal: "deconvolution",
      },
    ],
  },
  {
    section: "ENCRYPTION",
    items: [
      {
        label: "4f DRPE Optics",
        href: "/encryption/drpe?algo=drpe",
        icon: ShieldCheck,
        paramKey: "algo",
        paramVal: "drpe",
      },
      {
        label: "Fourier Phase",
        href: "/encryption/drpe?algo=fourier",
        icon: Waves,
        paramKey: "algo",
        paramVal: "fourier",
      },
      {
        label: "DCT Permutation",
        href: "/encryption/drpe?algo=dct",
        icon: Binary,
        paramKey: "algo",
        paramVal: "dct",
      },
      {
        label: "Arnold Cat Map",
        href: "/encryption/drpe?algo=arnold",
        icon: Shuffle,
        paramKey: "algo",
        paramVal: "arnold",
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
                } else if (item.paramVal === "gaussian" || item.paramVal === "drpe") {
                  isActive = true;
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
    <aside className="hidden md:flex flex-col w-[230px] shrink-0 border-r border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-4 select-none sticky top-13 h-[calc(100vh-3.25rem)] overflow-y-auto">
      {/* Brand Header inside Sidebar */}
      <div className="pb-4 mb-4 border-b border-[#E8E8E3] dark:border-[#292929] px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#2563EB]/10 dark:bg-[#5B8CFF]/15 text-[#2563EB] dark:text-[#5B8CFF]">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#181818] dark:text-[#F2F2F0]">
              CipherLens
            </div>
            <div className="text-[10px] font-mono text-[#999993] dark:text-[#6A6A6A]">
              OPTICAL PLATFORM
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="text-xs text-[#999993] p-2">Loading nav...</div>}>
        <SidebarNav />
      </Suspense>
    </aside>
  );
}
