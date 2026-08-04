import { format, parseISO, addMinutes, addHours, isBefore, isAfter, startOfDay } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE, TIMEZONE_LABEL } from "./constants";

export { CLINIC_TIMEZONE, TIMEZONE_LABEL };

export function toClinicTime(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(d, CLINIC_TIMEZONE);
}

export function fromClinicTime(date: Date): Date {
  return fromZonedTime(date, CLINIC_TIMEZONE);
}

export function formatClinicDate(date: Date | string, fmt = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(d, CLINIC_TIMEZONE, fmt);
}

export function formatClinicTime(date: Date | string, fmt = "h:mm a"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(d, CLINIC_TIMEZONE, fmt);
}

export function formatClinicDateTime(date: Date | string): string {
  return `${formatClinicDate(date)} at ${formatClinicTime(date)} ${TIMEZONE_LABEL}`;
}

export function clinicDateToUtc(dateStr: string, timeStr: string): Date {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  return fromZonedTime(local, CLINIC_TIMEZONE);
}

export function getDayOfWeekInClinic(date: Date | string): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  const clinic = toZonedTime(d, CLINIC_TIMEZONE);
  return clinic.getDay();
}

export function addClinicHours(date: Date, hours: number): Date {
  return addHours(date, hours);
}

export function getAppointmentEnd(startAt: Date, durationMinutes: number, bufferMinutes: number): Date {
  return addMinutes(startAt, durationMinutes + bufferMinutes);
}

/** When a psychologist becomes available again after an appointment (end + service buffer). */
export function getOccupiedUntil(endAt: Date, bufferMinutes: number): Date {
  return addMinutes(endAt, bufferMinutes);
}

export function isSlotInPast(slotStart: Date): boolean {
  return isBefore(slotStart, new Date());
}

export function meetsMinimumAdvance(
  slotStart: Date,
  minimumHours: number,
  allowSameDay: boolean
): boolean {
  const now = new Date();
  if (!allowSameDay) {
    const clinicNow = toZonedTime(now, CLINIC_TIMEZONE);
    const clinicSlot = toZonedTime(slotStart, CLINIC_TIMEZONE);
    if (format(clinicNow, "yyyy-MM-dd") === format(clinicSlot, "yyyy-MM-dd")) {
      return false;
    }
  }
  const minTime = addHours(now, minimumHours);
  return !isBefore(slotStart, minTime);
}

export function isSameClinicDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === "string" ? parseISO(date1) : date1;
  const d2 = typeof date2 === "string" ? parseISO(date2) : date2;
  return (
    formatInTimeZone(d1, CLINIC_TIMEZONE, "yyyy-MM-dd") ===
    formatInTimeZone(d2, CLINIC_TIMEZONE, "yyyy-MM-dd")
  );
}

export function getClinicToday(): string {
  return formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function getClinicStartOfDay(dateStr: string): Date {
  return fromZonedTime(startOfDay(new Date(`${dateStr}T00:00:00`)), CLINIC_TIMEZONE);
}

export function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return isBefore(start1, end2) && isAfter(end1, start2);
}
