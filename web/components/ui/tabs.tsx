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
        "flex flex-wrap items-center gap-6 border-b border-[#E8E8E3] dark:border-[#292929] px-0.5",
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
              "pb-2 text-xs transition-colors font-medium flex items-center gap-1.5 cursor-pointer select-none relative -mb-px",
              isActive
                ? "text-[#181818] dark:text-[#F2F2F0] border-b-2 border-[#2563EB] dark:border-[#5B8CFF]"
                : "text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] border-b-2 border-transparent"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  isActive
                    ? "text-[#2563EB] dark:text-[#5B8CFF]"
                    : "text-[#999993] dark:text-[#6A6A6A]"
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={cn(
                  "text-[9px] px-1 py-0.2 rounded font-mono",
                  isActive
                    ? "text-[#2563EB] dark:text-[#5B8CFF]"
                    : "text-[#999993] dark:text-[#6A6A6A]"
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
