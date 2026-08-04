/** Shared 15-minute grid increment for scheduling and calendar layout. */
export const SCHEDULER_GRID_MINUTES = 15;

/** Pixel height of one 15-minute slot — all spans derive from this. */
export const SLOT_HEIGHT_PX = 16;

/** Taller slots for the mobile single-psychologist day view. */
export const MOBILE_SLOT_HEIGHT_PX = 21;

/** @deprecated Use SLOT_HEIGHT_PX */
export const CALENDAR_ROW_HEIGHT_PX = SLOT_HEIGHT_PX;

export const SLOTS_PER_HOUR = 60 / SCHEDULER_GRID_MINUTES;

export const HOUR_HEIGHT_PX = SLOT_HEIGHT_PX * SLOTS_PER_HOUR;

/**
 * Fallback grid bounds when no psychologist availability is configured.
 * Prefer {@link getCalendarRangeFromAvailability} for the live calendar.
 */
export const CALENDAR_GRID_START_HOUR = 9;
export const CALENDAR_GRID_END_HOUR = 17;

export interface CalendarGridRange {
  /** Inclusive start hour (e.g. 9 → 9:00 AM). */
  startHour: number;
  /** Exclusive end hour (e.g. 17 → grid ends at 5:00 PM). */
  endHour: number;
}

export const DEFAULT_CALENDAR_GRID_RANGE: CalendarGridRange = {
  startHour: CALENDAR_GRID_START_HOUR,
  endHour: CALENDAR_GRID_END_HOUR,
};

export interface CalendarGridSlot {
  hour: number;
  minute: number;
  index: number;
}

export function minutesToRows(minutes: number): number {
  return minutes / SCHEDULER_GRID_MINUTES;
}

export function rowsToHeightPx(
  rows: number,
  slotHeightPx: number = SLOT_HEIGHT_PX
): number {
  return rows * slotHeightPx;
}

export function minutesToHeightPx(
  minutes: number,
  slotHeightPx: number = SLOT_HEIGHT_PX
): number {
  return rowsToHeightPx(minutesToRows(minutes), slotHeightPx);
}

export function parseTimeToMinutes(time: string): number {
  const [hourPart, minutePart] = time.slice(0, 5).split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

/**
 * Visible calendar range from active availability blocks.
 * Floors the earliest start to the hour and ceils the latest end.
 */
export function getCalendarRangeFromAvailability(
  blocks: { start_time: string; end_time: string; is_active?: boolean }[]
): CalendarGridRange {
  const active = blocks.filter((b) => b.is_active !== false);
  if (active.length === 0) return { ...DEFAULT_CALENDAR_GRID_RANGE };

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const block of active) {
    minStart = Math.min(minStart, parseTimeToMinutes(block.start_time));
    maxEnd = Math.max(maxEnd, parseTimeToMinutes(block.end_time));
  }

  if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd) || maxEnd <= minStart) {
    return { ...DEFAULT_CALENDAR_GRID_RANGE };
  }

  const startHour = Math.floor(minStart / 60);
  const endHour = Math.max(startHour + 1, Math.ceil(maxEnd / 60));
  return { startHour, endHour };
}

export function getCalendarGridRowCount(range: CalendarGridRange): number {
  return Math.max(0, range.endHour - range.startHour) * SLOTS_PER_HOUR;
}

export function getCalendarGridHeightPx(
  range: CalendarGridRange = DEFAULT_CALENDAR_GRID_RANGE,
  slotHeightPx: number = SLOT_HEIGHT_PX
): number {
  return getCalendarGridRowCount(range) * slotHeightPx;
}

/** @deprecated Prefer getCalendarGridRowCount(range) */
export const CALENDAR_GRID_ROW_COUNT = getCalendarGridRowCount(
  DEFAULT_CALENDAR_GRID_RANGE
);

export function getCalendarGridBodyStyle(
  range: CalendarGridRange = DEFAULT_CALENDAR_GRID_RANGE,
  slotHeightPx: number = SLOT_HEIGHT_PX
): React.CSSProperties {
  const rows = getCalendarGridRowCount(range);
  return {
    display: "grid",
    gridTemplateRows: `repeat(${rows}, ${slotHeightPx}px)`,
    height: getCalendarGridHeightPx(range, slotHeightPx),
  };
}

/** Full time-grid style — gutter + schedule columns share one grid coordinate system. */
export function getCalendarTimeGridStyle(
  gridTemplateColumns: string,
  range: CalendarGridRange = DEFAULT_CALENDAR_GRID_RANGE,
  slotHeightPx: number = SLOT_HEIGHT_PX
): React.CSSProperties {
  const rows = getCalendarGridRowCount(range);
  return {
    display: "grid",
    gridTemplateColumns,
    gridTemplateRows: `repeat(${rows}, ${slotHeightPx}px)`,
    height: getCalendarGridHeightPx(range, slotHeightPx),
  };
}

export function getCalendarGridSlots(
  range: CalendarGridRange = DEFAULT_CALENDAR_GRID_RANGE
): CalendarGridSlot[] {
  const slots: CalendarGridSlot[] = [];
  let index = 0;
  for (let hour = range.startHour; hour < range.endHour; hour++) {
    for (let minute = 0; minute < 60; minute += SCHEDULER_GRID_MINUTES) {
      slots.push({ hour, minute, index: index++ });
    }
  }
  return slots;
}

export function formatGridTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function getGridStartMinutes(
  range: CalendarGridRange = DEFAULT_CALENDAR_GRID_RANGE
): number {
  return range.startHour * 60;
}

export function getGridEndMinutes(
  range: CalendarGridRange = DEFAULT_CALENDAR_GRID_RANGE
): number {
  return range.endHour * 60;
}
