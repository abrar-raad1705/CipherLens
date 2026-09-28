"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<SliderPrimitive.Root.Props, "value" | "defaultValue" | "onValueChange" | "onChange"> {
  label?: string;
  valueDisplay?: string | number;
  hint?: string;
  showInput?: boolean;
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
  showInput = true,
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

  const currentNumValue = Array.isArray(value)
    ? value[0]
    : value !== undefined
      ? value
      : Array.isArray(defaultValue)
        ? defaultValue[0]
        : (defaultValue ?? min);

  const [inputValue, setInputValue] = React.useState<string>(
    valueDisplay !== undefined ? String(valueDisplay) : String(currentNumValue)
  );
  const [isFocused, setIsFocused] = React.useState<boolean>(false);

  // Sync displayed input text when slider value updates externally while user is not actively typing
  React.useEffect(() => {
    if (!isFocused) {
      setInputValue(valueDisplay !== undefined ? String(valueDisplay) : String(currentNumValue));
    }
  }, [currentNumValue, valueDisplay, isFocused]);

  const handleValueChange = (val: number | number[]) => {
    onValueChange?.(val);
    const singleVal = Array.isArray(val) ? val[0] : val;
    onChange?.({ target: { value: singleVal } });
  };

  const isIntegerStep = typeof step === "number" && (step >= 1 || Number.isInteger(step));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    // Support decimal floats, integers, and hex values (e.g., 0x10)
    let parsed: number;
    if (raw.toLowerCase().startsWith("0x")) {
      parsed = parseInt(raw, 16);
    } else {
      parsed = Number(raw);
    }

    if (!isNaN(parsed) && raw.trim() !== "") {
      const finalVal = isIntegerStep ? Math.round(parsed) : parsed;
      handleValueChange(finalVal);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    let parsed: number;
    if (inputValue.toLowerCase().startsWith("0x")) {
      parsed = parseInt(inputValue, 16);
    } else {
      parsed = Number(inputValue);
    }

    if (isNaN(parsed) || inputValue.trim() === "") {
      setInputValue(valueDisplay !== undefined ? String(valueDisplay) : String(currentNumValue));
    } else {
      let clamped = isIntegerStep ? Math.round(parsed) : parsed;
      if (typeof min === "number" && clamped < min) clamped = min;
      if (typeof max === "number" && clamped > max) clamped = max;

      handleValueChange(clamped);
      setInputValue(valueDisplay !== undefined && typeof valueDisplay === "string" && valueDisplay.includes("0x")
        ? valueDisplay
        : String(clamped));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const hasHeader = showInput && (label || valueDisplay !== undefined || value !== undefined);

  return (
    <div className={cn(hasHeader ? "space-y-2" : "", "w-full select-none")}>
      {hasHeader && (
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {label && (
              <span className="text-[#181818] dark:text-[#F2F2F0] font-medium truncate">
                {label}
              </span>
            )}
            {hint && (
              <span className="text-[11px] text-[#6F6F6A] dark:text-[#A0A09B] font-mono shrink-0">
                ({hint})
              </span>
            )}
          </div>

          <input
            type="text"
            value={inputValue}
            disabled={disabled}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            aria-label={label || "Slider value input"}
            className="w-16 sm:w-20 font-mono text-[11px] font-semibold text-center px-1.5 py-0.5 rounded-md bg-[#F4F4F1] dark:bg-[#202020] border border-[#D7D7D1] dark:border-[#383838] text-[#181818] dark:text-[#F2F2F0] hover:border-[#AFAFAA] dark:hover:border-[#505050] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#5B8CFF] focus:ring-1 focus:ring-[#2563EB] dark:focus:ring-[#5B8CFF] transition-colors cursor-text"
          />
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
