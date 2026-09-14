import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "signal" | "cyan" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2383E2] disabled:opacity-40 disabled:pointer-events-none rounded-md text-xs select-none cursor-pointer active:scale-[0.98]";

    const variants = {
      primary:
        "bg-[#2F2F2F] text-white hover:bg-[#1A1A1A] dark:bg-[#EDEDEB] dark:text-[#191919] dark:hover:bg-white font-medium shadow-xs",
      secondary:
        "bg-white dark:bg-[#252525] text-[#37352F] dark:text-[#E6E5E3] border border-[#EDEDEB] dark:border-[#2E2E2E] hover:bg-[#F7F6F5] dark:hover:bg-[#2E2E2E] shadow-xs",
      outline:
        "border border-[#EDEDEB] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#E6E5E3] hover:bg-[#F7F6F5] dark:hover:bg-[#252525]",
      ghost:
        "text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-[#E6E5E3] hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]",
      signal:
        "bg-[#FADEC9] text-[#49290E] hover:bg-[#F5D5BA] dark:bg-[#593A19] dark:text-[#FFAB5E] dark:hover:bg-[#68441E]",
      cyan:
        "bg-[#D3E5EF] text-[#183347] hover:bg-[#C4DCED] dark:bg-[#1E394B] dark:text-[#529CCA] dark:hover:bg-[#24455C]",
      danger:
        "bg-[#FFE2DD] text-[#5D1715] hover:bg-[#FCD3CD] dark:bg-[#522525] dark:text-[#FF7369] dark:hover:bg-[#632C2C]",
    };

    const sizes = {
      sm: "h-7 px-2.5 text-[11px] gap-1.5",
      md: "h-8 px-3 text-xs gap-2",
      lg: "h-9 px-4 text-xs gap-2 font-medium",
      icon: "h-7 w-7 p-0",
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
