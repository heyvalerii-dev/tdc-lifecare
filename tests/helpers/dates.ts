import { addDays, format } from "date-fns";
import { clinicDateToUtc } from "@/lib/datetime";

/** Next calendar day as yyyy-MM-dd (local date arithmetic for clinic dates). */
export function nextClinicDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return format(addDays(new Date(y, m - 1, d), 1), "yyyy-MM-dd");
}

/** Clinic-local wall time → UTC ISO string. */
export function clinicIso(dateStr: string, timeHhmm: string): string {
  return clinicDateToUtc(dateStr, timeHhmm).toISOString();
}

/**
 * Inclusive Mon–Fri (or custom) window around a date for resolveUnavailableBlocks.
 * Default: Mon–Fri of the week containing `dateStr` (clinic calendar days).
 */
export function weekContaining(
  dateStr: string,
  options?: { fromOffsetDays?: number; toOffsetDays?: number }
): { from: string; to: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, mondayOffset);
  const fromOffset = options?.fromOffsetDays ?? 0;
  const toOffset = options?.toOffsetDays ?? 4; // Mon→Fri
  return {
    from: format(addDays(monday, fromOffset), "yyyy-MM-dd"),
    to: format(addDays(monday, toOffset), "yyyy-MM-dd"),
  };
}
