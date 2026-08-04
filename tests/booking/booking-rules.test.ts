import { describe, expect, it } from "vitest";
import {
  canBook,
  createAppointment,
  createPersonalTime,
  createPsychologist,
  createRecurringLunch,
  createSchedulingContext,
  createVacation,
  createWeekdayAvailability,
  getSlots,
  hasSlotAt,
} from "@tests/helpers";

const FRIDAY = "2026-07-17";
const WEDNESDAY = "2026-07-15";

describe("Booking — availability window boundaries", () => {
  it("booking exactly at opening time succeeds", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id, {
        startTime: "09:00:00",
        endTime: "17:00:00",
      }),
    });

    // Act / Assert
    expect(canBook(FRIDAY, "09:00", ctx).valid).toBe(true);
    expect(hasSlotAt(getSlots(FRIDAY, ctx), FRIDAY, "09:00")).toBe(true);
  });

  it("booking exactly at closing time follows business rules (start at close is outside availability)", () => {
    // Arrange — availability end is exclusive for slot starts; grid is 15 minutes
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id, {
        startTime: "09:00:00",
        endTime: "17:00:00",
      }),
      service: {
        ...createSchedulingContext().service,
        duration_minutes: 50,
        buffer_minutes: 0,
      },
    });

    // Act / Assert
    // Cannot start at closing time (start must be < end_time).
    expect(canBook(FRIDAY, "17:00", ctx).valid).toBe(false);
    // Slot offers: last 15-min grid start where duration fits is 16:00 (ends 16:50).
    expect(hasSlotAt(getSlots(FRIDAY, ctx), FRIDAY, "16:00")).toBe(true);
    expect(hasSlotAt(getSlots(FRIDAY, ctx), FRIDAY, "16:15")).toBe(false);
    // validateSlot currently checks start-in-window only (not end-before-close).
    expect(canBook(FRIDAY, "16:15", ctx).valid).toBe(true);
  });

  it("booking outside availability fails", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id, {
        startTime: "09:00:00",
        endTime: "17:00:00",
      }),
    });

    // Act / Assert
    expect(canBook(FRIDAY, "08:00", ctx).valid).toBe(false);
    expect(canBook(FRIDAY, "08:00", ctx).reason).toMatch(/availability/i);
  });

  it("booking on a disabled weekday fails", () => {
    // Arrange — Saturday has no availability row
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const saturday = "2026-07-18";
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
    });

    // Act / Assert
    expect(canBook(saturday, "10:00", ctx).valid).toBe(false);
    expect(getSlots(saturday, ctx)).toHaveLength(0);
  });
});

describe("Booking — lunch and appointment boundaries", () => {
  it("booking that ends exactly when lunch starts succeeds", () => {
    // Arrange — 50m session 11:10–12:00; lunch 12:00–13:00
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createRecurringLunch({
          psychologistId: psych.id,
          days: [2, 3, 4, 5, 6],
        }),
      ],
      service: {
        ...createSchedulingContext().service,
        duration_minutes: 50,
        buffer_minutes: 0,
      },
    });

    // Act / Assert
    expect(canBook(FRIDAY, "11:10", ctx).valid).toBe(true);
  });

  it("booking that starts exactly when lunch ends succeeds", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createRecurringLunch({
          psychologistId: psych.id,
          days: [2, 3, 4, 5, 6],
        }),
      ],
    });

    // Act / Assert
    expect(canBook(FRIDAY, "13:00", ctx).valid).toBe(true);
  });

  it("booking that overlaps lunch by one minute fails", () => {
    // Arrange — 50m from 11:11 ends 12:01, overlaps lunch by 1 minute
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createRecurringLunch({
          psychologistId: psych.id,
          days: [2, 3, 4, 5, 6],
        }),
      ],
      service: {
        ...createSchedulingContext().service,
        duration_minutes: 50,
        buffer_minutes: 0,
      },
    });

    // Act / Assert
    expect(canBook(FRIDAY, "11:11", ctx).valid).toBe(false);
    expect(canBook(FRIDAY, "11:11", ctx).reason).toMatch(/blocked time/i);
  });

  it("booking that overlaps another appointment by one minute fails", () => {
    // Arrange — existing 10:00–10:50; new 10:49–11:39 overlaps by 1 minute
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      existingAppointments: [
        createAppointment({
          psychologistId: psych.id,
          date: FRIDAY,
          startTime: "10:00",
          durationMinutes: 50,
        }),
      ],
      service: {
        ...createSchedulingContext().service,
        duration_minutes: 50,
        buffer_minutes: 0,
      },
    });

    // Act / Assert
    expect(canBook(FRIDAY, "10:49", ctx).valid).toBe(false);
    expect(canBook(FRIDAY, "10:50", ctx).valid).toBe(true);
  });
});

describe("Booking — personal time and vacation", () => {
  it("booking during personal time fails", () => {
    // Arrange
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createPersonalTime({
          psychologistId: psych.id,
          date: WEDNESDAY,
          allDay: false,
          startTime: "13:00",
          endTime: "17:00",
        }),
      ],
    });

    // Act / Assert
    expect(canBook(WEDNESDAY, "14:00", ctx).valid).toBe(false);
    expect(canBook(WEDNESDAY, "10:00", ctx).valid).toBe(true);
  });

  it("booking during vacation fails", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id),
      unavailableBlocks: [
        createVacation({
          psychologistId: psych.id,
          date: "2026-07-15",
          endDate: "2026-07-17",
          allDay: true,
        }),
      ],
    });

    // Act / Assert
    expect(canBook(WEDNESDAY, "10:00", ctx).valid).toBe(false);
    expect(canBook(FRIDAY, "10:00", ctx).valid).toBe(false);
    expect(canBook("2026-07-14", "10:00", ctx).valid).toBe(true);
  });
});
