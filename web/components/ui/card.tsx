import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#E6E5E3] overflow-hidden transition-all duration-150 hover:border-[#D3D1CB] dark:hover:border-[#3D3D3D] shadow-xs",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-4 py-2.5 border-b border-[#EDEDEB] dark:border-[#2E2E2E] bg-[#FAFAF9] dark:bg-[#242424] flex items-center justify-between",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-xs font-semibold text-[#37352F] dark:text-[#E6E5E3] flex items-center gap-2",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
