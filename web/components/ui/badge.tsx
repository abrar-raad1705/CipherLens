import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "signal" | "cyan" | "emerald" | "rose" | "purple" | "outline";
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium leading-none transition-colors select-none";

  const variants = {
    default: "bg-[#E3E2E0] text-[#32302C] dark:bg-[#37352F] dark:text-[#E6E5E3]",
    signal: "bg-[#FADEC9] text-[#854C1D] dark:bg-[#593A19] dark:text-[#FFAB5E]",
    cyan: "bg-[#D3E5EF] text-[#183347] dark:bg-[#1E394B] dark:text-[#529CCA]",
    emerald: "bg-[#DBEDDB] text-[#1C3829] dark:bg-[#203D2E] dark:text-[#4DAB9A]",
    rose: "bg-[#FFE2DD] text-[#5D1715] dark:bg-[#522525] dark:text-[#FF7369]",
    purple: "bg-[#E8DEEE] text-[#412D4C] dark:bg-[#3D2C4D] dark:text-[#9A6DD7]",
    outline: "border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#787774] dark:text-[#9B9B9B] bg-transparent",
  };

  const dotColors = {
    default: "bg-[#787774] dark:bg-[#9B9B9B]",
    signal: "bg-[#D9730D] dark:bg-[#FFAB5E]",
    cyan: "bg-[#2383E2] dark:bg-[#529CCA]",
    emerald: "bg-[#0F7B6C] dark:bg-[#4DAB9A]",
    rose: "bg-[#EB5757] dark:bg-[#FF7369]",
    purple: "bg-[#9065B0] dark:bg-[#9A6DD7]",
    outline: "bg-[#9B9A97] dark:bg-[#6A6A6A]",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
