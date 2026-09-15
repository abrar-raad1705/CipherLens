import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
        primary:
          "bg-[#2563EB] text-white hover:bg-[#1D4ED8] dark:bg-[#5B8CFF] dark:text-[#101010] dark:hover:bg-[#4579FF] shadow-xs hover:shadow-md hover:shadow-[#2563EB]/20 dark:hover:shadow-[#5B8CFF]/20",
        secondary:
          "bg-white dark:bg-[#171717] text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929] hover:bg-[#F4F4F1] dark:hover:bg-[#222222] hover:border-[#D0D0C8] dark:hover:border-[#3A3A3A] shadow-2xs hover:shadow-xs",
        outline:
          "border border-[#E8E8E3] dark:border-[#292929] bg-transparent text-[#181818] dark:text-[#F2F2F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-[#D0D0C8] dark:hover:border-[#3E3E3E]",
        ghost:
          "hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#6F6F6A] dark:text-[#A0A09B] hover:text-[#181818] dark:hover:text-[#F2F2F0]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        danger:
          "bg-transparent text-[#DC2626] border border-[#FCA5A5]/40 hover:bg-[#FEE2E2]/30 dark:text-[#F87171] dark:border-[#7F1D1D]/60 dark:hover:bg-[#7F1D1D]/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5 text-xs",
        xs: "h-6 gap-1 px-2 text-xs",
        sm: "h-7.5 px-3 text-xs gap-1.5",
        md: "h-9 px-3.5 text-sm gap-2",
        lg: "h-10 px-4 text-sm gap-2 font-medium",
        icon: "size-8 p-0",
        "icon-xs": "size-6 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {}

function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
