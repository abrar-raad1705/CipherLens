import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] dark:focus-visible:ring-[#5B8CFF] disabled:opacity-40 disabled:pointer-events-none rounded-md select-none cursor-pointer";

    const variants = {
      primary:
        "bg-[#2563EB] text-white hover:bg-[#1D4ED8] dark:bg-[#5B8CFF] dark:text-[#101010] dark:hover:bg-[#4579FF]",
      secondary:
        "bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] hover:bg-[#F4F4F1] dark:hover:bg-[#1F1F1F]",
      outline:
        "bg-transparent text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] hover:bg-[#F4F4F1] dark:hover:bg-[#1F1F1F]",
      ghost:
        "bg-transparent text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
      danger:
        "bg-transparent text-[#DC2626] border border-[#FCA5A5]/30 hover:bg-[#FEE2E2]/20 dark:text-[#F87171] dark:border-[#7F1D1D]/50 dark:hover:bg-[#7F1D1D]/20",
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
