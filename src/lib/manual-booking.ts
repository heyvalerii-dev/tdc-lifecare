import { clinicDateToUtc, formatClinicDate, formatClinicTime } from "@/lib/datetime";
import {
  CALENDAR_GRID_END_HOUR,
  CALENDAR_GRID_START_HOUR,
  formatGridTime,
  SCHEDULER_GRID_MINUTES,
} from "@/lib/scheduling-grid";

/** Prefill when opening Manual Booking from a calendar empty slot or day context. */
export interface ManualBookingSlotPreset {
  psychologistId: string;
  psychologistName: string;
  selectedDate: string;
  /** HH:mm — omit when the user must choose a time (mobile day Add). */
  selectedStartTime?: string;
  /** HH:mm — may be refined once a service duration is known. */
  selectedEndTime?: string;
}

export function addMinutesToHhmm(timeHhmm: string, minutes: number): string {
  const [hourPart, minutePart] = timeHhmm.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return timeHhmm;

  const total = hour * 60 + minute + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHour = Math.floor(normalized / 60);
  const nextMinute = normalized % 60;
  return formatGridTime(nextHour, nextMinute);
}

export function formatBookingDateLabel(dateStr: string): string {
  return formatClinicDate(
    clinicDateToUtc(dateStr, "12:00"),
    "EEEE, MMMM d, yyyy"
  );
}

export function formatBookingTimeLabel(timeHhmm: string): string {
  return formatClinicTime(clinicDateToUtc("2000-01-01", timeHhmm), "h:mm a");
}

export function formatBookingTimeRange(
  startHhmm: string,
  endHhmm: string
): string {
  return `${formatBookingTimeLabel(startHhmm)} – ${formatBookingTimeLabel(endHhmm)}`;
}

/** 15-minute options matching the admin calendar grid. */
export const MANUAL_BOOKING_TIME_OPTIONS: { value: string; label: string }[] =
  (() => {
    const options: { value: string; label: string }[] = [];
    for (
      let hour = CALENDAR_GRID_START_HOUR;
      hour < CALENDAR_GRID_END_HOUR;
      hour++
    ) {
      for (let minute = 0; minute < 60; minute += SCHEDULER_GRID_MINUTES) {
        const value = formatGridTime(hour, minute);
        options.push({
          value,
          label: formatBookingTimeLabel(value),
        });
      }
    }
    return options;
  })();

export function buildSlotPresetFromGrid(args: {
  psychologistId: string;
  psychologistName: string;
  dateStr: string;
  hour: number;
  minute?: number;
  /** Used for the read-only end time until a service is chosen. */
  durationMinutes?: number;
}): ManualBookingSlotPreset {
  const minute = args.minute ?? 0;
  const selectedStartTime = formatGridTime(args.hour, minute);
  const duration = args.durationMinutes && args.durationMinutes > 0
    ? args.durationMinutes
    : 60;

  return {
    psychologistId: args.psychologistId,
    psychologistName: args.psychologistName,
    selectedDate: args.dateStr,
    selectedStartTime,
    selectedEndTime: addMinutesToHhmm(selectedStartTime, duration),
  };
}

/** Day-level context for mobile Add — date + psychologist only; time left unset. */
export function buildDayContextPreset(args: {
  psychologistId: string;
  psychologistName: string;
  dateStr: string;
}): ManualBookingSlotPreset {
  return {
    psychologistId: args.psychologistId,
    psychologistName: args.psychologistName,
    selectedDate: args.dateStr,
  };
}
