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
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#181818] dark:text-[#F2F2F0] font-normal">{label}</span>
            {hint && (
              <span className="text-[11px] text-[#999993] dark:text-[#6A6A6A]">
                {hint}
              </span>
            )}
          </div>
          {valueDisplay !== undefined && (
            <span className="font-mono text-[11px] text-[#181818] dark:text-[#F2F2F0]">
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
