"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { isClinicWorkingDate } from "@/lib/clinic-working-days";
import { getClinicToday } from "@/lib/datetime";
import { adminControlRadius } from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

export function parseClinicDate(dateStr: string): Date {
  return toZonedTime(new Date(`${dateStr}T12:00:00`), CLINIC_TIMEZONE);
}

export function toClinicDateStr(date: Date): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function formatClinicDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  return formatInTimeZone(`${dateStr}T12:00:00`, CLINIC_TIMEZONE, "MMM d, yyyy");
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const YEAR_FLOOR = 1960;

type CalendarView = "calendar" | "year" | "month";

interface SingleDateCalendarProps {
  value: string;
  onSelect: (dateStr: string) => void;
  min?: string;
  max?: string;
  /**
   * Clinic operating weekdays (0=Sun … 6=Sat).
   * When set, non-working days are disabled and not selectable.
   */
  allowedWeekdays?: number[];
  className?: string;
}

function panelMotionClass(direction: "forward" | "back") {
  return cn(
    "[animation:calendar-panel-in_200ms_cubic-bezier(0.16,1,0.3,1)_both]",
    direction === "forward"
      ? "[--calendar-panel-x:10px]"
      : "[--calendar-panel-x:-10px]"
  );
}

/**
 * Shared month calendar used by the form DatePicker (and visually aligned with
 * the appointments custom range picker).
 *
 * Click the month/year title for a fast Year → Month jump (birthdays, etc.).
 */
