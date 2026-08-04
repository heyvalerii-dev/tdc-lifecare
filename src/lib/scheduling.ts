import { addMinutes, parseISO, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { resolveUnavailableBlocks } from "@/lib/calendar-blocks";
import type {
  AvailabilityBlock,
  UnavailableBlock,
  Appointment,
  Service,
} from "@/types/database";
import {
  CLINIC_TIMEZONE,
  clinicDateToUtc,
  getDayOfWeekInClinic,
  getAppointmentEnd,
  getOccupiedUntil,
  rangesOverlap,
  meetsMinimumAdvance,
  isSlotInPast,
} from "./datetime";
import { SCHEDULER_GRID_MINUTES } from "./scheduling-grid";
import {
  clinicClosedDayMessage,
  isClinicWorkingDay,
} from "@/lib/clinic-working-days";

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

/** Appointment with joined service data for per-appointment buffer calculation. */
export type SchedulingAppointment = Appointment & {
  service?: Pick<Service, "buffer_minutes" | "duration_minutes"> | null;
};

export const SCHEDULING_APPOINTMENT_SELECT =
  "*, service:services(buffer_minutes, duration_minutes)";

interface SchedulingContext {
  availabilityBlocks: AvailabilityBlock[];
  unavailableBlocks: UnavailableBlock[];
  existingAppointments: SchedulingAppointment[];
  service: Service;
  minimumAdvanceHours: number;
  allowSameDay: boolean;
  bypassRules?: boolean;
  /** When true, skip the "slot is in the past" check (e.g. editing same start). */
  allowPast?: boolean;
  /**
   * Clinic operating weekdays (0=Sun … 6=Sat).
   * When set, booking is rejected on closed days even if a psychologist has hours.
   */
  workingDays?: number[];
}

function getBlockedRanges(
  appointments: SchedulingAppointment[]
): { start: Date; end: Date }[] {
  return appointments
    .filter((a) => !["cancelled", "expired"].includes(a.status))
    .map((a) => ({
      start: parseISO(a.start_at),
      end: getOccupiedUntil(
        parseISO(a.end_at),
        a.service?.buffer_minutes ?? 0
      ),
    }));
}

function isBlockedByUnavailable(
  slotStart: Date,
  slotEnd: Date,
  unavailable: UnavailableBlock[]
): boolean {
  const dateStr = formatInTimeZone(slotStart, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const resolved = resolveUnavailableBlocks(unavailable, dateStr, dateStr);
  return resolved.some((block) =>
    rangesOverlap(
      slotStart,
      slotEnd,
      parseISO(block.start_at),
      parseISO(block.end_at)
    )
  );
}

function isBlockedByAppointments(
  slotStart: Date,
  slotEnd: Date,
  blockedRanges: { start: Date; end: Date }[]
): boolean {
  return blockedRanges.some((range) =>
    rangesOverlap(slotStart, slotEnd, range.start, range.end)
  );
}

function generateSlotsForDay(
  dateStr: string,
  dayOfWeek: number,
  ctx: SchedulingContext
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayAvailability = ctx.availabilityBlocks.filter(
    (b) => b.day_of_week === dayOfWeek && b.is_active
  );

  const blockedRanges = getBlockedRanges(ctx.existingAppointments);
  const totalMinutes = ctx.service.duration_minutes + ctx.service.buffer_minutes;
  const stepMinutes = SCHEDULER_GRID_MINUTES;

  for (const block of dayAvailability) {
    const blockStart = clinicDateToUtc(dateStr, block.start_time.slice(0, 5));
    const blockEnd = clinicDateToUtc(dateStr, block.end_time.slice(0, 5));

    let cursor = blockStart;
    while (addMinutes(cursor, ctx.service.duration_minutes) <= blockEnd) {
      const slotEnd = addMinutes(cursor, totalMinutes);

      const isPast = !ctx.allowPast && isSlotInPast(cursor);
      const meetsAdvance =
        ctx.bypassRules ||
        meetsMinimumAdvance(cursor, ctx.minimumAdvanceHours, ctx.allowSameDay);
      const blockedUnavailable = isBlockedByUnavailable(
        cursor,
        slotEnd,
        ctx.unavailableBlocks
      );
      const blockedAppointment = isBlockedByAppointments(cursor, slotEnd, blockedRanges);

      if (!isPast && meetsAdvance && !blockedUnavailable && !blockedAppointment) {
        slots.push({
          start: cursor,
          end: addMinutes(cursor, ctx.service.duration_minutes),
          label: formatInTimeZone(cursor, CLINIC_TIMEZONE, "h:mm a"),
        });
      }

      cursor = addMinutes(cursor, stepMinutes);
    }
  }

  return slots;
}

export function getAvailableSlotsForDate(
  dateStr: string,
  ctx: SchedulingContext
): TimeSlot[] {
  const dayOfWeek = getDayOfWeekInClinic(clinicDateToUtc(dateStr, "12:00"));
  if (
    ctx.workingDays &&
    ctx.workingDays.length > 0 &&
    !isClinicWorkingDay(dayOfWeek, ctx.workingDays)
  ) {
    return [];
  }
  return generateSlotsForDay(dateStr, dayOfWeek, ctx);
}

export function getAvailableDates(
  startDate: Date,
  daysAhead: number,
  ctx: SchedulingContext
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const date = addMinutes(startDate, i * 24 * 60);
    const dateStr = formatInTimeZone(date, CLINIC_TIMEZONE, "yyyy-MM-dd");
    const dayOfWeek = getDayOfWeekInClinic(clinicDateToUtc(dateStr, "12:00"));
    const hasAvailability = ctx.availabilityBlocks.some(
      (b) => b.day_of_week === dayOfWeek && b.is_active
    );
    if (hasAvailability) {
      const slots = generateSlotsForDay(dateStr, dayOfWeek, ctx);
      if (slots.length > 0) {
        dates.push(dateStr);
      }
    }
  }
  return dates;
}

export function validateSlot(
  slotStart: Date,
  ctx: SchedulingContext
): { valid: boolean; reason?: string } {
  if (!ctx.allowPast && isSlotInPast(slotStart)) {
    return { valid: false, reason: "This time slot is in the past." };
  }

  if (
    !ctx.bypassRules &&
    !meetsMinimumAdvance(slotStart, ctx.minimumAdvanceHours, ctx.allowSameDay)
  ) {
    return {
      valid: false,
      reason: `Bookings require at least ${ctx.minimumAdvanceHours} hours advance notice.`,
    };
  }

  const dayOfWeek = getDayOfWeekInClinic(slotStart);
  if (
    ctx.workingDays &&
    ctx.workingDays.length > 0 &&
    !isClinicWorkingDay(dayOfWeek, ctx.workingDays)
  ) {
    return {
      valid: false,
      reason: clinicClosedDayMessage(dayOfWeek),
    };
  }

  const slotEnd = getAppointmentEnd(
    slotStart,
    ctx.service.duration_minutes,
    ctx.service.buffer_minutes
  );

  if (isBlockedByUnavailable(slotStart, slotEnd, ctx.unavailableBlocks)) {
    return {
      valid: false,
      reason: "This time overlaps blocked time on the calendar.",
    };
  }

  const blockedRanges = getBlockedRanges(ctx.existingAppointments);
  if (isBlockedByAppointments(slotStart, slotEnd, blockedRanges)) {
    return { valid: false, reason: "This time slot is already booked." };
  }

  const dayAvailability = ctx.availabilityBlocks.filter(
    (b) => b.day_of_week === dayOfWeek && b.is_active
  );

  const timeStr = formatInTimeZone(slotStart, CLINIC_TIMEZONE, "HH:mm");
  const inAvailability = dayAvailability.some((block) => {
    const blockStart = block.start_time.slice(0, 5);
    const blockEnd = block.end_time.slice(0, 5);
    return timeStr >= blockStart && timeStr < blockEnd;
  });

  if (!inAvailability) {
    return { valid: false, reason: "Outside of psychologist availability." };
  }

  return { valid: true };
}
