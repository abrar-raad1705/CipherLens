"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F7F6F5] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E]",
        className
      )}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-all duration-150 font-medium flex items-center gap-2 cursor-pointer select-none",
              isActive
                ? "bg-white dark:bg-[#2C2C2C] text-[#37352F] dark:text-[#FFFFFF] shadow-xs font-semibold"
                : "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-[#E6E5E3] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  isActive ? "text-[#37352F] dark:text-[#FFFFFF]" : "text-[#9B9A97]"
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-mono font-medium",
                  isActive
                    ? "bg-[#E8DEEE] text-[#412D4C] dark:bg-[#3D2C4D] dark:text-[#9A6DD7]"
                    : "bg-[#EDEDEB] text-[#787774] dark:bg-[#2E2E2E] dark:text-[#9B9B9B]"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
