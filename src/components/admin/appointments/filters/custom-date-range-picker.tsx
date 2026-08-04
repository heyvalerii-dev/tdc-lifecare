"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { getClinicToday } from "@/lib/datetime";
import { adminControlRadius } from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

export function formatCustomRangeLabel(start: string, end: string): string {
  if (!start || !end) return "Custom Range…";
  const startLabel = formatInTimeZone(
    `${start}T12:00:00`,
    CLINIC_TIMEZONE,
    "MMM d"
  );
  const endLabel = formatInTimeZone(
    `${end}T12:00:00`,
    CLINIC_TIMEZONE,
    "MMM d"
  );
  return `${startLabel} – ${endLabel}`;
}

function parseClinicDate(dateStr: string): Date {
  return toZonedTime(new Date(`${dateStr}T12:00:00`), CLINIC_TIMEZONE);
}

function toClinicDateStr(date: Date): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

interface CustomDateRangePickerProps {
  initialStart: string;
  initialEnd: string;
  onApply: (start: string, end: string) => void;
  onCancel: () => void;
}

export function CustomDateRangePicker({
  initialStart,
  initialEnd,
  onApply,
  onCancel,
}: CustomDateRangePickerProps) {
  const clinicToday = getClinicToday();
  const todayDate = parseClinicDate(clinicToday);

  const [viewMonth, setViewMonth] = useState(() =>
    initialStart ? parseClinicDate(initialStart) : todayDate
  );
  const [rangeStart, setRangeStart] = useState(initialStart);
  const [rangeEnd, setRangeEnd] = useState(initialEnd);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const parsedStart = rangeStart ? parseClinicDate(rangeStart) : null;
  const parsedEnd = rangeEnd ? parseClinicDate(rangeEnd) : null;

  function handleDaySelect(day: Date) {
    const dateStr = toClinicDateStr(day);

    if (!selectingEnd || !parsedStart) {
      setRangeStart(dateStr);
      setRangeEnd("");
      setSelectingEnd(true);
      return;
    }

    if (isBefore(day, parsedStart)) {
      setRangeStart(dateStr);
      setRangeEnd(toClinicDateStr(parsedStart));
    } else {
      setRangeEnd(dateStr);
    }
    setSelectingEnd(false);
  }

  function isInRange(day: Date): boolean {
    if (!parsedStart || !parsedEnd) return false;
    const start = isBefore(parsedStart, parsedEnd) ? parsedStart : parsedEnd;
    const end = isAfter(parsedEnd, parsedStart) ? parsedEnd : parsedStart;
    return (
      (isSameDay(day, start) || isAfter(day, start)) &&
      (isSameDay(day, end) || isBefore(day, end))
    );
  }

  function isRangeStart(day: Date): boolean {
    return parsedStart ? isSameDay(day, parsedStart) : false;
  }

  function isRangeEnd(day: Date): boolean {
    return parsedEnd ? isSameDay(day, parsedEnd) : false;
  }

  const canApply = Boolean(rangeStart && rangeEnd);

  return (
    <div
      className={cn(
        "w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[var(--brand-purple)]/10 bg-white p-4 shadow-[0_12px_40px_rgba(93,80,122,0.14)]",
        adminControlRadius
      )}
      role="dialog"
      aria-label="Select custom date range"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <p className="text-sm font-medium text-[var(--brand-text)]">
          {formatInTimeZone(viewMonth, CLINIC_TIMEZONE, "MMMM yyyy")}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <p className="mb-3 text-center text-xs text-[var(--brand-text-muted)]">
        {selectingEnd && rangeStart
          ? "Select end date"
          : "Select start date"}
      </p>

      <div
        className="mb-4 grid grid-cols-7 gap-0.5"
        role="grid"
        aria-label="Calendar"
      >
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]"
            role="columnheader"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const inRange = isInRange(day);
          const isStart = isRangeStart(day);
          const isEnd = isRangeEnd(day);
          const isToday = isSameDay(day, todayDate);
          const label = formatInTimeZone(day, CLINIC_TIMEZONE, "EEEE, MMMM d");

          return (
            <button
              key={day.toISOString()}
              type="button"
              role="gridcell"
              aria-label={label}
              aria-selected={isStart || isEnd || inRange}
              onClick={() => handleDaySelect(day)}
              className={cn(
                "relative flex h-8 w-full items-center justify-center rounded-lg text-xs transition-colors duration-150",
                !inMonth && "text-[var(--brand-text-muted)]/40",
                inMonth && !inRange && !isStart && !isEnd && "text-[var(--brand-text)]",
                inRange && !isStart && !isEnd && "bg-[var(--brand-purple-light)]/35",
                (isStart || isEnd) &&
                  "bg-[var(--brand-purple)] font-medium text-white",
                isToday &&
                  !isStart &&
                  !isEnd &&
                  "font-semibold text-[var(--brand-purple)]"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {rangeStart && (
        <p className="mb-4 text-center text-xs text-[var(--brand-text-muted)]">
          {rangeEnd
            ? formatCustomRangeLabel(rangeStart, rangeEnd)
            : `${formatInTimeZone(`${rangeStart}T12:00:00`, CLINIC_TIMEZONE, "MMM d")} – …`}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[var(--brand-purple)]/[0.06] pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)]/40 hover:text-[var(--brand-text)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={() => onApply(rangeStart, rangeEnd)}
          className="rounded-xl bg-[var(--brand-purple)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-purple-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
