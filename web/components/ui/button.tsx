import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 dark:focus-visible:ring-[#5B8CFF]/50 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none rounded-lg select-none cursor-pointer";

    const variants = {
      primary:
        "bg-[#2563EB] text-white hover:bg-[#1D4ED8] dark:bg-[#5B8CFF] dark:text-[#101010] dark:hover:bg-[#4579FF] shadow-xs hover:shadow-md hover:shadow-[#2563EB]/20 dark:hover:shadow-[#5B8CFF]/20",
      secondary:
        "bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] hover:bg-[#F4F4F1] dark:hover:bg-[#222222] hover:border-[#D0D0C8] dark:hover:border-[#3A3A3A] shadow-2xs hover:shadow-xs",
      outline:
        "bg-transparent text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-[#D0D0C8] dark:hover:border-[#3E3E3E]",
      ghost:
        "bg-transparent text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
      danger:
        "bg-transparent text-[#DC2626] border border-[#FCA5A5]/40 hover:bg-[#FEE2E2]/30 dark:text-[#F87171] dark:border-[#7F1D1D]/60 dark:hover:bg-[#7F1D1D]/30",
    };

    const sizes = {
      sm: "h-7.5 px-3 text-xs gap-1.5",
      md: "h-9 px-3.5 text-sm gap-2",
      lg: "h-10 px-4 text-sm gap-2 font-medium",
      icon: "h-8 w-8 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
