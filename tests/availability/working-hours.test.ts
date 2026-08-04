import { describe, expect, it } from "vitest";
import {
  canBook,
  createAppointment,
  createAvailability,
  createPsychologist,
  createSchedulingContext,
  createWeekdayAvailability,
  getSlots,
} from "@tests/helpers";

const FRIDAY = "2026-07-17";
const SATURDAY = "2026-07-18";

describe("Availability — working hours changes", () => {
  it("changing working hours only affects future bookings (new slot offers)", () => {
    // Arrange — morning hours removed from availability
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const morningCtx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id, {
        startTime: "09:00:00",
        endTime: "17:00:00",
      }),
    });
    const afternoonOnlyCtx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id, {
        startTime: "13:00:00",
        endTime: "17:00:00",
      }),
    });

    // Act / Assert
    expect(canBook(FRIDAY, "10:00", morningCtx).valid).toBe(true);
    expect(canBook(FRIDAY, "10:00", afternoonOnlyCtx).valid).toBe(false);
    expect(canBook(FRIDAY, "14:00", afternoonOnlyCtx).valid).toBe(true);
  });

  it("existing appointments remain valid after availability changes", () => {
    // Arrange — appointment was booked at 10:00 under old hours; hours later shrink
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const existing = createAppointment({
      psychologistId: psych.id,
      date: FRIDAY,
      startTime: "10:00",
      durationMinutes: 50,
    });

    const afterChangeCtx = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id, {
        startTime: "13:00:00",
        endTime: "17:00:00",
      }),
      existingAppointments: [existing],
    });

    // Act / Assert — historical appointment record is unchanged; new bookings at 10:00 fail
    expect(existing.start_at).toContain("T"); // still present as a booked session
    expect(existing.status).toBe("confirmed");
    expect(canBook(FRIDAY, "10:00", afterChangeCtx).valid).toBe(false);
    // 10:00 is not re-offered as an open slot
    expect(
      getSlots(FRIDAY, afterChangeCtx).some(
        (s) => s.start.getTime() === new Date(existing.start_at).getTime()
      )
    ).toBe(false);
  });

  it("disabling a weekday prevents future bookings", () => {
    // Arrange — Friday removed from active availability
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const withoutFriday = createWeekdayAvailability(psych.id).filter(
      (b) => b.day_of_week !== 5
    );
    const ctx = createSchedulingContext({
      availabilityBlocks: withoutFriday,
    });

    // Act / Assert
    expect(canBook(FRIDAY, "10:00", ctx).valid).toBe(false);
    expect(getSlots(FRIDAY, ctx)).toHaveLength(0);
    expect(canBook("2026-07-16", "10:00", ctx).valid).toBe(true); // Thursday
  });

  it("re-enabling a weekday allows bookings again", () => {
    // Arrange
    const psych = createPsychologist({ name: "Gian Carlo Tolentino" });
    const disabled = createSchedulingContext({
      availabilityBlocks: createWeekdayAvailability(psych.id).filter(
        (b) => b.day_of_week !== 5
      ),
    });
    const reenabled = createSchedulingContext({
      availabilityBlocks: [
        ...disabled.availabilityBlocks,
        createAvailability({
          psychologist_id: psych.id,
          day_of_week: 5,
          start_time: "09:00:00",
          end_time: "17:00:00",
          is_active: true,
        }),
      ],
    });

    // Act / Assert
    expect(canBook(FRIDAY, "10:00", disabled).valid).toBe(false);
    expect(canBook(FRIDAY, "10:00", reenabled).valid).toBe(true);
  });

  it("inactive availability rows do not offer slots", () => {
    // Arrange
    const psych = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const ctx = createSchedulingContext({
      availabilityBlocks: [
        createAvailability({
          psychologist_id: psych.id,
          day_of_week: 6, // Saturday
          start_time: "09:00:00",
          end_time: "12:00:00",
          is_active: false,
        }),
      ],
    });

    // Act / Assert
    expect(canBook(SATURDAY, "10:00", ctx).valid).toBe(false);
    expect(getSlots(SATURDAY, ctx)).toHaveLength(0);
  });
});
