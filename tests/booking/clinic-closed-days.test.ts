import { describe, expect, it } from "vitest";
import {
  CLINIC_CLOSED_CREATE_HINT,
  DEFAULT_CLINIC_WORKING_DAYS,
  clinicClosedDateMessage,
  isClinicWorkingDate,
} from "@/lib/clinic-working-days";
import {
  canBook,
  createPsychologist,
  createSchedulingContext,
  createWeekdayAvailability,
  getSlots,
} from "@tests/helpers";

/**
 * Regression: mobile Agenda previously allowed "+ Add" on clinic-closed days
 * (e.g. Monday) when a psychologist still had Mon–Fri availability rows.
 *
 * Closed days stay selectable for browsing; creation is blocked via Agenda Add,
 * form validation, and validateSlot.
 */
const MONDAY = "2026-07-20"; // closed (clinic)
const TUESDAY = "2026-07-21"; // open

describe("Clinic closed days — mobile Agenda / booking regression", () => {
  it("marks Sunday and Monday as closed under default clinic working days", () => {
    expect(isClinicWorkingDate("2026-07-19", [...DEFAULT_CLINIC_WORKING_DAYS])).toBe(
      false
    ); // Sunday
    expect(isClinicWorkingDate(MONDAY, [...DEFAULT_CLINIC_WORKING_DAYS])).toBe(
      false
    );
    expect(isClinicWorkingDate(TUESDAY, [...DEFAULT_CLINIC_WORKING_DAYS])).toBe(
      true
    );
  });

  it("surfaces the Agenda create helper copy for closed days", () => {
    expect(CLINIC_CLOSED_CREATE_HINT).toBe(
      "The clinic is closed today. Appointments can't be created."
    );
    expect(clinicClosedDateMessage(MONDAY)).toBe("Clinic is closed on Mondays.");
    expect(clinicClosedDateMessage(TUESDAY)).toBeNull();
  });

  it("rejects booking on Monday even when the psychologist has Monday hours", () => {
    // Arrange — psych works Mon–Fri; clinic is Tue–Sat (Agenda closed-day bug)
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      workingDays: [...DEFAULT_CLINIC_WORKING_DAYS],
    });

    // Act / Assert — Agenda + Add / form / API all share validateSlot
    const mondayResult = canBook(MONDAY, "10:00", ctx);
    expect(mondayResult.valid).toBe(false);
    expect(mondayResult.reason).toBe("Clinic is closed on Mondays.");
    expect(getSlots(MONDAY, ctx)).toHaveLength(0);
  });

  it("still allows booking on a clinic working day with matching psych hours", () => {
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      workingDays: [...DEFAULT_CLINIC_WORKING_DAYS],
    });

    expect(canBook(TUESDAY, "10:00", ctx).valid).toBe(true);
    expect(getSlots(TUESDAY, ctx).length).toBeGreaterThan(0);
  });

  it("rejects Monday when workingDays are omitted from client but set on context (API path)", () => {
    // Simulates backend always injecting clinic working days into SchedulingContext
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const withoutClinicDays = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
    });
    // Without workingDays, psych Monday hours would incorrectly pass:
    expect(canBook(MONDAY, "10:00", withoutClinicDays).valid).toBe(true);

    const withClinicDays = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      workingDays: [2, 3, 4, 5, 6],
    });
    expect(canBook(MONDAY, "10:00", withClinicDays).valid).toBe(false);
  });
});
