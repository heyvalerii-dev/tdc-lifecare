import { describe, expect, it } from "vitest";
import {
  formatUnavailableBlockSchedule,
  getUpcomingUnavailableOverrides,
  isUnavailableOverride,
  unavailableBlockTitle,
} from "@/lib/unavailable-blocks-display";
import { clinicDateToUtc } from "@/lib/datetime";
import type { UnavailableBlock } from "@/types/database";

function block(
  overrides: Partial<UnavailableBlock> & Pick<UnavailableBlock, "id">
): UnavailableBlock {
  return {
    psychologist_id: "psych-1",
    start_at: clinicDateToUtc("2026-07-17", "00:00").toISOString(),
    end_at: clinicDateToUtc("2026-07-18", "00:00").toISOString(),
    reason: "vacation",
    notes: null,
    title: null,
    layer: "override",
    series_id: null,
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_days: [],
    recurrence_end_type: "never",
    recurrence_end_date: null,
    recurrence_count: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("isUnavailableOverride", () => {
  it("includes layer override and legacy null layer", () => {
    expect(isUnavailableOverride(block({ id: "a", layer: "override" }))).toBe(
      true
    );
    expect(isUnavailableOverride(block({ id: "b", layer: undefined }))).toBe(
      true
    );
  });

  it("excludes recurring rules", () => {
    expect(
      isUnavailableOverride(
        block({ id: "c", layer: "rule", reason: "lunch_break" })
      )
    ).toBe(false);
  });
});

describe("getUpcomingUnavailableOverrides", () => {
  it("puts nearest upcoming first, then recent past, and excludes rules", () => {
    const now = new Date("2026-07-17T04:00:00.000Z");
    const rows = [
      block({
        id: "past",
        start_at: clinicDateToUtc("2026-07-15", "09:00").toISOString(),
        end_at: clinicDateToUtc("2026-07-15", "10:00").toISOString(),
      }),
      block({
        id: "future-b",
        start_at: clinicDateToUtc("2026-07-20", "09:00").toISOString(),
        end_at: clinicDateToUtc("2026-07-20", "10:00").toISOString(),
      }),
      block({
        id: "future-a",
        start_at: clinicDateToUtc("2026-07-18", "09:00").toISOString(),
        end_at: clinicDateToUtc("2026-07-18", "10:00").toISOString(),
      }),
      block({
        id: "rule",
        layer: "rule",
        reason: "lunch_break",
        start_at: clinicDateToUtc("2026-07-19", "12:00").toISOString(),
        end_at: clinicDateToUtc("2026-07-19", "13:00").toISOString(),
      }),
    ];

    const upcoming = getUpcomingUnavailableOverrides(rows, now);
    expect(upcoming.map((row) => row.id)).toEqual([
      "future-a",
      "future-b",
      "past",
    ]);
  });

  it("keeps recent past overrides that the calendar still shows in recent weeks", () => {
    const now = new Date("2026-07-22T02:00:00.000Z");
    const rows = [
      block({
        id: "gian-personal",
        reason: "personal",
        all_day: true,
        start_at: clinicDateToUtc("2026-07-17", "00:00").toISOString(),
        end_at: clinicDateToUtc("2026-07-19", "00:00").toISOString(),
      }),
      block({
        id: "old",
        start_at: clinicDateToUtc("2025-01-01", "09:00").toISOString(),
        end_at: clinicDateToUtc("2025-01-01", "10:00").toISOString(),
      }),
      block({
        id: "april-lunch",
        layer: "rule",
        reason: "lunch_break",
        start_at: clinicDateToUtc("2026-07-08", "12:00").toISOString(),
        end_at: clinicDateToUtc("2026-07-08", "13:00").toISOString(),
      }),
    ];

    const upcoming = getUpcomingUnavailableOverrides(rows, now);
    expect(upcoming.map((row) => row.id)).toEqual(["gian-personal"]);
  });
});

describe("formatUnavailableBlockSchedule", () => {
  it("formats all-day multi-day ranges", () => {
    const row = block({
      id: "vacation",
      all_day: true,
      start_at: clinicDateToUtc("2026-07-17", "00:00").toISOString(),
      end_at: clinicDateToUtc("2026-07-19", "00:00").toISOString(),
    });

    expect(formatUnavailableBlockSchedule(row)).toBe("Jul 17–18 • All Day");
  });

  it("formats timed single-day ranges", () => {
    const row = block({
      id: "personal",
      reason: "personal",
      start_at: clinicDateToUtc("2026-07-23", "14:00").toISOString(),
      end_at: clinicDateToUtc("2026-07-23", "17:00").toISOString(),
    });

    expect(formatUnavailableBlockSchedule(row)).toMatch(/Jul 23 • .*–.*/);
  });
});

describe("unavailableBlockTitle", () => {
  it("title-cases custom Other titles", () => {
    expect(
      unavailableBlockTitle(
        block({ id: "x", reason: "other", title: "wife request" })
      )
    ).toBe("Wife Request");
  });

  it("keeps standard reason labels unchanged", () => {
    expect(
      unavailableBlockTitle(block({ id: "y", reason: "personal", title: null }))
    ).toBe("Personal Time");
  });
});
