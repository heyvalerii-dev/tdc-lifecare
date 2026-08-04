"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TIMEZONE_LABEL } from "@/lib/constants";
import { getClinicToday } from "@/lib/datetime";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(monthKey: string): string {
  return format(parseISO(`${monthKey}-01T12:00:00`), "MMMM yyyy");
}

function buildMonthGrid(monthKey: string): string[] {
  const monthStart = parseISO(`${monthKey}-01T12:00:00`);
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) =>
    format(day, "yyyy-MM-dd")
  );
}

interface BookingScheduleCalendarProps {
  availableDates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  loading?: boolean;
}

export function BookingScheduleCalendar({
  availableDates,
  selectedDate,
  onSelectDate,
  loading = false,
}: BookingScheduleCalendarProps) {
  const clinicToday = getClinicToday();
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const defaultMonth = selectedDate
    ? toMonthKey(selectedDate)
    : availableDates[0]
      ? toMonthKey(availableDates[0])
      : toMonthKey(clinicToday);

  const [viewMonth, setViewMonth] = useState(defaultMonth);

  useEffect(() => {
    if (selectedDate) {
      setViewMonth(toMonthKey(selectedDate));
    } else if (availableDates.length > 0) {
      setViewMonth(toMonthKey(availableDates[0]));
    }
  }, [selectedDate, availableDates]);

  const gridDays = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  function goToPrevMonth() {
    setViewMonth((current) => format(subMonths(parseISO(`${current}-01T12:00:00`), 1), "yyyy-MM"));
  }

  function goToNextMonth() {
    setViewMonth((current) => format(addMonths(parseISO(`${current}-01T12:00:00`), 1), "yyyy-MM"));
  }

  return (
    <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5 shadow-[0_4px_24px_rgba(93,80,122,0.06)] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="Previous month"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)] hover:text-[var(--brand-purple)]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)] sm:text-xl">
          {monthLabel(viewMonth)}
        </h3>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="Next month"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)] hover:text-[var(--brand-purple)]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={cn(type.smallMuted, "py-2 text-center text-xs font-semibold uppercase tracking-wide")}
          >
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center">
          <p className={type.bodyMuted}>Loading available dates...</p>
        </div>
      ) : availableDates.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center px-4 text-center">
          <p className={type.bodyMuted}>No available dates for this service.</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Appointment calendar">
          {gridDays.map((dateStr) => {
            const inViewMonth = dateStr.startsWith(viewMonth);
            const isPast = dateStr < clinicToday;
            const isAvailable = availableSet.has(dateStr);
            const isSelectable = inViewMonth && isAvailable && !isPast;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === clinicToday;
            const dayNum = parseInt(dateStr.slice(8), 10);

            return (
              <button
                key={dateStr}
                type="button"
                role="gridcell"
                disabled={!isSelectable}
                onClick={() => isSelectable && onSelectDate(dateStr)}
                aria-label={dateStr}
                aria-selected={isSelected}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-all",
                  !inViewMonth && "pointer-events-none text-transparent",
                  inViewMonth && !isSelectable && "cursor-not-allowed text-[var(--brand-text-muted)]/35",
                  inViewMonth &&
                    isSelectable &&
                    !isSelected &&
                    "text-[var(--brand-text)] hover:bg-[var(--brand-purple-light)]",
                  isSelected && "bg-[var(--brand-purple)] text-white shadow-sm",
                  isToday &&
                    !isSelected &&
                    isSelectable &&
                    "ring-1 ring-[var(--brand-purple)]/40 ring-offset-1",
                  isToday && !isSelectable && "ring-1 ring-[var(--brand-border)] ring-offset-1"
                )}
              >
                {inViewMonth ? dayNum : ""}
              </button>
            );
          })}
        </div>
      )}

      <p className={cn(type.smallMuted, "mt-4 text-center text-xs sm:text-left")}>
        All times shown in {TIMEZONE_LABEL}
      </p>
    </div>
  );
}
