"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { FloatingDatePicker } from "@/components/floating";
import {
  formatClinicDateLabel,
  SingleDateCalendar,
} from "@/components/ui/single-date-calendar";
import { adminControlInputClass, adminControlRadius } from "@/lib/admin-controls";
import { isClinicWorkingDate } from "@/lib/clinic-working-days";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Inclusive minimum date `yyyy-MM-dd`. */
  min?: string;
  /** Inclusive maximum date `yyyy-MM-dd`. */
  max?: string;
  /**
   * Clinic operating weekdays (0=Sun … 6=Sat).
   * When set, non-working days are disabled in the calendar.
   */
  allowedWeekdays?: number[];
  className?: string;
  "aria-label"?: string;
}

/**
 * Shared single-date picker — same calendar chrome as the appointments
 * custom range picker, opened via FloatingDatePicker.
 */
export function DatePicker({
  id,
  label,
  error,
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  min,
  max,
  allowedWeekdays,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const display = value ? formatClinicDateLabel(value) : placeholder;

  function handleSelect(next: string) {
    if (min && next < min) return;
    if (max && next > max) return;
    if (
      allowedWeekdays &&
      allowedWeekdays.length > 0 &&
      !isClinicWorkingDate(next, allowedWeekdays)
    ) {
      return;
    }
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={fieldId} className={cn(type.label, "block")}>
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative min-w-0">
        <button
          type="button"
          id={fieldId}
          disabled={disabled}
          aria-label={ariaLabel ?? label ?? "Select date"}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => {
            if (!disabled) setOpen((prev) => !prev);
          }}
          className={cn(
            adminControlInputClass,
            "flex w-full items-center justify-between gap-2 px-3 text-left",
            open && "border-[var(--brand-purple)]/40 ring-2 ring-[var(--brand-purple)]/15",
            !value && "text-[var(--brand-text-muted)]",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="truncate">{display}</span>
          <CalendarDays
            className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text-muted)]"
            strokeWidth={1.75}
            aria-hidden
          />
        </button>

        <FloatingDatePicker
          open={open}
          onOpenChange={(next) => {
            if (!disabled) setOpen(next);
          }}
          referenceRef={containerRef}
        >
          {open ? (
            <SingleDateCalendar
              key={value || "empty"}
              value={value}
              onSelect={handleSelect}
              min={min}
              max={max}
              allowedWeekdays={allowedWeekdays}
              className={adminControlRadius}
            />
          ) : null}
        </FloatingDatePicker>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
