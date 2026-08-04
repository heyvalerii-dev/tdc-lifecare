"use client";

import { useId, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  FloatingDropdown,
  FloatingDropdownChevron,
  FloatingDropdownItem,
  FloatingDropdownPanel,
  FloatingDropdownTrigger,
  useFloatingDropdownOpen,
} from "@/components/floating";
import {
  filterOptionClass,
  filterOptionsPanelClass,
  filterSearchInputClass,
} from "@/components/admin/appointments/filters/filter-styles";
import { adminControlInputClass } from "@/lib/admin-controls";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  label?: string;
  error?: string;
  options: SelectOption[];
  value: string;
  /** Native-style change handler for existing forms. */
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  /** Preferred modern handler. */
  onValueChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /**
   * Show an inline search field when option count exceeds this.
   * Default `8`. Pass `0` or `Infinity` to disable.
   */
  searchThreshold?: number;
  "aria-label"?: string;
}

const DEFAULT_SEARCH_THRESHOLD = 8;

function SelectTrigger({
  id,
  label,
  display,
  hasValue,
  disabled,
  error,
  ariaLabel,
}: {
  id?: string;
  label?: string;
  display: string;
  hasValue: boolean;
  disabled?: boolean;
  error?: string;
  ariaLabel?: string;
}) {
  const open = useFloatingDropdownOpen();

  return (
    <FloatingDropdownTrigger
      id={id}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={cn(
        adminControlInputClass,
        "flex w-full items-center justify-between gap-2 px-3 text-left",
        open && "border-[var(--brand-purple)]/40 ring-2 ring-[var(--brand-purple)]/15",
        !hasValue && "text-[var(--brand-text-muted)]",
        error && "border-red-500",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{display}</span>
      <FloatingDropdownChevron />
    </FloatingDropdownTrigger>
  );
}

/**
 * Shared select built on FloatingDropdown — same animation, keyboard nav,
 * and option chrome as admin filter dropdowns / TimeSlotSelect.
 */
export function Select({
  id,
  label,
  error,
  options,
  value,
  onChange,
  onValueChange,
  name,
  placeholder = "Select…",
  disabled,
  required,
  className,
  searchThreshold = DEFAULT_SEARCH_THRESHOLD,
  "aria-label": ariaLabel,
}: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [query, setQuery] = useState("");

  const selected = options.find((opt) => opt.value === value);
  const display = selected?.label ?? placeholder;
  const showSearch =
    Number.isFinite(searchThreshold) &&
    searchThreshold > 0 &&
    options.length > searchThreshold;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  function emit(next: string) {
    onValueChange?.(next);
    onChange?.({ target: { value: next, name } });
    setQuery("");
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={fieldId} className={cn(type.label, "block")}>
          {label}
          {required ? " *" : ""}
        </label>
      )}

      <FloatingDropdown value={value} onChange={emit}>
        <SelectTrigger
          id={fieldId}
          label={label}
          display={display}
          hasValue={Boolean(selected)}
          disabled={disabled}
          error={error}
          ariaLabel={ariaLabel}
        />
        <FloatingDropdownPanel
          className={cn(filterOptionsPanelClass, showSearch && "max-h-80")}
        >
          {showSearch && (
            <div
              className="sticky top-0 z-10 border-b border-[var(--brand-purple)]/[0.06] bg-white p-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--brand-text-muted)]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label="Search options"
                  className={cn(filterSearchInputClass, "pl-8")}
                />
              </div>
            </div>
          )}

          {filteredOptions.map((option, index) => (
            <FloatingDropdownItem
              key={option.value || `empty-${index}`}
              value={option.value}
              index={index}
              disabled={option.disabled || disabled}
            >
              {({ active, selected: isSelected }) => (
                <div className={filterOptionClass(active, isSelected)}>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[var(--brand-purple)]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  )}
                </div>
              )}
            </FloatingDropdownItem>
          ))}

          {showSearch && filteredOptions.length === 0 && (
            <p className="px-2.5 py-3 text-center text-xs text-[var(--brand-text-muted)]">
              No matches.
            </p>
          )}
        </FloatingDropdownPanel>
      </FloatingDropdown>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
