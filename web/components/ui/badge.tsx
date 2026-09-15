import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase transition-all select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#6F6F6A] dark:text-[#A0A09B] border border-[#E8E8E3] dark:border-[#292929]",
        secondary:
          "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#181818] dark:text-[#F2F2F0] border border-[#E8E8E3] dark:border-[#292929]",
        signal:
          "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#2563EB] dark:text-[#5B8CFF] border border-[#2563EB]/20 dark:border-[#5B8CFF]/30",
        cyan:
          "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#2563EB] dark:text-[#5B8CFF] border border-[#2563EB]/20 dark:border-[#5B8CFF]/30",
        emerald:
          "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#059669] dark:text-[#34D399] border border-[#059669]/20 dark:border-[#34D399]/30",
        rose:
          "bg-[#F4F4F1] dark:bg-[#1F1F1F] text-[#DC2626] dark:text-[#F87171] border border-[#DC2626]/20 dark:border-[#F87171]/30",
        outline:
          "border border-[#E8E8E3] dark:border-[#292929] text-[#6F6F6A] dark:text-[#A0A09B] bg-transparent",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const dotColors = {
  default: "bg-[#999993] dark:bg-[#6A6A6A]",
  secondary: "bg-[#999993] dark:bg-[#6A6A6A]",
  signal: "bg-[#2563EB] dark:bg-[#5B8CFF]",
  cyan: "bg-[#2563EB] dark:bg-[#5B8CFF]",
  emerald: "bg-[#059669] dark:bg-[#34D399]",
  rose: "bg-[#DC2626] dark:bg-[#F87171]",
  outline: "bg-[#999993] dark:bg-[#6A6A6A]",
  destructive: "bg-destructive",
};

export interface BadgeProps
  extends useRender.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({
  className,
  variant = "default",
  dot = false,
  children,
  render,
  ...props
}: BadgeProps) {
  const chosenVariant = variant || "default";
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {dot && (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  dotColors[chosenVariant as keyof typeof dotColors] || dotColors.default
                )}
              />
            )}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
