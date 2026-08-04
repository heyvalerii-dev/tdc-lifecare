import { addDays, addMonths, differenceInCalendarDays, differenceInMinutes, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { clinicDateToUtc, getDayOfWeekInClinic, rangesOverlap } from "@/lib/datetime";
import type {
  BlockRecurrenceEndType,
  BlockRecurrenceType,
  UnavailableBlock,
  UnavailableReason,
} from "@/types/database";

export const CALENDAR_DRAWER_TAB_KEY = "tdc.calendarDrawer.tab";
export const BLOCK_MODE_KEY = "tdc.blockTime.mode";

export type CalendarDrawerTab = "appointment" | "block";

/** Friendlier UI modes; map to layer rule/override. */
export type BlockFormMode = "recurring" | "one_time";

export type BlockLayer = "rule" | "override";

export function blockModeToLayer(mode: BlockFormMode): BlockLayer {
  return mode === "recurring" ? "rule" : "override";
}

export function layerToBlockMode(layer: BlockLayer | null | undefined): BlockFormMode {
  return layer === "rule" ? "recurring" : "one_time";
}

export interface BlockRecurrenceInput {
  type: BlockRecurrenceType;
  interval: number;
  /** Sunday=0 … Saturday=6 */
  days: number[];
  endType: BlockRecurrenceEndType;
  endDate: string | null;
  count: number | null;
}

export interface BlockOccurrenceDraft {
  start_at: string;
  end_at: string;
}

/** Concrete calendar segment after resolving rules vs overrides. */
export interface ResolvedUnavailableBlock {
  id: string;
  /** Source rule/override row id */
  source_id: string;
  psychologist_id: string;
  start_at: string;
  end_at: string;
  reason: UnavailableReason;
  notes: string | null;
  title: string | null;
  layer: BlockLayer;
  recurrence_type: BlockRecurrenceType;
  recurrence_interval: number;
  recurrence_days: number[];
  recurrence_end_type: BlockRecurrenceEndType;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  series_id: string | null;
  /** True when this segment was expanded from a recurring rule. */
  is_occurrence: boolean;
}

const MAX_OCCURRENCES = 520;

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function weekdaySun0(dateStr: string): number {
  return parseDateStr(dateStr).getDay();
}

function occurrenceFor(
  dateStr: string,
  startTime: string,
  endTime: string
): BlockOccurrenceDraft {
  const start = clinicDateToUtc(dateStr, startTime);
  let end = clinicDateToUtc(dateStr, endTime);
  // Overnight same-day pattern (rare): treat end as next day
  if (end <= start) {
    end = clinicDateToUtc(toDateStr(addDays(parseDateStr(dateStr), 1)), endTime);
  }
  return { start_at: start.toISOString(), end_at: end.toISOString() };
}

function withinEnd(
  dateStr: string,
  countSoFar: number,
  recurrence: BlockRecurrenceInput
): boolean {
  if (recurrence.endType === "on_date" && recurrence.endDate) {
    return dateStr <= recurrence.endDate;
  }
  if (recurrence.endType === "after_count" && recurrence.count != null) {
    return countSoFar < recurrence.count;
  }
  return true;
}

function recurrenceFromBlock(block: UnavailableBlock): BlockRecurrenceInput {
  return {
    type: block.recurrence_type || "none",
    interval: block.recurrence_interval || 1,
    days: Array.isArray(block.recurrence_days) ? block.recurrence_days : [],
    endType: block.recurrence_end_type || "never",
    endDate: block.recurrence_end_date,
    count: block.recurrence_count,
  };
}

/**
 * Expand a block definition into concrete start/end ISO occurrences.
 * Uses start/end clock times (not duration).
 */
export function expandBlockOccurrences(args: {
  date: string;
  startTime: string;
  endTime: string;
  recurrence: BlockRecurrenceInput;
  /** Optional inclusive range clamp for calendar windows. */
  rangeStart?: string;
  rangeEnd?: string;
}): BlockOccurrenceDraft[] {
  const { date, startTime, endTime, recurrence, rangeStart, rangeEnd } = args;

  if (recurrence.type === "none") {
    return [occurrenceFor(date, startTime, endTime)];
  }

  const results: BlockOccurrenceDraft[] = [];
  const start = parseDateStr(date);
  const horizon = rangeEnd
    ? parseDateStr(rangeEnd)
    : addMonths(start, 24);
  const anchorWeekday = weekdaySun0(date);
  const customDays =
    recurrence.days.length > 0 ? recurrence.days : [anchorWeekday];

  let cursor = rangeStart ? parseDateStr(rangeStart) : start;
  if (cursor < start) cursor = start;

  while (cursor <= horizon && results.length < MAX_OCCURRENCES) {
    const dateStr = toDateStr(cursor);
    if (!withinEnd(dateStr, results.length, recurrence)) break;

    let include = false;

    if (recurrence.type === "daily") {
      include = true;
    } else if (recurrence.type === "weekday") {
      const wd = cursor.getDay();
      include = wd >= 1 && wd <= 5;
    } else if (recurrence.type === "weekly") {
      const daysFromStart = Math.round(
        (cursor.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
      );
      include =
        cursor.getDay() === anchorWeekday &&
        daysFromStart % (7 * Math.max(1, recurrence.interval)) === 0;
    } else if (recurrence.type === "monthly") {
      const monthDiff =
        (cursor.getFullYear() - start.getFullYear()) * 12 +
        (cursor.getMonth() - start.getMonth());
      include =
        cursor.getDate() === start.getDate() &&
        monthDiff % Math.max(1, recurrence.interval) === 0;
    } else if (recurrence.type === "custom") {
      const daysFromStart = Math.round(
        (cursor.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
      );
      const weekIndex = Math.floor(daysFromStart / 7);
      include =
        customDays.includes(cursor.getDay()) &&
        weekIndex % Math.max(1, recurrence.interval) === 0;
    }

    if (include) {
      results.push(occurrenceFor(dateStr, startTime, endTime));
    }

    cursor = addDays(cursor, 1);
  }

  if (results.length === 0 && !rangeStart) {
    return [occurrenceFor(date, startTime, endTime)];
  }

  return results;
}

export function expandRuleToOccurrences(
  rule: UnavailableBlock,
  rangeStart: string,
  rangeEnd: string
): BlockOccurrenceDraft[] {
  const startTime = formatInTimeZone(rule.start_at, CLINIC_TIMEZONE, "HH:mm");
  const endTime = formatInTimeZone(rule.end_at, CLINIC_TIMEZONE, "HH:mm");
  const anchorDate = formatInTimeZone(rule.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");

  return expandBlockOccurrences({
    date: anchorDate,
    startTime,
    endTime,
    recurrence: recurrenceFromBlock(rule),
    rangeStart,
    rangeEnd,
  });
}

function toResolved(
  source: UnavailableBlock,
  occ: BlockOccurrenceDraft,
  isOccurrence: boolean
): ResolvedUnavailableBlock {
  return {
    id: isOccurrence ? `${source.id}:${occ.start_at}` : source.id,
    source_id: source.id,
    psychologist_id: source.psychologist_id,
    start_at: occ.start_at,
    end_at: occ.end_at,
    reason: source.reason,
    notes: source.notes,
    title: source.title,
    layer: (source.layer as BlockLayer) || "override",
    recurrence_type: source.recurrence_type,
    recurrence_interval: source.recurrence_interval,
    recurrence_days: source.recurrence_days,
    recurrence_end_type: source.recurrence_end_type,
    recurrence_end_date: source.recurrence_end_date,
    recurrence_count: source.recurrence_count,
    series_id: source.series_id,
    is_occurrence: isOccurrence,
  };
}

function getRangeBounds(rangeStart: string, rangeEnd: string) {
  const rangeStartIso = clinicDateToUtc(rangeStart, "00:00").toISOString();
  const rangeEndExclusive = clinicDateToUtc(
    toDateStr(addDays(parseDateStr(rangeEnd), 1)),
    "00:00"
  ).toISOString();
  return { rangeStartIso, rangeEndExclusive };
}

export function getResolveUnavailableRangeBounds(
  rangeStart: string,
  rangeEnd: string
) {
  return getRangeBounds(rangeStart, rangeEnd);
}

export type RuleOccurrenceSuppression =
  | {
      kind: "suppresses_rule_id";
      override: UnavailableBlock;
      occurrenceDate: string;
      overrideStartDate: string;
      overrideEndDate: string;
    }
  | {
      kind: "time_overlap";
      override: UnavailableBlock;
      occurrenceStart: string;
      occurrenceEnd: string;
      overrideStart: string;
      overrideEnd: string;
    };

/**
 * Returns the first override that suppresses a rule occurrence, or null if kept.
 * Only overrides belonging to the same psychologist as the rule are considered.
 */
export function findRuleOccurrenceSuppression(
  rule: UnavailableBlock,
  occ: BlockOccurrenceDraft,
  overrides: UnavailableBlock[],
  rangeStartIso: string,
  rangeEndExclusive: string
): RuleOccurrenceSuppression | null {
  const occStart = parseISO(occ.start_at);
  const occEnd = parseISO(occ.end_at);
  const occDate = formatInTimeZone(occ.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");

  for (const override of overrides) {
    if (override.psychologist_id !== rule.psychologist_id) {
      continue;
    }

    if (
      override.end_at <= rangeStartIso ||
      override.start_at >= rangeEndExclusive
    ) {
      continue;
    }

    if (override.suppresses_rule_id === rule.id) {
      const overrideStartDate = formatInTimeZone(
        override.start_at,
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      const overrideEndDate = formatInTimeZone(
        new Date(parseISO(override.end_at).getTime() - 1),
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      if (occDate >= overrideStartDate && occDate <= overrideEndDate) {
        return {
          kind: "suppresses_rule_id",
          override,
          occurrenceDate: occDate,
          overrideStartDate,
          overrideEndDate,
        };
      }
      continue;
    }

    if (
      rangesOverlap(
        occStart,
        occEnd,
        parseISO(override.start_at),
        parseISO(override.end_at)
      )
    ) {
      return {
        kind: "time_overlap",
        override,
        occurrenceStart: occ.start_at,
        occurrenceEnd: occ.end_at,
        overrideStart: override.start_at,
        overrideEnd: override.end_at,
      };
    }
  }

  return null;
}

/**
 * Resolve unavailable time for a date window.
 * Overrides suppress overlapping rule occurrences (and linked rules via
 * suppresses_rule_id) without conflict errors.
 */
export function resolveUnavailableBlocks(
  blocks: UnavailableBlock[],
  rangeStart: string,
  rangeEnd: string
): ResolvedUnavailableBlock[] {
  const { rangeStartIso, rangeEndExclusive } = getRangeBounds(
    rangeStart,
    rangeEnd
  );

  const overrides = blocks.filter(
    (b) => (b.layer || "override") === "override"
  );
  const rules = blocks.filter((b) => b.layer === "rule");

  const resolvedOverrides: ResolvedUnavailableBlock[] = [];
  for (const override of overrides) {
    if (
      override.end_at <= rangeStartIso ||
      override.start_at >= rangeEndExclusive
    ) {
      continue;
    }
    resolvedOverrides.push(
      toResolved(
        override,
        { start_at: override.start_at, end_at: override.end_at },
        false
      )
    );
  }

  const resolvedRules: ResolvedUnavailableBlock[] = [];
  for (const rule of rules) {
    const occurrences = expandRuleToOccurrences(rule, rangeStart, rangeEnd);
    for (const occ of occurrences) {
      const suppression = findRuleOccurrenceSuppression(
        rule,
        occ,
        overrides,
        rangeStartIso,
        rangeEndExclusive
      );
      if (suppression) continue;
      resolvedRules.push(toResolved(rule, occ, true));
    }
  }

  return [...resolvedOverrides, ...resolvedRules].sort((a, b) =>
    a.start_at.localeCompare(b.start_at)
  );
}

/**
 * Clip a (possibly multi-day) block to a single clinic date for calendar layout.
 * Returns null when the block does not intersect that day.
 */
export function clipBlockToClinicDate(
  startAtIso: string,
  endAtIso: string,
  dateStr: string
): { start_at: string; end_at: string } | null {
  const dayStart = clinicDateToUtc(dateStr, "00:00");
  const dayEnd = clinicDateToUtc(toDateStr(addDays(parseDateStr(dateStr), 1)), "00:00");
  const start = parseISO(startAtIso);
  const end = parseISO(endAtIso);

  const clippedStart = start > dayStart ? start : dayStart;
  const clippedEnd = end < dayEnd ? end : dayEnd;
  if (clippedStart >= clippedEnd) return null;

  return {
    start_at: clippedStart.toISOString(),
    end_at: clippedEnd.toISOString(),
  };
}

export function blockDisplayTitle(
  reason: UnavailableReason | string,
  title: string | null | undefined,
  labels: Record<string, string>
): string {
  if (reason === "other" && title?.trim()) return title.trim();
  return labels[reason] ?? "Blocked";
}

export type MultiDaySegmentKind = "single" | "start" | "middle" | "end";

/** Where this calendar day sits inside a (possibly multi-day) block. */
export function getMultiDaySegmentKind(
  startAtIso: string,
  endAtIso: string,
  dateStr: string
): MultiDaySegmentKind {
  const startDate = formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const endDate = formatInTimeZone(
    new Date(parseISO(endAtIso).getTime() - 1),
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );
  if (startDate === endDate) return "single";
  if (dateStr === startDate) return "start";
  if (dateStr === endDate) return "end";
  return "middle";
}

export function multiDaySegmentLabel(
  title: string,
  kind: MultiDaySegmentKind
): string {
  if (kind === "middle") return `${title} (continues)`;
  if (kind === "end") return `${title} (ends)`;
  return title;
}

/** Inclusive clinic calendar days covered by a block range. */
export function countBlockClinicDays(
  startAtIso: string,
  endAtIso: string
): number {
  const startDate = formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const endDate = formatInTimeZone(
    new Date(parseISO(endAtIso).getTime() - 1),
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );
  const start = parseDateStr(startDate);
  const end = parseDateStr(endDate);
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
}

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatBlockRecurrenceLabel(block: {
  recurrence_type: string | null | undefined;
  recurrence_interval?: number | null;
  recurrence_days?: number[] | null;
  series_id?: string | null;
  layer?: string | null;
  start_at: string;
}): string | null {
  const type = block.recurrence_type || "none";
  if (type === "none" && block.layer !== "rule") return null;

  if (type === "daily") return "Daily";
  if (type === "weekday") return "Weekdays";
  if (type === "monthly") {
    const interval = Math.max(1, block.recurrence_interval ?? 1);
    return interval === 1 ? "Every month" : `Every ${interval} months`;
  }
  if (type === "weekly") {
    const day = parseDateWeekday(block.start_at);
    return day != null ? `Weekly · ${WEEKDAY_LABELS[day]}` : "Weekly";
  }
  if (type === "custom") {
    const days = (block.recurrence_days ?? []).filter((d) => d >= 0 && d <= 6);
    const interval = Math.max(1, block.recurrence_interval ?? 1);
    if (days.length === 1) {
      const label = `Every ${WEEKDAY_LABELS[days[0]]}`;
      return interval === 1
        ? label
        : `Every ${interval} weeks on ${WEEKDAY_LABELS[days[0]]}`;
    }
    if (days.length > 1) {
      const names = days
        .slice()
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((d) => WEEKDAY_LABELS[d].slice(0, 3))
        .join(", ");
      return interval === 1
        ? `Every ${names}`
        : `Every ${interval} weeks (${names})`;
    }
    return "Custom";
  }

  if (block.layer === "rule" || block.series_id) return "Every week";
  return null;
}

function parseDateWeekday(iso: string): number | null {
  try {
    return getDayOfWeekInClinic(iso);
  } catch {
    return null;
  }
}

/** Minutes between two HH:mm times on the same day (handles overnight). */
export function minutesBetweenHhmm(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

export function inferLayer(recurrenceType: BlockRecurrenceType): BlockLayer {
  return recurrenceType === "none" ? "override" : "rule";
}

/** Duration helper for UI labels from ISO range. */
export function formatIsoDuration(startAt: string, endAt: string): string {
  const mins = Math.max(1, differenceInMinutes(parseISO(endAt), parseISO(startAt)));
  if (mins < 60) return `${mins} minutes`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${rem}m`;
}
