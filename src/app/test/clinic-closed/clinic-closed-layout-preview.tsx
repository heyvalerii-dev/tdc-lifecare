"use client";

import { useState } from "react";
import { BookingClinicClosedNotice } from "@/components/booking/booking-clinic-closed-notice";
import { BookingScheduleCalendar } from "@/components/booking/booking-schedule-calendar";
import { DEFAULT_CLINIC_WORKING_DAYS, isClinicWorkingDate } from "@/lib/clinic-working-days";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const WORKING_DAYS = [...DEFAULT_CLINIC_WORKING_DAYS];

/** Future dates in the preview month so they remain selectable. */
const CLOSED_DATE = "2026-08-24"; // Monday
const AVAILABLE_DATE = "2026-08-25"; // Tuesday
const EMPTY_SLOTS_DATE = "2026-08-26"; // Wednesday

const PREVIEW_AVAILABLE_DATES = [
  CLOSED_DATE,
  AVAILABLE_DATE,
  EMPTY_SLOTS_DATE,
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-27",
  "2026-08-28",
  "2026-08-29",
];

const PREVIEW_MORNING = ["9:00 AM", "10:00 AM", "11:00 AM"];
const PREVIEW_AFTERNOON = ["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

function SlotGroup({ label, slots }: { label: string; slots: string[] }) {
  return (
    <div className="space-y-3.5">
      <p className="text-sm font-medium text-[var(--brand-text-muted)]">{label}</p>
      <div className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-4">
        {slots.map((slot) => (
          <span
            key={slot}
            className="inline-flex h-12 items-center justify-center rounded-[10px] border border-[var(--brand-border)] bg-white px-3 text-sm font-medium text-[var(--brand-text)]"
          >
            {slot}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Interactive layout preview: closed / available / empty-slot dates. */
export function ClinicClosedLayoutPreview() {
  const [selectedDate, setSelectedDate] = useState(CLOSED_DATE);
  const dateIsClosed = !isClinicWorkingDate(selectedDate, WORKING_DAYS);
  const hasTimes = selectedDate === AVAILABLE_DATE;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        {(
          [
            [CLOSED_DATE, "Closed (Mon)"],
            [AVAILABLE_DATE, "Available (Tue)"],
            [EMPTY_SLOTS_DATE, "No slots (Wed)"],
          ] as const
        ).map(([date, label]) => (
          <button
            key={date}
            type="button"
            onClick={() => setSelectedDate(date)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              selectedDate === date
                ? "bg-[var(--brand-purple)] text-white"
                : "bg-white text-[var(--brand-text)] ring-1 ring-[var(--brand-border)] hover:bg-[var(--brand-purple-light)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
        <BookingScheduleCalendar
          availableDates={PREVIEW_AVAILABLE_DATES}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        {dateIsClosed && (
          <BookingClinicClosedNotice
            selectedDate={selectedDate}
            workingDays={WORKING_DAYS}
          />
        )}
      </div>

      {selectedDate && !dateIsClosed && (
        <div className="space-y-6">
          {hasTimes ? (
            <div className="space-y-8">
              <SlotGroup label="Morning" slots={PREVIEW_MORNING} />
              <SlotGroup label="Afternoon" slots={PREVIEW_AFTERNOON} />
            </div>
          ) : (
            <p className={cn(type.bodyMuted, "text-center sm:text-left")}>
              No available times for this date. Try another day.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
