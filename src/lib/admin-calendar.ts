import {
  addDays,
  addMinutes,
  addWeeks,
  format,
  parseISO,
  subWeeks,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import {
  clinicDateToUtc,
  getDayOfWeekInClinic,
  getOccupiedUntil,
  rangesOverlap,
} from "@/lib/datetime";
import {
  CALENDAR_GRID_END_HOUR,
  CALENDAR_GRID_START_HOUR,
  CALENDAR_ROW_HEIGHT_PX,
  formatGridTime,
  getCalendarGridBodyStyle,
  getCalendarGridHeightPx,
  getCalendarGridSlots,
  getCalendarRangeFromAvailability,
  getCalendarTimeGridStyle,
  getGridEndMinutes,
  getGridStartMinutes,
  HOUR_HEIGHT_PX,
  minutesToHeightPx,
  rowsToHeightPx,
  SCHEDULER_GRID_MINUTES,
  SLOT_HEIGHT_PX,
  SLOTS_PER_HOUR,
  type CalendarGridRange,
} from "@/lib/scheduling-grid";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
} from "@/types/database";

/** @deprecated Use getCalendarGridSlots() — hour labels are :00 rows only. */
export const CALENDAR_HOURS = Array.from(
  { length: CALENDAR_GRID_END_HOUR - CALENDAR_GRID_START_HOUR },
  (_, i) => CALENDAR_GRID_START_HOUR + i
) as number[];

export type CalendarHour = number;

export {
  CALENDAR_ROW_HEIGHT_PX,
  getCalendarGridBodyStyle,
  getCalendarGridHeightPx,
  getCalendarGridSlots,
  getCalendarRangeFromAvailability,
  getCalendarTimeGridStyle,
  getGridEndMinutes,
  getGridStartMinutes,
  HOUR_HEIGHT_PX,
  SCHEDULER_GRID_MINUTES,
  SLOT_HEIGHT_PX,
  SLOTS_PER_HOUR,
};
export type { CalendarGridRange };

/** Shared motion and shape tokens for the admin scheduler. */
export const CALENDAR_TRANSITION_CLASS = "transition-all duration-150 ease-out";
export const CALENDAR_EVENT_RADIUS_CLASS = "rounded-[11px]";
export const CALENDAR_PSYCH_HEADER_HEIGHT_CLASS = "h-10";

/** Hour grid borders — each row's top edge is the slot start line. */
export const CALENDAR_GRID_HOUR_BORDER = "border-[rgba(90,90,110,0.10)]";
export const CALENDAR_GRID_QUARTER_BORDER = "border-[rgba(90,90,110,0.045)]";

export function getCalendarGridRowBorderClass(minute: number): string {
  return minute === 0 ? CALENDAR_GRID_HOUR_BORDER : CALENDAR_GRID_QUARTER_BORDER;
}

export const CALENDAR_TIME_LABEL_CLASS =
  "whitespace-nowrap text-xs font-medium tabular-nums leading-none text-gray-600";

/** Pill mask — floats above the hour divider without shifting vertical alignment. */
export const CALENDAR_TIME_LABEL_PILL_CLASS =
  "relative z-[1] rounded-full bg-[#FCFBFF] px-1.5";

/** Zero-height anchor at the row boundary — flex centers on the grid line, not the row box. */
export const CALENDAR_TIME_LABEL_ANCHOR_CLASS =
  "pointer-events-none absolute inset-x-2 top-0 flex h-0 items-center justify-center overflow-visible";

export const CALENDAR_STATUS_LEGEND = [
  {
    status: "pending_payment",
    label: "Awaiting Payment",
    shortLabel: "Awaiting",
    dot: "bg-[#D4B84A]",
  },
  {
    status: "confirmed",
    label: "Confirmed",
    shortLabel: "Confirmed",
    dot: "bg-[#6BA3D6]",
  },
  {
    status: "completed",
    label: "Completed",
    shortLabel: "Completed",
    dot: "bg-[#7BA88E]",
  },
] as const;

