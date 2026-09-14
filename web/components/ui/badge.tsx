import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "signal" | "cyan" | "emerald" | "rose" | "outline";
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase select-none";

  const variants = {
    default: "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#6F6F6A] dark:text-[#A0A09B] border border-[#E8E8E3] dark:border-[#292929]",
    signal: "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#2563EB] dark:text-[#5B8CFF] border border-[#2563EB]/20 dark:border-[#5B8CFF]/30",
    cyan: "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#2563EB] dark:text-[#5B8CFF] border border-[#2563EB]/20 dark:border-[#5B8CFF]/30",
    emerald: "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#059669] dark:text-[#34D399] border border-[#059669]/20 dark:border-[#34D399]/30",
    rose: "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#DC2626] dark:text-[#F87171] border border-[#DC2626]/20 dark:border-[#F87171]/30",
    outline: "bg-transparent text-[#6F6F6A] dark:text-[#A0A09B] border border-[#E8E8E3] dark:border-[#292929]",
  };

  const dotColors = {
    default: "bg-[#999993] dark:bg-[#6A6A6A]",
    signal: "bg-[#2563EB] dark:bg-[#5B8CFF]",
    cyan: "bg-[#2563EB] dark:bg-[#5B8CFF]",
    emerald: "bg-[#059669] dark:bg-[#34D399]",
    rose: "bg-[#DC2626] dark:bg-[#F87171]",
    outline: "bg-[#999993] dark:bg-[#6A6A6A]",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
