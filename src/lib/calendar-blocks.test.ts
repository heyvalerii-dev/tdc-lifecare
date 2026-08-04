import { addDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { describe, expect, it } from "vitest";
import {
  expandRuleToOccurrences,
  findRuleOccurrenceSuppression,
  getResolveUnavailableRangeBounds,
  resolveUnavailableBlocks,
  type ResolvedUnavailableBlock,
} from "@/lib/calendar-blocks";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { clinicDateToUtc } from "@/lib/datetime";
import type { UnavailableBlock } from "@/types/database";

const APRIL = "a0000000-0000-0000-0000-000000000002";
const GIAN = "a0000000-0000-0000-0000-000000000001";
const TARGET_DATE = "2026-07-17";
const RANGE_START = "2026-07-14";
const RANGE_END = "2026-07-18";

function nextClinicDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = addDays(new Date(y, m - 1, d), 1);
  return format(next, "yyyy-MM-dd");
}

function block(
  overrides: Partial<UnavailableBlock> & Pick<UnavailableBlock, "id">
): UnavailableBlock {
  return {
    psychologist_id: APRIL,
    start_at: clinicDateToUtc(TARGET_DATE, "00:00").toISOString(),
    end_at: clinicDateToUtc(nextClinicDate(TARGET_DATE), "00:00").toISOString(),
    reason: "personal",
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

function lunchRule(
  id: string,
  psychologistId: string
): UnavailableBlock {
  return block({
    id,
    psychologist_id: psychologistId,
    layer: "rule",
    reason: "lunch_break",
    start_at: clinicDateToUtc("2026-01-01", "12:00").toISOString(),
    end_at: clinicDateToUtc("2026-01-01", "13:00").toISOString(),
    recurrence_type: "weekday",
  });
}

function allDayOverride(
  id: string,
  psychologistId: string,
  date: string = TARGET_DATE,
  reason: UnavailableBlock["reason"] = "personal",
  extra: Partial<UnavailableBlock> = {}
): UnavailableBlock {
  return block({
    id,
    psychologist_id: psychologistId,
    layer: "override",
    reason,
    all_day: true,
    start_at: clinicDateToUtc(date, "00:00").toISOString(),
    end_at: clinicDateToUtc(nextClinicDate(date), "00:00").toISOString(),
    ...extra,
  });
}

function clinicDate(iso: string): string {
  return formatInTimeZone(iso, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

function lunchOccurrencesOnDate(
  resolved: ResolvedUnavailableBlock[],
  psychologistId: string,
  date: string
): ResolvedUnavailableBlock[] {
  return resolved.filter(
    (row) =>
      row.psychologist_id === psychologistId &&
      row.reason === "lunch_break" &&
      row.is_occurrence &&
      clinicDate(row.start_at) === date
  );
}

function overridesOnDate(
  resolved: ResolvedUnavailableBlock[],
  psychologistId: string,
  date: string,
  reason?: UnavailableBlock["reason"]
): ResolvedUnavailableBlock[] {
  return resolved.filter(
    (row) =>
      row.psychologist_id === psychologistId &&
      !row.is_occurrence &&
      clinicDate(row.start_at) === date &&
      (reason ? row.reason === reason : true)
  );
}

function resolve(blocks: UnavailableBlock[]) {
  return resolveUnavailableBlocks(blocks, RANGE_START, RANGE_END);
}

describe("findRuleOccurrenceSuppression psychologist ownership", () => {
  const aprilLunch = lunchRule("april-lunch", APRIL);
  const { rangeStartIso, rangeEndExclusive } = getResolveUnavailableRangeBounds(
    RANGE_START,
    RANGE_END
  );
  const jul17Occ = expandRuleToOccurrences(aprilLunch, RANGE_START, RANGE_END).find(
    (occ) => clinicDate(occ.start_at) === TARGET_DATE
  );

  it("returns null when only a different psychologist override overlaps", () => {
    expect(jul17Occ).toBeDefined();
    const gianPersonal = allDayOverride("gian-personal", GIAN);

    const suppression = findRuleOccurrenceSuppression(
      aprilLunch,
      jul17Occ!,
      [gianPersonal],
      rangeStartIso,
      rangeEndExclusive
    );

    expect(suppression).toBeNull();
  });

  it("matches time_overlap only for the same psychologist", () => {
    expect(jul17Occ).toBeDefined();
    const aprilPersonal = allDayOverride("april-personal", APRIL);

    const suppression = findRuleOccurrenceSuppression(
      aprilLunch,
      jul17Occ!,
      [aprilPersonal],
      rangeStartIso,
      rangeEndExclusive
    );

    expect(suppression?.kind).toBe("time_overlap");
    expect(suppression?.override.id).toBe("april-personal");
  });

  it("does not match suppresses_rule_id when psychologist differs", () => {
    expect(jul17Occ).toBeDefined();
    const gianLinkedOverride = allDayOverride("gian-linked", GIAN, TARGET_DATE, "vacation", {
      suppresses_rule_id: aprilLunch.id,
    });

    const suppression = findRuleOccurrenceSuppression(
      aprilLunch,
      jul17Occ!,
      [gianLinkedOverride],
      rangeStartIso,
      rangeEndExclusive
    );

    expect(suppression).toBeNull();
  });

  it("matches suppresses_rule_id for the same psychologist", () => {
    expect(jul17Occ).toBeDefined();
    const aprilLinkedOverride = allDayOverride("april-linked", APRIL, TARGET_DATE, "vacation", {
      suppresses_rule_id: aprilLunch.id,
    });

    const suppression = findRuleOccurrenceSuppression(
      aprilLunch,
      jul17Occ!,
      [aprilLinkedOverride],
      rangeStartIso,
      rangeEndExclusive
    );

    expect(suppression?.kind).toBe("suppresses_rule_id");
    expect(suppression?.override.id).toBe("april-linked");
  });
});

describe("resolveUnavailableBlocks cross-psychologist suppression", () => {
  it("scenario 1 — different psychologist override does not suppress April lunch", () => {
    const blocks = [
      lunchRule("april-lunch", APRIL),
      allDayOverride("gian-personal", GIAN),
    ];
    const resolved = resolve(blocks);

    expect(lunchOccurrencesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(1);
    expect(overridesOnDate(resolved, GIAN, TARGET_DATE, "personal")).toHaveLength(1);
    expect(lunchOccurrencesOnDate(resolved, GIAN, TARGET_DATE)).toHaveLength(0);
  });

  it("scenario 2 — same psychologist override suppresses lunch and renders personal time", () => {
    const blocks = [
      lunchRule("april-lunch", APRIL),
      allDayOverride("april-personal", APRIL),
    ];
    const resolved = resolve(blocks);

    expect(lunchOccurrencesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(0);
    expect(overridesOnDate(resolved, APRIL, TARGET_DATE, "personal")).toHaveLength(1);
  });

  it("scenario 3 — vacation only affects the owner", () => {
    const blocks = [
      lunchRule("april-lunch", APRIL),
      lunchRule("gian-lunch", GIAN),
      allDayOverride("april-vacation", APRIL, TARGET_DATE, "vacation"),
    ];
    const resolved = resolve(blocks);

    expect(lunchOccurrencesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(0);
    expect(lunchOccurrencesOnDate(resolved, GIAN, TARGET_DATE)).toHaveLength(1);
    expect(overridesOnDate(resolved, APRIL, TARGET_DATE, "vacation")).toHaveLength(1);
  });

  it("scenario 4 — other psychologist unaffected when only Gian has personal time", () => {
    const blocks = [
      lunchRule("april-lunch", APRIL),
      lunchRule("gian-lunch", GIAN),
      allDayOverride("gian-personal", GIAN),
    ];
    const resolved = resolve(blocks);

    expect(lunchOccurrencesOnDate(resolved, GIAN, TARGET_DATE)).toHaveLength(0);
    expect(lunchOccurrencesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(1);
    expect(overridesOnDate(resolved, GIAN, TARGET_DATE, "personal")).toHaveLength(1);
    expect(overridesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(0);
  });

  it("scenario 5 — both psychologists unavailable independently", () => {
    const blocks = [
      lunchRule("april-lunch", APRIL),
      lunchRule("gian-lunch", GIAN),
      allDayOverride("april-personal", APRIL),
      allDayOverride("gian-personal", GIAN),
    ];
    const resolved = resolve(blocks);

    expect(lunchOccurrencesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(0);
    expect(lunchOccurrencesOnDate(resolved, GIAN, TARGET_DATE)).toHaveLength(0);
    expect(overridesOnDate(resolved, APRIL, TARGET_DATE, "personal")).toHaveLength(1);
    expect(overridesOnDate(resolved, GIAN, TARGET_DATE, "personal")).toHaveLength(1);

    const aprilRows = resolved.filter((row) => row.psychologist_id === APRIL);
    const gianRows = resolved.filter((row) => row.psychologist_id === GIAN);
    expect(aprilRows.every((row) => row.psychologist_id === APRIL)).toBe(true);
    expect(gianRows.every((row) => row.psychologist_id === GIAN)).toBe(true);
  });

  it("scenario 6 — suppresses_rule_id respects psychologist ownership in resolution", () => {
    const aprilLunch = lunchRule("april-lunch", APRIL);
    const gianLunch = lunchRule("gian-lunch", GIAN);

    const blocks = [
      aprilLunch,
      gianLunch,
      // Gian links to April's rule id but must not suppress April's lunch (psych mismatch).
      // Timed 9–10 so it also does not time-overlap either psychologist's lunch.
      block({
        id: "gian-cross-link",
        psychologist_id: GIAN,
        layer: "override",
        reason: "vacation",
        start_at: clinicDateToUtc(TARGET_DATE, "09:00").toISOString(),
        end_at: clinicDateToUtc(TARGET_DATE, "10:00").toISOString(),
        suppresses_rule_id: aprilLunch.id,
      }),
      allDayOverride("april-linked", APRIL, TARGET_DATE, "vacation", {
        suppresses_rule_id: aprilLunch.id,
      }),
    ];
    const resolved = resolve(blocks);

    expect(lunchOccurrencesOnDate(resolved, APRIL, TARGET_DATE)).toHaveLength(0);
    expect(lunchOccurrencesOnDate(resolved, GIAN, TARGET_DATE)).toHaveLength(1);
    expect(overridesOnDate(resolved, APRIL, TARGET_DATE, "vacation")).toHaveLength(1);
    expect(overridesOnDate(resolved, GIAN, TARGET_DATE, "vacation")).toHaveLength(1);
  });
});