/** Soft tinted calendar event backgrounds — sticky-note style, no borders. */
export const calendarStatusCardStyles: Record<string, string> = {
  pending_payment: "bg-[#FBF6E8] hover:bg-[#F8F0DC]",
  confirmed: "bg-[#EDF4FC] hover:bg-[#E4EEF9]",
  completed: "bg-[#F0F5F1] hover:bg-[#E8F0EA]",
  cancelled: "bg-[#FCF4F5] hover:bg-[#F9EBED]",
  expired: "bg-[#F5F4F7] hover:bg-[#EEEDF1]",
  no_show: "bg-[#F5F4F7] hover:bg-[#EEEDF1]",
};

/** Buffer extension tints — same status family at ~18% opacity. */
export const calendarStatusBufferStyles: Record<string, string> = {
  pending_payment: "bg-[#FBF6E8]/[0.18]",
  confirmed: "bg-[#EDF4FC]/[0.18]",
  completed: "bg-[#F0F5F1]/[0.18]",
  cancelled: "bg-[#FCF4F5]/[0.18]",
  expired: "bg-[#F5F4F7]/[0.18]",
  no_show: "bg-[#F5F4F7]/[0.18]",
};

/** @deprecated Use calendarStatusCardStyles */
export const calendarStatusBlockStyles: Record<string, string> = {
  pending_payment:
    "bg-[#FBF6E8] hover:bg-[#F8F0DC] border-transparent shadow-[0_1px_3px_rgba(154,123,26,0.08)]",
  confirmed:
    "bg-[#EDF4FC] hover:bg-[#E4EEF9] border-transparent shadow-[0_1px_3px_rgba(59,130,180,0.08)]",
  completed:
    "bg-[#F0F5F1] hover:bg-[#E8F0EA] border-transparent shadow-[0_1px_3px_rgba(92,122,104,0.08)]",
  cancelled:
    "bg-[#FCF4F5] hover:bg-[#F9EBED] border-transparent shadow-[0_1px_3px_rgba(140,92,104,0.08)]",
  expired:
    "bg-[#F5F4F7] hover:bg-[#EEEDF1] border-transparent shadow-[0_1px_3px_rgba(93,80,122,0.06)]",
  no_show:
    "bg-[#F5F4F7] hover:bg-[#EEEDF1] border-transparent shadow-[0_1px_3px_rgba(93,80,122,0.06)]",
};

