import { DAY_NAMES } from "@/lib/constants";
import { clinicDateToUtc, getDayOfWeekInClinic } from "@/lib/datetime";
import type { ClinicSettingsMap } from "@/types/database";

/**
 * JS day-of-week in clinic time (0 = Sunday, 1 = Monday, …, 6 = Saturday).
 * Default: Tuesday–Saturday.
 */
export const DEFAULT_CLINIC_WORKING_DAYS = [2, 3, 4, 5, 6] as const;

export function getClinicWorkingDays(
  settings?: Pick<ClinicSettingsMap, "working_days">
): number[] {
  return settings?.working_days?.length
    ? [...settings.working_days]
    : [...DEFAULT_CLINIC_WORKING_DAYS];
}

export function isClinicWorkingDay(
  dayOfWeek: number,
  workingDays: number[] = [...DEFAULT_CLINIC_WORKING_DAYS]
): boolean {
  return workingDays.includes(dayOfWeek);
}

/** `date` may be a `yyyy-MM-dd` clinic date string or a Date. */
export function isClinicWorkingDate(
  date: string | Date,
  workingDays: number[] = [...DEFAULT_CLINIC_WORKING_DAYS]
): boolean {
  const dayOfWeek =
    typeof date === "string"
      ? getDayOfWeekInClinic(clinicDateToUtc(date, "12:00"))
      : getDayOfWeekInClinic(date);
  return isClinicWorkingDay(dayOfWeek, workingDays);
}

/** e.g. "Clinic is closed on Mondays." — used by validateSlot / API errors. */
export function clinicClosedDayMessage(dayOfWeek: number): string {
  const name = DAY_NAMES[dayOfWeek] ?? "this day";
  return `Clinic is closed on ${name}s.`;
}

/** e.g. "This clinic is closed on Mondays." — Agenda browse empty state. */
export function thisClinicClosedOnDayMessage(dayOfWeek: number): string {
  const name = DAY_NAMES[dayOfWeek] ?? "this day";
  return `This clinic is closed on ${name}s.`;
}

/**
 * Agenda FAB helper when browsing a closed day (dates remain selectable).
 * Prefer the Agenda empty state copy when the list is empty.
 */
export const CLINIC_CLOSED_CREATE_HINT =
  "The clinic is closed today. Appointments can't be created.";

/**
 * Inline form validation when a closed day is selected for creation.
 */
export const CLINIC_CLOSED_CREATE_FORM_MESSAGE =
  "The clinic is closed on this day. Appointments can't be created.";

export function clinicClosedDateMessage(
  date: string | Date,
  workingDays: number[] = [...DEFAULT_CLINIC_WORKING_DAYS]
): string | null {
  const dayOfWeek =
    typeof date === "string"
      ? getDayOfWeekInClinic(clinicDateToUtc(date, "12:00"))
      : getDayOfWeekInClinic(date);
  if (isClinicWorkingDay(dayOfWeek, workingDays)) return null;
  return clinicClosedDayMessage(dayOfWeek);
}

export function thisClinicClosedDateMessage(
  date: string | Date,
  workingDays: number[] = [...DEFAULT_CLINIC_WORKING_DAYS]
): string | null {
  const dayOfWeek =
    typeof date === "string"
      ? getDayOfWeekInClinic(clinicDateToUtc(date, "12:00"))
      : getDayOfWeekInClinic(date);
  if (isClinicWorkingDay(dayOfWeek, workingDays)) return null;
  return thisClinicClosedOnDayMessage(dayOfWeek);
}

function pluralWeekday(dayOfWeek: number): string {
  const name = DAY_NAMES[dayOfWeek] ?? "this day";
  return name === "this day" ? name : `${name}s`;
}

function joinNaturalList(items: string[]): string {
  if (items.length === 0) return "this day";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Closed weekdays from clinic working-days config, Sunday → Saturday. */
export function getClinicClosedWeekdays(
  workingDays: number[] = [...DEFAULT_CLINIC_WORKING_DAYS]
): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((day) => !workingDays.includes(day));
}

/**
 * Booking calendar supporting copy, e.g.
 * "The clinic is closed on Mondays. Please choose another day…"
 * or "The clinic is closed on Sundays and Mondays. …"
 */
export function clinicClosedBookingSupportText(
  date: string | Date,
  workingDays: number[] = [...DEFAULT_CLINIC_WORKING_DAYS]
): string {
  const closedWeekdays = getClinicClosedWeekdays(workingDays);
  const selectedDay =
    typeof date === "string"
      ? getDayOfWeekInClinic(clinicDateToUtc(date, "12:00"))
      : getDayOfWeekInClinic(date);

  const daysToName =
    closedWeekdays.length > 0 ? closedWeekdays : [selectedDay];
  const phrase = joinNaturalList(daysToName.map(pluralWeekday));
  return `The clinic is closed on ${phrase}. Please choose another day to see available appointment times.`;
}
