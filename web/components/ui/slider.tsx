import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  valueDisplay?: string | number;
  hint?: string;
}

export function Slider({ className, label, valueDisplay, hint, ...props }: SliderProps) {
  return (
    <div className="space-y-1.5 w-full">
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-[#181818] dark:text-[#F2F2F0] font-medium">{label}</span>
            {hint && (
              <span className="text-xs text-[#999993] dark:text-[#6A6A6A]">
                ({hint})
              </span>
            )}
          </div>
          {valueDisplay !== undefined && (
            <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-[#F4F4F1] dark:bg-[#1F1F1F] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0]">
              {valueDisplay}
            </span>
          )}
        </div>
      )}
      <div className="relative flex items-center py-1">
        <input
          type="range"
          className={cn("w-full cursor-pointer", className)}
          {...props}
        />
      </div>
    </div>
  );
}