export function getWeekStartMonday(date: Date): Date {
  const clinic = toZonedTime(date, CLINIC_TIMEZONE);
  const day = clinic.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(clinic, diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function filterWorkingDays(
  days: Date[],
  workingDays: number[]
): Date[] {
  return days.filter((day) => workingDays.includes(getDayOfWeekInClinic(day)));
}

export function formatWeekRange(days: Date[]): string {
  if (days.length === 0) return "No clinic days";
  const startLabel = formatInTimeZone(days[0], CLINIC_TIMEZONE, "MMMM d");
  const endLabel = formatInTimeZone(
    days[days.length - 1],
    CLINIC_TIMEZONE,
    "MMMM d"
  );
  return `${startLabel} – ${endLabel}`;
}

/** @deprecated Use formatWeekRange(visibleDays) */
export function formatWeekRangeFromStart(weekStart: Date): string {
  return formatWeekRange(getWeekDays(weekStart));
}

export function toClinicDateString(date: Date): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function formatHourLabel(hour: number): string {
  const date = new Date(`1970-01-01T${hour.toString().padStart(2, "0")}:00:00`);
  return format(date, "h:mm");
}

export function formatDayHeader(date: Date): {
  weekday: string;
  weekdayShort: string;
  dateLabel: string;
  compactLabel: string;
} {
  const weekdayShort = formatInTimeZone(date, CLINIC_TIMEZONE, "EEE");
  const dateLabel = formatInTimeZone(date, CLINIC_TIMEZONE, "MMM d");
  return {
    weekday: formatInTimeZone(date, CLINIC_TIMEZONE, "EEEE"),
    weekdayShort,
    dateLabel,
    compactLabel: `${weekdayShort}, ${dateLabel}`,
  };
}

export function getPsychologistInitials(name: string): string {
  const parts = name.replace(/^Dr\.\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function getPsychologistShortName(name: string): string {
  const withoutTitle = name.replace(/^Dr\.\s*/i, "");
  const firstTwo = withoutTitle.split(" ").slice(0, 2).join(" ");
  return firstTwo || withoutTitle;
}

/** Muted identity markers for calendar psychologist columns — not status colors. */
export const PSYCHOLOGIST_IDENTITY_COLORS = [
  "#8B78C6",
  "#5E8D74",
  "#7A8FA8",
  "#A67B8C",
] as const;

export function getPsychologistIdentityColor(index: number): string {
  return PSYCHOLOGIST_IDENTITY_COLORS[
    index % PSYCHOLOGIST_IDENTITY_COLORS.length
  ]!;
}

export function getPsychologistIdentityColorById(
  psychologistId: string | undefined,
  psychologists: { id: string }[]
): string {
  if (!psychologistId) {
    return PSYCHOLOGIST_IDENTITY_COLORS[0];
  }
  const index = psychologists.findIndex((p) => p.id === psychologistId);
  return getPsychologistIdentityColor(index >= 0 ? index : 0);
}

/** Status dot colors — matches calendar legend palette. */
export const APPOINTMENT_STATUS_DOT_COLORS: Record<string, string> = {
  pending_payment: "#D4B84A",
  confirmed: "#6BA3D6",
  completed: "#7BA88E",
  cancelled: "#D48A8A",
  expired: "#B8B4C0",
  no_show: "#B8B4C0",
};

export function findAppointmentInSlot(
  appointments: AppointmentWithRelations[],
  psychologistId: string,
  dateStr: string,
  hour: number,
  minute = 0
): AppointmentWithRelations | undefined {
  return appointments.find((appt) => {
    if (appt.psychologist_id !== psychologistId) return false;
    const apptDate = formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");
    if (apptDate !== dateStr) return false;
    const apptHour = Number(formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "H"));
    const apptMinute = Number(formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "m"));
    return apptHour === hour && apptMinute === minute;
  });
}

export function getAppointmentsForColumn(
  appointments: AppointmentWithRelations[],
  psychologistId: string,
  dateStr: string
): AppointmentWithRelations[] {
  return appointments.filter((appt) => {
    if (appt.psychologist_id !== psychologistId) return false;
    const apptDate = formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");
    if (apptDate !== dateStr) return false;
    return !["cancelled", "expired"].includes(appt.status);
  });
}

export function isGridSlotOccupied(
  appointments: AppointmentWithRelations[],
  psychologistId: string,
  dateStr: string,
  hour: number,
  minute: number,
  blocks: { psychologist_id: string; start_at: string; end_at: string }[] = []
): boolean {
  const slotStart = clinicDateToUtc(dateStr, formatGridTime(hour, minute));
  const slotEnd = addMinutes(slotStart, SCHEDULER_GRID_MINUTES);

  const apptOccupied = appointments.some((appt) => {
    if (appt.psychologist_id !== psychologistId) return false;
    const apptDate = formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");
    if (apptDate !== dateStr) return false;
    if (["cancelled", "expired"].includes(appt.status)) return false;

    const startAt = parseISO(appt.start_at);
    const endAt = parseISO(appt.end_at);
    const occupiedUntil = getOccupiedUntil(endAt, appt.service?.buffer_minutes ?? 0);

    return rangesOverlap(slotStart, slotEnd, startAt, occupiedUntil);
  });
  if (apptOccupied) return true;

  return blocks.some((block) => {
    if (block.psychologist_id !== psychologistId) return false;
    return rangesOverlap(
      slotStart,
      slotEnd,
      parseISO(block.start_at),
      parseISO(block.end_at)
    );
  });
}

/**
 * True when the psychologist has at least one active availability window
 * on this clinic date's weekday.
 */
export function hasPsychologistAvailabilityForDate(
  availability: AvailabilityBlock[],
  psychologistId: string,
  dateStr: string
): boolean {
  const dayOfWeek = getDayOfWeekInClinic(clinicDateToUtc(dateStr, "12:00"));
  return availability.some(
    (block) =>
      block.is_active &&
      block.psychologist_id === psychologistId &&
      block.day_of_week === dayOfWeek
  );
}

/**
 * True when the slot start falls inside an active availability window
 * for this psychologist on this clinic date.
 */
export function isSlotWithinAvailability(
  availability: AvailabilityBlock[],
  psychologistId: string,
  dateStr: string,
  hour: number,
  minute: number
): boolean {
  const dayOfWeek = getDayOfWeekInClinic(clinicDateToUtc(dateStr, "12:00"));
  const timeStr = formatGridTime(hour, minute);

  return availability.some((block) => {
    if (!block.is_active) return false;
    if (block.psychologist_id !== psychologistId) return false;
    if (block.day_of_week !== dayOfWeek) return false;
    const start = block.start_time.slice(0, 5);
    const end = block.end_time.slice(0, 5);
    return timeStr >= start && timeStr < end;
  });
}

/** Empty-slot "+" only when available and not already taken. */
export function isGridSlotBookable(
  appointments: AppointmentWithRelations[],
  availability: AvailabilityBlock[],
  psychologistId: string,
  dateStr: string,
  hour: number,
  minute: number,
  blocks: { psychologist_id: string; start_at: string; end_at: string }[] = []
): boolean {
  if (
    !isSlotWithinAvailability(
      availability,
      psychologistId,
      dateStr,
      hour,
      minute
    )
  ) {
    return false;
  }
  return !isGridSlotOccupied(
    appointments,
    psychologistId,
    dateStr,
    hour,
    minute,
    blocks
  );
}

export function getBlocksForColumn(
  blocks: {
    id: string;
    psychologist_id: string;
    start_at: string;
    end_at: string;
  }[],
  psychologistId: string,
  dateStr: string
) {
  return blocks.filter((block) => {
    if (block.psychologist_id !== psychologistId) return false;
    // Multi-day overrides: include when the day intersects the range
    const blockStartDate = formatInTimeZone(
      block.start_at,
      CLINIC_TIMEZONE,
      "yyyy-MM-dd"
    );
    const blockEndDate = formatInTimeZone(
      // end exclusive-ish: if ends at midnight, last day is previous
      new Date(parseISO(block.end_at).getTime() - 1),
      CLINIC_TIMEZONE,
      "yyyy-MM-dd"
    );
    return dateStr >= blockStartDate && dateStr <= blockEndDate;
  });
}

export function getAppointmentGridPosition(
  startAtIso: string,
  durationMinutes: number,
  bufferMinutes: number,
  dateStr: string,
  gridStartMinutes: number = getGridStartMinutes(),
  gridEndMinutes: number = getGridEndMinutes(),
  slotHeightPx: number = SLOT_HEIGHT_PX
): { topPx: number; sessionHeightPx: number; bufferHeightPx: number } | null {
  const apptDate = formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "yyyy-MM-dd");
  if (apptDate !== dateStr) return null;

  const hour = Number(formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "H"));
  const minute = Number(formatInTimeZone(startAtIso, CLINIC_TIMEZONE, "m"));
  const startMinutes = hour * 60 + minute;
  const totalEndMinutes = startMinutes + durationMinutes + bufferMinutes;

  const visibleStart = Math.max(startMinutes, gridStartMinutes);
  const visibleEnd = Math.min(totalEndMinutes, gridEndMinutes);
  if (visibleEnd <= visibleStart) return null;

  const sessionEnd = Math.min(startMinutes + durationMinutes, visibleEnd);
  const sessionHeightMinutes = Math.max(0, sessionEnd - visibleStart);
  const bufferHeightMinutes = Math.max(0, visibleEnd - sessionEnd);

  return {
    topPx: minutesToHeightPx(visibleStart - gridStartMinutes, slotHeightPx),
    sessionHeightPx: minutesToHeightPx(sessionHeightMinutes, slotHeightPx),
    bufferHeightPx: minutesToHeightPx(bufferHeightMinutes, slotHeightPx),
  };
}

