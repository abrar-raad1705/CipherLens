"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<SliderPrimitive.Root.Props, "value" | "defaultValue" | "onValueChange" | "onChange"> {
  label?: string;
  valueDisplay?: string | number;
  hint?: string;
  value?: number | number[];
  defaultValue?: number | number[];
  onValueChange?: (value: number | number[]) => void;
  onChange?: (e: { target: { value: number } }) => void;
}

function Slider({
  className,
  label,
  valueDisplay,
  hint,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onChange,
  disabled,
  ...props
}: SliderProps) {
  const isControlled = value !== undefined;
  const numValue = Array.isArray(value) ? value : value !== undefined ? [value] : undefined;
  const numDefault = Array.isArray(defaultValue)
    ? defaultValue
    : defaultValue !== undefined
      ? [defaultValue]
      : undefined;

  const handleValueChange = (val: number | number[]) => {
    onValueChange?.(val);
    const singleVal = Array.isArray(val) ? val[0] : val;
    onChange?.({ target: { value: singleVal } });
  };

  return (
    <div className="space-y-2 w-full select-none">
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {label && (
              <span className="text-[#181818] dark:text-[#F2F2F0] font-medium">
                {label}
              </span>
            )}
            {hint && (
              <span className="text-[11px] text-[#999993] dark:text-[#6A6A6A]">
                ({hint})
              </span>
            )}
          </div>
          {valueDisplay !== undefined && (
            <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-[#F4F4F1] dark:bg-[#1F1F1F] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0]">
              {valueDisplay}
            </span>
          )}
        </div>
      )}

      <SliderPrimitive.Root
        className={cn("relative flex w-full touch-none items-center py-1", className)}
        data-slot="slider"
        {...(isControlled ? { value: numValue } : { defaultValue: numDefault ?? [min] })}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={handleValueChange}
        {...props}
      >
        <SliderPrimitive.Control className="relative flex w-full items-center select-none data-disabled:opacity-40">
          <SliderPrimitive.Track
            data-slot="slider-track"
            className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#E8E8E3] dark:bg-[#2A2A2A]"
          >
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className="h-full bg-[#2563EB] dark:bg-[#5B8CFF]"
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className="block size-4 rounded-full border-2 border-[#2563EB] dark:border-[#5B8CFF] bg-white dark:bg-[#181818] shadow-sm transition-transform hover:scale-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 dark:focus-visible:ring-[#5B8CFF]/50 cursor-pointer disabled:pointer-events-none"
          />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
}

export { Slider, SliderPrimitive };
