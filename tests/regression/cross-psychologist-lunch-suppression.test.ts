import { describe, expect, it } from "vitest";
import { resolveUnavailableBlocks } from "@/lib/calendar-blocks";
import {
  APRIL,
  GIAN,
  createPersonalTime,
  createPsychologist,
  createRecurringLunch,
  lunchOccurrencesOnDate,
  overridesOnDate,
  weekContaining,
} from "@tests/helpers";

/**
 * Regression: cross-psychologist override must never suppress another
 * psychologist's recurring lunch (findRuleOccurrenceSuppression ownership).
 */
describe("Lunch Break", () => {
  it("does not disappear because another psychologist has Personal Time", () => {
    // Arrange
    const april = createPsychologist({ name: "April Anne Tolentino-Cerezo" });
    const gian = createPsychologist({ name: "Gian Carlo Tolentino" });

    const friday = "2026-07-17";
    const { from, to } = weekContaining(friday);

    const aprilLunch = createRecurringLunch({
      psychologistId: april.id,
      // Tuesday–Saturday 12:00–1:00
      days: [2, 3, 4, 5, 6],
      startTime: "12:00",
      endTime: "13:00",
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

    // Assert
    expect(lunchOccurrencesOnDate(resolved, APRIL, friday)).toHaveLength(1);
    expect(overridesOnDate(resolved, GIAN, friday, "personal")).toHaveLength(1);
    expect(lunchOccurrencesOnDate(resolved, GIAN, friday)).toHaveLength(0);
  });
});
