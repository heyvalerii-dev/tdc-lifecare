/**
 * Shared fixtures and builders for fast, deterministic business-logic tests.
 * Prefer these over ad-hoc object literals so regression tests stay readable.
 */

export { ids, nextId } from "./ids";
export { clinicIso, nextClinicDate, weekContaining } from "./dates";
export { createPsychologist, APRIL, GIAN } from "./psychologists";
export { createService } from "./services";
export { createAvailability } from "./availability";
export { createAppointment } from "./appointments";
export {
  createRecurringLunch,
  createPersonalTime,
  createVacation,
  createUnavailableOverride,
} from "./unavailable-blocks";
export {
  lunchOccurrencesOnDate,
  overridesOnDate,
} from "./calendar-assertions";
export {
  createSchedulingContext,
  createWeekdayAvailability,
  clinicSlotStart,
  hasSlotAt,
  getSlots,
  canBook,
  type TestSchedulingContext,
} from "./scheduling";
