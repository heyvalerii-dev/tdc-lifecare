"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  id?: string;
  value: string;
  options: SegmentedControlOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function SegmentedControl({
  id,
  value,
  options,
  onValueChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndices = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.disabled && !disabled)
    .map(({ index }) => index);

  const selectAt = useCallback(
    (index: number) => {
      if (enabledIndices.length === 0) return;

      const currentValueIndex = options.findIndex((option) => option.value === value);
      const currentEnabledIndex = Math.max(
        0,
        enabledIndices.indexOf(currentValueIndex)
      );
      const normalized =
        ((index % enabledIndices.length) + enabledIndices.length) %
        enabledIndices.length;
      const targetIndex =
        enabledIndices[normalized] ?? enabledIndices[currentEnabledIndex];

      onValueChange(options[targetIndex]?.value ?? value);
      buttonRefs.current[targetIndex]?.focus();
    },
    [enabledIndices, onValueChange, options, value]
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled || enabledIndices.length === 0) return;

    const currentValueIndex = options.findIndex((option) => option.value === value);
    const currentEnabledIndex = enabledIndices.indexOf(currentValueIndex);

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        selectAt(currentEnabledIndex - 1);
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        selectAt(currentEnabledIndex + 1);
        break;
      case "Home":
        event.preventDefault();
        selectAt(0);
        break;
      case "End":
        event.preventDefault();
        selectAt(enabledIndices.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex h-9 rounded-xl border border-[var(--brand-purple)]/20 bg-white p-0.5",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {options.map((option, index) => {
        const selected = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isDisabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "min-w-[4.5rem] rounded-[10px] px-4 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-1",
              selected
                ? "bg-[var(--brand-purple)] text-white shadow-sm"
                : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]",
              isDisabled && "cursor-not-allowed"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
