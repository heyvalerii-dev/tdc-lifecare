import type {
  UnavailableBlock,
  UnavailableReason,
} from "@/types/database";
import { clinicIso, nextClinicDate } from "./dates";
import { nextId } from "./ids";

function baseBlock(
  overrides: Partial<UnavailableBlock> &
    Pick<UnavailableBlock, "psychologist_id" | "start_at" | "end_at" | "reason">
): UnavailableBlock {
  return {
    id: nextId("block"),
    notes: null,
    title: null,
    layer: "override",
    all_day: false,
    suppresses_rule_id: null,
    series_id: null,
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_days: [],
    recurrence_end_type: "never",
    recurrence_end_date: null,
    recurrence_count: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Recurring lunch rule. Default: weekdays (Mon–Fri) 12:00–13:00.
 * Pass recurrence_type: "custom" + recurrence_days for Tue–Sat etc.
 */
export function createRecurringLunch(options: {
  psychologistId: string;
  /** Anchor date for clock times (rule template). Default 2026-01-01. */
  anchorDate?: string;
  startTime?: string;
  endTime?: string;
  /**
   * Sunday=0 … Saturday=6.
   * Default weekday Mon–Fri. Example Tue–Sat: [2, 3, 4, 5, 6]
   */
  days?: number[];
  id?: string;
}): UnavailableBlock {
  const anchor = options.anchorDate ?? "2026-01-01";
  const startTime = options.startTime ?? "12:00";
  const endTime = options.endTime ?? "13:00";
  const days = options.days;
  const useCustomDays = Array.isArray(days) && days.length > 0;

  return baseBlock({
    id: options.id ?? nextId("lunch"),
    psychologist_id: options.psychologistId,
    reason: "lunch_break",
    layer: "rule",
    start_at: clinicIso(anchor, startTime),
    end_at: clinicIso(anchor, endTime),
    recurrence_type: useCustomDays ? "custom" : "weekday",
    recurrence_days: useCustomDays ? days! : [],
    recurrence_interval: 1,
    recurrence_end_type: "never",
  });
}

export function createUnavailableOverride(options: {
  psychologistId: string;
  date: string;
  endDate?: string;
  reason: UnavailableReason;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  title?: string | null;
  id?: string;
  suppressesRuleId?: string | null;
}): UnavailableBlock {
  const allDay = options.allDay ?? false;
  const endDate = options.endDate ?? options.date;

  if (allDay) {
    return baseBlock({
      id: options.id ?? nextId("override"),
      psychologist_id: options.psychologistId,
      reason: options.reason,
      layer: "override",
      all_day: true,
      title: options.title ?? null,
      suppresses_rule_id: options.suppressesRuleId ?? null,
      start_at: clinicIso(options.date, "00:00"),
      end_at: clinicIso(nextClinicDate(endDate), "00:00"),
    });
  }

  return baseBlock({
    id: options.id ?? nextId("override"),
    psychologist_id: options.psychologistId,
    reason: options.reason,
    layer: "override",
    all_day: false,
    title: options.title ?? null,
    suppresses_rule_id: options.suppressesRuleId ?? null,
    start_at: clinicIso(options.date, options.startTime ?? "09:00"),
    end_at: clinicIso(endDate, options.endTime ?? "17:00"),
  });
}

export function createPersonalTime(options: {
  psychologistId: string;
  date: string;
  endDate?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  id?: string;
}): UnavailableBlock {
  return createUnavailableOverride({
    ...options,
    reason: "personal",
    allDay: options.allDay ?? true,
  });
}

export function createVacation(options: {
  psychologistId: string;
  date: string;
  endDate?: string;
  allDay?: boolean;
  id?: string;
}): UnavailableBlock {
  return createUnavailableOverride({
    ...options,
    reason: "vacation",
    allDay: options.allDay ?? true,
  });
}
