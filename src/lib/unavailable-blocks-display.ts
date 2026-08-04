import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { blockDisplayTitle } from "@/lib/calendar-blocks";
import { CLINIC_TIMEZONE, UNAVAILABLE_REASON_LABELS } from "@/lib/constants";
import {
  clinicDateToUtc,
  formatClinicDate,
  formatClinicTime,
} from "@/lib/datetime";
import type { UnavailableBlock } from "@/types/database";

/** How far back past one-time overrides still appear on the profile preview. */
export const UNAVAILABLE_OVERRIDE_LOOKBACK_DAYS = 90;

function inclusiveEndInstant(endAtIso: string): Date {
  return new Date(parseISO(endAtIso).getTime() - 1);
}

/** e.g. Jul 17–18 or Jul 31–Aug 2 */
function formatUnavailableBlockDateRange(
  startAtIso: string,
  endAtIso: string
): string {
  const endInstant = inclusiveEndInstant(endAtIso);
  const startMonth = formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "MMM");
  const endMonth = formatInTimeZone(endInstant, CLINIC_TIMEZONE, "MMM");

  if (startMonth === endMonth) {
    const startDay = formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "d");
    const endDay = formatInTimeZone(endInstant, CLINIC_TIMEZONE, "d");
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${formatClinicDate(startAtIso, "MMM d")}–${formatClinicDate(endInstant, "MMM d")}`;
}

/** Title-case a freeform block title ("wife request" → "Wife Request"). */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.length === 0
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

/** One-time / date-specific blocks only — not recurring availability rules. */
export function isUnavailableOverride(block: UnavailableBlock): boolean {
  return (block.layer ?? "override") === "override";
}

/**
 * Profile preview list: one-time overrides that are still relevant.
 *
 * Sorted with active/upcoming first (ascending by start), then recent past.
 * Nearest upcoming block appears first.
 *
 * Excludes recurring `layer: "rule"` rows (e.g. weekly lunch).
 */
export function getUpcomingUnavailableOverrides(
  blocks: UnavailableBlock[],
  now: Date = new Date()
): UnavailableBlock[] {
  const clinicToday = formatInTimeZone(now, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const todayStartMs = clinicDateToUtc(clinicToday, "00:00").getTime();
  const lookbackStartMs =
    todayStartMs - UNAVAILABLE_OVERRIDE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const relevant = blocks
    .filter(isUnavailableOverride)
    .filter((block) => parseISO(block.end_at).getTime() > lookbackStartMs);

  const byStartAsc = (a: UnavailableBlock, b: UnavailableBlock) =>
    parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime();

  const upcoming = relevant
    .filter((block) => parseISO(block.end_at).getTime() > todayStartMs)
    .sort(byStartAsc);

  const recentPast = relevant
    .filter((block) => parseISO(block.end_at).getTime() <= todayStartMs)
    .sort(byStartAsc);

  return [...upcoming, ...recentPast];
}

export function unavailableBlockTitle(block: UnavailableBlock): string {
  if (block.reason === "other" && block.title?.trim()) {
    return toTitleCase(block.title);
  }
  return blockDisplayTitle(block.reason, block.title, UNAVAILABLE_REASON_LABELS);
}

/** e.g. "Jul 17–18 • All Day" or "Jul 23 • 2:00 PM–5:00 PM" */
export function formatUnavailableBlockSchedule(block: UnavailableBlock): string {
  const startDate = formatInTimeZone(
    block.start_at,
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );
  const endDate = formatInTimeZone(
    inclusiveEndInstant(block.end_at),
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );

  const datePart =
    startDate === endDate
      ? formatClinicDate(block.start_at, "MMM d")
      : formatUnavailableBlockDateRange(block.start_at, block.end_at);

  if (block.all_day) {
    return `${datePart} • All Day`;
  }

  return `${datePart} • ${formatClinicTime(block.start_at)}–${formatClinicTime(block.end_at)}`;
}
