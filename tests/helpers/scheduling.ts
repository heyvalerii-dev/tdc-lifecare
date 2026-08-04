import type {
  AvailabilityBlock,
  Service,
  UnavailableBlock,
} from "@/types/database";
import {
  getAvailableSlotsForDate,
  validateSlot,
  type SchedulingAppointment,
  type TimeSlot,
} from "@/lib/scheduling";
import { clinicDateToUtc } from "@/lib/datetime";
import { createAvailability } from "./availability";
import { createService } from "./services";
import { nextId } from "./ids";

export type TestSchedulingContext = {
  availabilityBlocks: AvailabilityBlock[];
  unavailableBlocks: UnavailableBlock[];
  existingAppointments: SchedulingAppointment[];
  service: Service;
  minimumAdvanceHours: number;
  allowSameDay: boolean;
  bypassRules?: boolean;
  allowPast?: boolean;
  /** Clinic operating weekdays (0=Sun … 6=Sat). */
  workingDays?: number[];
};

/** Deterministic booking context — bypasses wall-clock advance/past checks. */
export function createSchedulingContext(
  overrides: Partial<TestSchedulingContext> = {}
): TestSchedulingContext {
  return {
    availabilityBlocks: [],
    unavailableBlocks: [],
    existingAppointments: [],
    service: createService({
      duration_minutes: 50,
      buffer_minutes: 0,
    }),
    minimumAdvanceHours: 0,
    allowSameDay: true,
    bypassRules: true,
    allowPast: true,
    ...overrides,
  };
}

/** Mon–Fri 09:00–17:00 for a psychologist. */
export function createWeekdayAvailability(
  psychologistId: string,
  options?: { startTime?: string; endTime?: string }
): AvailabilityBlock[] {
  const start = options?.startTime ?? "09:00:00";
  const end = options?.endTime ?? "17:00:00";
  return [1, 2, 3, 4, 5].map((day_of_week) =>
    createAvailability({
      id: nextId("avail"),
      psychologist_id: psychologistId,
      day_of_week,
      start_time: start,
      end_time: end,
    })
  );
}

export function clinicSlotStart(date: string, timeHhmm: string): Date {
  return clinicDateToUtc(date, timeHhmm);
}

export function hasSlotAt(
  slots: TimeSlot[],
  date: string,
  timeHhmm: string
): boolean {
  const target = clinicDateToUtc(date, timeHhmm).getTime();
  return slots.some((slot) => slot.start.getTime() === target);
}

export function getSlots(
  date: string,
  ctx: TestSchedulingContext
): TimeSlot[] {
  return getAvailableSlotsForDate(date, ctx);
}

export function canBook(
  date: string,
  timeHhmm: string,
  ctx: TestSchedulingContext
): { valid: boolean; reason?: string } {
  return validateSlot(clinicSlotStart(date, timeHhmm), ctx);
}
