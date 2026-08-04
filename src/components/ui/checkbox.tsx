"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  id,
  ariaLabel,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-all duration-200 ease-out",
            "border-[var(--brand-purple)]/25 bg-white",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-purple)]/20 peer-focus-visible:ring-offset-1",
            checked &&
              "scale-100 border-[var(--brand-purple)] bg-[var(--brand-purple)] shadow-[0_1px_2px_rgba(93,80,122,0.12)]",
            !checked && "hover:border-[var(--brand-purple)]/45"
          )}
        >
          <Check
            className={cn(
              "h-3 w-3 text-white transition-all duration-200 ease-out",
              checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
            strokeWidth={3}
          />
        </span>
      </span>
      {label && (
        <span className="text-sm text-[var(--brand-text)] select-none">
          {label}
        </span>
      )}
    </label>
  );
}
