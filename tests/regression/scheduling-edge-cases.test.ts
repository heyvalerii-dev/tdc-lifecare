import { describe, expect, it } from "vitest";
import {
  expandRuleToOccurrences,
  resolveUnavailableBlocks,
} from "@/lib/calendar-blocks";
import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import {
  APRIL,
  GIAN,
  canBook,
  createPersonalTime,
  createPsychologist,
  createRecurringLunch,
  createSchedulingContext,
  createVacation,
  createWeekdayAvailability,
  getSlots,
  hasSlotAt,
  lunchOccurrencesOnDate,
  overridesOnDate,
  weekContaining,
} from "@tests/helpers";

function clinicDate(iso: string): string {
  return formatInTimeZone(iso, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

describe("Regression — scheduling edge cases", () => {
  it("cross-psychologist personal time never suppresses another lunch (booking + resolve)", () => {
    // Arrange
    const april = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const gian = createPsychologist({ name: "Gian Carlo Tolentino" });
    const friday = "2026-07-17";
    const { from, to } = weekContaining(friday);

    const aprilLunch = createRecurringLunch({
      psychologistId: april.id,
      days: [2, 3, 4, 5, 6],
    });
    const gianPersonal = createPersonalTime({
      psychologistId: gian.id,
      date: friday,
      allDay: true,
    });

    // Act
    const resolved = resolveUnavailableBlocks(
      [aprilLunch, gianPersonal],
      from,
      to
    );
    const aprilCtx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(april.id),
      unavailableBlocks: [aprilLunch],
    });
    const gianCtx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(gian.id),
      unavailableBlocks: [gianPersonal],
    });

    // Assert
    expect(lunchOccurrencesOnDate(resolved, APRIL, friday)).toHaveLength(1);
    expect(overridesOnDate(resolved, GIAN, friday, "personal")).toHaveLength(1);
    expect(canBook(friday, "12:00", aprilCtx).valid).toBe(false); // April lunch
    expect(canBook(friday, "10:00", aprilCtx).valid).toBe(true);
    expect(canBook(friday, "10:00", gianCtx).valid).toBe(false); // Gian personal
  });

  it("month-boundary weekday lunch expands without dropping days", () => {
    // Arrange
    const lunch = createRecurringLunch({
      psychologistId: APRIL,
    });

    // Act
    const dates = expandRuleToOccurrences(lunch, "2026-01-30", "2026-02-02").map(
      (o) => clinicDate(o.start_at)
    );

    // Assert
    expect(dates).toEqual(["2026-01-30", "2026-02-02"]);
  });

  it("year-boundary weekday lunch expands without dropping days", () => {
    // Arrange
    const lunch = createRecurringLunch({
      psychologistId: GIAN,
    });

    // Act
    const dates = expandRuleToOccurrences(
      lunch,
      "2026-12-31",
      "2027-01-01"
    ).map((o) => clinicDate(o.start_at));

    // Assert
    expect(dates).toEqual(["2026-12-31", "2027-01-01"]);
  });

  it("partial-day personal time leaves non-overlapping morning slots bookable", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const date = "2026-07-17";
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createPersonalTime({
          psychologistId: psych.id,
          date,
          allDay: false,
          startTime: "14:00",
          endTime: "17:00",
        }),
      ],
    });

    // Act / Assert
    expect(canBook(date, "09:00", ctx).valid).toBe(true);
    expect(canBook(date, "13:00", ctx).valid).toBe(true);
    expect(canBook(date, "13:45", ctx).valid).toBe(false);
  });

  it("multi-day vacation blocks each inclusive clinic day for bookings", () => {
    // Arrange
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const vacation = createVacation({
      psychologistId: psych.id,
      date: "2026-07-15",
      endDate: "2026-07-17",
      allDay: true,
    });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [vacation],
    });

    // Act
    const resolved = resolveUnavailableBlocks(
      [vacation],
      "2026-07-14",
      "2026-07-17"
    );

    // Assert
    expect(resolved).toHaveLength(1);
    expect(canBook("2026-07-14", "10:00", ctx).valid).toBe(true);
    expect(canBook("2026-07-15", "10:00", ctx).valid).toBe(false);
    expect(canBook("2026-07-16", "10:00", ctx).valid).toBe(false);
    expect(canBook("2026-07-17", "10:00", ctx).valid).toBe(false);
  });

  it("slot offers use clinic timezone weekdays (not the server local timezone)", () => {
    // Arrange — regression for getAvailableSlotsForDate day-of-week derivation
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const friday = "2026-07-17";
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
    });

    // Act
    const fridaySlots = getSlots(friday, ctx);
    const saturdaySlots = getSlots("2026-07-18", ctx);

    // Assert
    expect(fridaySlots.length).toBeGreaterThan(0);
    expect(hasSlotAt(fridaySlots, friday, "09:00")).toBe(true);
    expect(saturdaySlots).toHaveLength(0);
  });

  it("booking exactly on lunch start/end boundaries succeeds; interior fails", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createRecurringLunch({
          psychologistId: psych.id,
          days: [5],
        }),
      ],
      service: {
        ...createSchedulingContext().service,
        duration_minutes: 60,
        buffer_minutes: 0,
      },
    });
    const friday = "2026-07-17";

    // Act / Assert — 11:00–12:00 ends at lunch start; 13:00 starts at lunch end
    expect(canBook(friday, "11:00", ctx).valid).toBe(true);
    expect(canBook(friday, "12:00", ctx).valid).toBe(false);
    expect(canBook(friday, "12:30", ctx).valid).toBe(false);
    expect(canBook(friday, "13:00", ctx).valid).toBe(true);
  });
});
