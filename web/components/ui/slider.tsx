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
            <span className="text-[#37352F] dark:text-[#E6E5E3] font-medium">{label}</span>
            {hint && (
              <span className="text-[11px] text-[#9B9A97] dark:text-[#787774]">
                ({hint})
              </span>
            )}
          </div>
          {valueDisplay !== undefined && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#F1F1EF] dark:bg-[#2A2A2A] border border-[#EDEDEB] dark:border-[#333333] text-[#37352F] dark:text-[#E6E5E3] font-medium">
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
