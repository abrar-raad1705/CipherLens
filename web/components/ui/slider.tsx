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
  const [isEditing, setIsEditing] = React.useState(false);
  const [editStr, setEditStr] = React.useState("");

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
      {(label || valueDisplay !== undefined || value !== undefined) && (
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
          {typeof value === "number" && !Array.isArray(value) ? (
            /* Editable Typeable & Scrollable Input Box with Compact Styling */
            <input
              type="text"
              value={isEditing ? editStr : (valueDisplay !== undefined ? String(valueDisplay) : String(value))}
              onFocus={() => {
                setIsEditing(true);
                setEditStr(String(value));
              }}
              onBlur={() => {
                setIsEditing(false);
                let parsed = Number(editStr.trim());
                if (editStr.trim().startsWith("0x") || editStr.trim().startsWith("0X")) {
                  parsed = parseInt(editStr.trim(), 16);
                }
                if (!isNaN(parsed)) {
                  const clamped = Math.min(max, Math.max(min, parsed));
                  onChange?.({ target: { value: clamped } });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const nextVal = Math.min(max, value + step);
                  onChange?.({ target: { value: nextVal } });
                  setEditStr(String(nextVal));
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const prevVal = Math.max(min, value - step);
                  onChange?.({ target: { value: prevVal } });
                  setEditStr(String(prevVal));
                }
              }}
              onWheel={(e) => {
                // Scroll up increases value, scroll down decreases value
                e.preventDefault();
                const delta = e.deltaY < 0 ? step : -step;
                const nextVal = Math.min(max, Math.max(min, value + delta));
                onChange?.({ target: { value: nextVal } });
                if (isEditing) {
                  setEditStr(String(nextVal));
                }
              }}
              onChange={(e) => {
                setEditStr(e.target.value);
                let parsed = Number(e.target.value.trim());
                if (e.target.value.trim().startsWith("0x") || e.target.value.trim().startsWith("0X")) {
                  parsed = parseInt(e.target.value.trim(), 16);
                }
                if (!isNaN(parsed) && e.target.value.trim() !== "") {
                  const clamped = Math.min(max, Math.max(min, parsed));
                  onChange?.({ target: { value: clamped } });
                }
              }}
              className={cn(
                "font-mono text-[11px] font-medium py-0.5 px-1 text-center rounded bg-[#F4F4F1] dark:bg-[#1F1F1F] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0] focus:outline-none focus:ring-1 focus:ring-[#2563EB] dark:focus:ring-[#5B8CFF] focus:border-[#2563EB] dark:focus:border-[#5B8CFF] transition-all cursor-text select-text",
                // Keep length compact: max 52px for numbers, slightly wider only if XOR hex formatted
                valueDisplay && String(valueDisplay).includes("0x") ? "w-22" : "w-13"
              )}
              title="Type directly, use ↑/↓ keys, or scroll mouse wheel up/down to adjust"
            />
          ) : (
            valueDisplay !== undefined && (
              <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-[#F4F4F1] dark:bg-[#1F1F1F] border border-[#E8E8E3] dark:border-[#292929] text-[#181818] dark:text-[#F2F2F0]">
                {valueDisplay}
              </span>
            )
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
