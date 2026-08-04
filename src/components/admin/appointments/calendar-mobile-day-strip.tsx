"use client";

import { useEffect, useRef } from "react";
import { formatDayHeader, toClinicDateString } from "@/lib/admin-calendar";
import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CalendarMobileDayStripProps {
  days: Date[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  clinicToday: string;
}

export function CalendarMobileDayStrip({
  days,
  selectedIndex,
  onSelect,
  clinicToday,
}: CalendarMobileDayStripProps) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedIndex]);

  return (
    <div
      className="flex gap-1 overflow-x-auto px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Select day"
    >
      {days.map((day, index) => {
        const isSelected = index === selectedIndex;
        const isToday = toClinicDateString(day) === clinicToday;
        const { weekdayShort } = formatDayHeader(day);
        const dayNumber = formatInTimeZone(day, CLINIC_TIMEZONE, "d");

        return (
          <button
            key={toClinicDateString(day)}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(index)}
            className={cn(
              "flex min-h-11 min-w-[3rem] shrink-0 flex-col items-center justify-center rounded-xl px-2.5 py-1.5 transition-colors duration-150",
              isSelected
                ? "bg-[var(--brand-purple)] text-white shadow-sm"
                : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-purple-light)]/45 hover:text-[var(--brand-text)]"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide leading-none",
                isSelected ? "text-white/90" : "text-[var(--brand-text-muted)]"
              )}
            >
              {weekdayShort}
            </span>
            <span
              className={cn(
                "mt-0.5 text-base font-semibold leading-none tabular-nums",
                isSelected ? "text-white" : "text-[var(--brand-text)]",
                isToday && !isSelected && "text-[var(--brand-purple)]"
              )}
            >
              {dayNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}