export function SingleDateCalendar({
  value,
  onSelect,
  min,
  max,
  allowedWeekdays,
  className,
}: SingleDateCalendarProps) {
  const clinicToday = getClinicToday();
  const todayDate = parseClinicDate(clinicToday);
  const selectedDate = value ? parseClinicDate(value) : null;
  const minDate = min ? parseClinicDate(min) : null;
  const maxDate = max ? parseClinicDate(max) : null;

  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? todayDate);
  const [view, setView] = useState<CalendarView>("calendar");
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const selectedYearRef = useRef<HTMLButtonElement>(null);

  const currentYear = Number(
    formatInTimeZone(todayDate, CLINIC_TIMEZONE, "yyyy")
  );
  const viewYear = Number(
    formatInTimeZone(viewMonth, CLINIC_TIMEZONE, "yyyy")
  );
  const viewMonthIndex =
    Number(formatInTimeZone(viewMonth, CLINIC_TIMEZONE, "M")) - 1;

  const maxYear = maxDate
    ? Number(formatInTimeZone(maxDate, CLINIC_TIMEZONE, "yyyy"))
    : currentYear;
  const minYear = minDate
    ? Math.max(
        YEAR_FLOOR,
        Number(formatInTimeZone(minDate, CLINIC_TIMEZONE, "yyyy"))
      )
    : YEAR_FLOOR;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y);
    return list;
  }, [maxYear, minYear]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  useEffect(() => {
    if (view !== "year") return;
    const frame = requestAnimationFrame(() => {
      selectedYearRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, pendingYear, viewYear]);

  function goToView(next: CalendarView, dir: "forward" | "back") {
    setDirection(dir);
    setView(next);
  }

  function openYearPicker() {
    setPendingYear(viewYear);
    goToView("year", "forward");
  }

  function selectYear(year: number) {
    setPendingYear(year);
    goToView("month", "forward");
  }

  function selectMonth(monthIndex: number) {
    const year = pendingYear ?? viewYear;
    let next = setYear(setMonth(startOfMonth(viewMonth), monthIndex), year);
    if (minDate && isBefore(endOfMonth(next), minDate)) {
      next = startOfMonth(minDate);
    }
    if (maxDate && isAfter(startOfMonth(next), maxDate)) {
      next = startOfMonth(maxDate);
    }
    setViewMonth(next);
    setPendingYear(null);
    goToView("calendar", "forward");
  }

  function isDayDisabled(day: Date): boolean {
    if (minDate && isBefore(day, minDate) && !isSameDay(day, minDate)) {
      return true;
    }
    if (maxDate && isAfter(day, maxDate) && !isSameDay(day, maxDate)) {
      return true;
    }
    if (
      allowedWeekdays &&
      allowedWeekdays.length > 0 &&
      !isClinicWorkingDate(toClinicDateStr(day), allowedWeekdays)
    ) {
      return true;
    }
    return false;
  }

  function isMonthDisabled(monthIndex: number): boolean {
    const year = pendingYear ?? viewYear;
    const monthStart = setYear(
      setMonth(startOfMonth(todayDate), monthIndex),
      year
    );
    const monthEnd = endOfMonth(monthStart);
    if (minDate && isBefore(monthEnd, minDate)) return true;
    if (maxDate && isAfter(monthStart, maxDate)) return true;
    return false;
  }

  const headerYear = pendingYear ?? viewYear;
  const titleLabel =
    view === "year"
      ? "Select year"
      : view === "month"
        ? String(headerYear)
        : formatInTimeZone(viewMonth, CLINIC_TIMEZONE, "MMMM yyyy");

  return (
    <div
      className={cn(
        "w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--brand-purple)]/10 bg-white p-4 shadow-[0_12px_40px_rgba(93,80,122,0.14)]",
        adminControlRadius,
        className
      )}
      role="dialog"
      aria-label="Select date"
    >
      <style>{`
        @keyframes calendar-panel-in {
          from {
            opacity: 0;
            transform: translateX(var(--calendar-panel-x, 10px));
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="mb-3 flex items-center justify-between gap-1">
        {view === "calendar" ? (
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (view === "month") {
                goToView("year", "back");
              } else {
                setPendingYear(null);
                goToView("calendar", "back");
              }
            }}
            aria-label={view === "month" ? "Back to years" : "Back to calendar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (view === "calendar") openYearPicker();
            else if (view === "month") goToView("year", "back");
          }}
          disabled={view === "year"}
          aria-label={
            view === "calendar"
              ? "Choose month and year"
              : view === "month"
                ? "Choose year"
                : undefined
          }
          className={cn(
            "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--brand-text)] transition-colors",
            view !== "year" &&
              "hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]",
            view === "year" && "cursor-default"
          )}
        >
          {titleLabel}
        </button>

        {view === "calendar" ? (
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)] transition-colors hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : (
          <span className="h-8 w-8 shrink-0" aria-hidden />
        )}
      </div>

      <div className="relative min-h-[16.5rem]">
        {view === "calendar" && (
          <div
            key="calendar"
            className={panelMotionClass(direction)}
            role="grid"
            aria-label="Calendar"
          >
            <div className="mb-0.5 grid grid-cols-7 gap-0.5">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]"
                  role="columnheader"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const selected = selectedDate
                  ? isSameDay(day, selectedDate)
                  : false;
                const isToday = isSameDay(day, todayDate);
                const disabled = isDayDisabled(day);
                const label = formatInTimeZone(
                  day,
                  CLINIC_TIMEZONE,
                  "EEEE, MMMM d, yyyy"
                );

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    role="gridcell"
                    aria-label={label}
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => onSelect(toClinicDateStr(day))}
                    className={cn(
                      "relative flex h-8 w-full items-center justify-center rounded-lg text-xs transition-colors duration-150",
                      !inMonth && "text-[var(--brand-text-muted)]/40",
                      inMonth && !selected && "text-[var(--brand-text)]",
                      selected &&
                        "bg-[var(--brand-purple)] font-medium text-white",
                      isToday &&
                        !selected &&
                        "font-semibold text-[var(--brand-purple)]",
                      disabled && "cursor-not-allowed opacity-35",
                      !disabled &&
                        !selected &&
                        "hover:bg-[var(--brand-purple-light)]/50"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "year" && (
          <div
            key="year"
            className={cn(
              panelMotionClass(direction),
              "flex h-[16.5rem] flex-col"
            )}
          >
            <p className="mb-2 text-center text-xs text-[var(--brand-text-muted)]">
              Jump to a year
            </p>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-[var(--brand-purple)]/[0.06] p-1"
              role="listbox"
              aria-label="Select year"
            >
              {years.map((year) => {
                const selected = year === (pendingYear ?? viewYear);
                return (
                  <button
                    key={year}
                    type="button"
                    ref={selected ? selectedYearRef : undefined}
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectYear(year)}
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                      selected
                        ? "bg-[var(--brand-purple)] font-medium text-white"
                        : "text-[var(--brand-text)] hover:bg-[var(--brand-purple-light)]/50"
                    )}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "month" && (
          <div
            key="month"
            className={cn(
              panelMotionClass(direction),
              "flex h-[16.5rem] flex-col"
            )}
          >
            <p className="mb-1.5 shrink-0 text-center text-xs text-[var(--brand-text-muted)]">
              Select a month for {headerYear}
            </p>
            <div
              className="grid min-h-0 flex-1 grid-cols-2 grid-rows-6 gap-x-1.5 gap-y-1 overflow-hidden"
              role="listbox"
              aria-label="Select month"
            >
              {MONTH_LABELS.map((label, monthIndex) => {
                const selected =
                  headerYear === viewYear && monthIndex === viewMonthIndex;
                const disabled = isMonthDisabled(monthIndex);
                return (
                  <button
                    key={label}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => selectMonth(monthIndex)}
                    className={cn(
                      "flex min-h-0 items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium transition-colors duration-150",
                      selected
                        ? "bg-[var(--brand-purple)] text-white"
                        : "bg-[var(--brand-purple-light)]/25 text-[var(--brand-text)] hover:bg-[var(--brand-purple-light)]/55",
                      disabled &&
                        "cursor-not-allowed opacity-35 hover:bg-[var(--brand-purple-light)]/25"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
