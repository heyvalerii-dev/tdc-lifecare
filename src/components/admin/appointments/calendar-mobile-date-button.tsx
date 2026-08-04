"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { FloatingDatePicker } from "@/components/floating";
import { SingleDateCalendar } from "@/components/ui/single-date-calendar";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { adminControlRadius } from "@/lib/admin-controls";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";

interface CalendarMobileDateButtonProps {
  /** Clinic date `yyyy-MM-dd`. */
  value: string;
  onChange: (dateStr: string) => void;
  className?: string;
}

export function CalendarMobileDateButton({
  value,
  onChange,
  className,
}: CalendarMobileDateButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const label = value
    ? formatInTimeZone(`${value}T12:00:00`, CLINIC_TIMEZONE, "EEEE, MMM d")
    : "Select date";

  function handleSelect(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-label="Select date"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left",
          "transition-colors duration-150",
          "hover:bg-[var(--brand-purple-light)]/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
          open && "bg-[var(--brand-purple-light)]/40"
        )}
      >
        <CalendarDays
          className="h-4 w-4 shrink-0 text-[var(--brand-purple)]"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="truncate font-heading text-base font-semibold tracking-tight text-[var(--brand-text)]">
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--brand-text-muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      <FloatingDatePicker
        open={open}
        onOpenChange={setOpen}
        referenceRef={containerRef}
      >
        {open ? (
          <SingleDateCalendar
            key={value || "empty"}
            value={value}
            onSelect={handleSelect}
            className={adminControlRadius}
          />
        ) : null}
      </FloatingDatePicker>
    </div>
  );
}
