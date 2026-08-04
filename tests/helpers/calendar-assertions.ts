import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import type { ResolvedUnavailableBlock } from "@/lib/calendar-blocks";
import type { UnavailableReason } from "@/types/database";

function clinicDate(iso: string): string {
  return formatInTimeZone(iso, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function lunchOccurrencesOnDate(
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

export function overridesOnDate(
  resolved: ResolvedUnavailableBlock[],
  psychologistId: string,
  date: string,
  reason?: UnavailableReason
): ResolvedUnavailableBlock[] {
  return resolved.filter(
    (row) =>
      row.psychologist_id === psychologistId &&
      !row.is_occurrence &&
      clinicDate(row.start_at) === date &&
      (reason ? row.reason === reason : true)
  );
}