/**
 * Calendar grid bounds from availability, expanded to fit real appointments
 * in the visible week so booked slots are never clipped out of the grid.
 */
export function getCalendarRangeForSchedule(
  availability: AvailabilityBlock[],
  appointments: AppointmentWithRelations[],
  activePsychologistIds: Set<string>
): CalendarGridRange {
  const range = getCalendarRangeFromAvailability(
    availability.filter((b) => activePsychologistIds.has(b.psychologist_id))
  );

  let minMinutes = range.startHour * 60;
  let maxMinutes = range.endHour * 60;

  for (const appt of appointments) {
    if (["cancelled", "expired"].includes(appt.status)) continue;

    const startMinutes =
      Number(formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "H")) * 60 +
      Number(formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "m"));

    const endAt = parseISO(appt.end_at);
    const bufferMinutes = appt.service?.buffer_minutes ?? 0;
    const occupiedUntil = getOccupiedUntil(endAt, bufferMinutes);
    const endMinutes =
      Number(formatInTimeZone(occupiedUntil.toISOString(), CLINIC_TIMEZONE, "H")) *
        60 +
      Number(formatInTimeZone(occupiedUntil.toISOString(), CLINIC_TIMEZONE, "m"));

    minMinutes = Math.min(minMinutes, startMinutes);
    maxMinutes = Math.max(maxMinutes, endMinutes);
  }

  const startHour = Math.floor(minMinutes / 60);
  const endHour = Math.max(startHour + 1, Math.ceil(maxMinutes / 60));
  return { startHour, endHour };
}

