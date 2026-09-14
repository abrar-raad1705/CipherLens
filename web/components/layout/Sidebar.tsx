"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface NavGroup {
  section: string;
  items: {
    label: string;
    href: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: "LABORATORY",
    items: [
      { label: "Overview", href: "/" },
      { label: "Workspace", href: "/workspace" },
    ],
  },
  {
    section: "PROCESSING",
    items: [
      { label: "Convolution", href: "/processing/convolution" },
    ],
  },
  {
    section: "ENCRYPTION",
    items: [
      { label: "DRPE Optics", href: "/encryption/drpe" },
    ],
  },
  {
    section: "ANALYSIS",
    items: [
      { label: "Quantitative Metrics", href: "/analysis" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[215px] shrink-0 border-r border-[#E8E8E3] dark:border-[#292929] bg-[#FAFAF8] dark:bg-[#101010] p-5 select-none sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto">
      <nav className="space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="space-y-1.5">
            <div className="text-[10px] font-mono tracking-wider text-[#999993] dark:text-[#6A6A6A] uppercase px-2">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between text-xs py-1.5 px-2 rounded-sm transition-colors",
                      isActive
                        ? "text-[#181818] dark:text-[#F2F2F0] font-medium"
                        : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]"
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