/**
 * Position a (possibly multi-day) block segment inside the visible grid.
 * Clamps midnight–midnight / all-day spans so continuation days still render.
 */
export function getBlockGridPosition(
  startAtIso: string,
  endAtIso: string,
  dateStr: string,
  gridStartMinutes: number = getGridStartMinutes(),
  gridEndMinutes: number = getGridEndMinutes(),
  slotHeightPx: number = SLOT_HEIGHT_PX
): { topPx: number; sessionHeightPx: number } | null {
  const dayStart = clinicDateToUtc(dateStr, "00:00");
  const dayEnd = clinicDateToUtc(
    format(addDays(parseISO(`${dateStr}T12:00:00`), 1), "yyyy-MM-dd"),
    "00:00"
  );
  const start = parseISO(startAtIso);
  const end = parseISO(endAtIso);

  const clippedStart = start > dayStart ? start : dayStart;
  const clippedEnd = end < dayEnd ? end : dayEnd;
  if (clippedStart >= clippedEnd) return null;

  const startMinutes =
    Number(formatInTimeZone(clippedStart.toISOString(), CLINIC_TIMEZONE, "H")) *
      60 +
    Number(formatInTimeZone(clippedStart.toISOString(), CLINIC_TIMEZONE, "m"));

  let endMinutes =
    Number(formatInTimeZone(clippedEnd.toISOString(), CLINIC_TIMEZONE, "H")) *
      60 +
    Number(formatInTimeZone(clippedEnd.toISOString(), CLINIC_TIMEZONE, "m"));

  // Exclusive midnight end → treat as end of clinic day
  if (
    endMinutes === 0 &&
    formatInTimeZone(clippedEnd.toISOString(), CLINIC_TIMEZONE, "yyyy-MM-dd") >
      dateStr
  ) {
    endMinutes = 24 * 60;
  }

  const visibleStart = Math.max(startMinutes, gridStartMinutes);
  const visibleEnd = Math.min(endMinutes, gridEndMinutes);
  if (visibleEnd <= visibleStart) return null;

  return {
    topPx: minutesToHeightPx(visibleStart - gridStartMinutes, slotHeightPx),
    sessionHeightPx: minutesToHeightPx(visibleEnd - visibleStart, slotHeightPx),
  };
}

export function buildManualBookingUrl(
  psychologistId: string,
  dateStr: string,
  hour: number,
  minute = 0
): string {
  const time = formatGridTime(hour, minute);
  const params = new URLSearchParams({
    psychologist_id: psychologistId,
    date: dateStr,
    time,
  });
  return `/admin/book?${params.toString()}`;
}

export function shiftWeek(weekStart: Date, direction: -1 | 1): Date {
  return direction === -1 ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1);
}

export function sortPsychologists(psychologists: Psychologist[]): Psychologist[] {
  return [...psychologists].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterAppointmentsForWeek(
  appointments: AppointmentWithRelations[],
  weekStart: Date,
  workingDays: number[]
): AppointmentWithRelations[] {
  const visibleDays = filterWorkingDays(getWeekDays(weekStart), workingDays);
  const visibleDateSet = new Set(visibleDays.map(toClinicDateString));

  return appointments.filter((appt) => {
    const d = formatInTimeZone(appt.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");
    return visibleDateSet.has(d);
  });
}

/** Real appointments for the visible clinic week (no demo/mock data). */
export function mergeCalendarAppointments(
  real: AppointmentWithRelations[],
  weekStart: Date,
  workingDays: number[]
): AppointmentWithRelations[] {
  return filterAppointmentsForWeek(real, weekStart, workingDays);
}
