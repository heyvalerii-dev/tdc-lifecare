import {
  CALENDAR_TIME_LABEL_ANCHOR_CLASS,
  CALENDAR_TIME_LABEL_CLASS,
  CALENDAR_TIME_LABEL_PILL_CLASS,
  formatHourLabel,
  getCalendarGridBodyStyle,
  getCalendarGridRowBorderClass,
  getCalendarGridSlots,
  type CalendarGridRange,
} from "@/lib/admin-calendar";
import { cn } from "@/lib/utils";
import type { CalendarGridSlot } from "@/lib/scheduling-grid";

interface CalendarGridRowProps {
  minute: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Single quarter-hour row. The divider is a zero-height border at the row
 * boundary so labels and appointments share the same Y coordinate as the line.
 */
export function CalendarGridRow({ minute, children, className }: CalendarGridRowProps) {
  return (
    <div className={cn("relative min-h-0 overflow-visible", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 border-t",
          getCalendarGridRowBorderClass(minute)
        )}
        aria-hidden
      />
      {children}
    </div>
  );
}

interface CalendarGridBodyProps {
  range: CalendarGridRange;
  children: (slot: CalendarGridSlot) => React.ReactNode;
  className?: string;
}

/** Shared CSS Grid body — single-column schedule columns use identical row tracks. */
export function CalendarGridBody({
  range,
  children,
  className,
}: CalendarGridBodyProps) {
  const slots = getCalendarGridSlots(range);
  const bodyStyle = getCalendarGridBodyStyle(range);

  return (
    <div className={cn("shrink-0 overflow-visible", className)} style={bodyStyle}>
      {slots.map((slot) => children(slot))}
    </div>
  );
}

interface CalendarHourLabelProps {
  hour: number;
  compact?: boolean;
}

/** Gutter label centered on the major-hour divider via a zero-height top anchor. */
export function CalendarHourLabel({ hour, compact = false }: CalendarHourLabelProps) {
  return (
    <div
      className={cn(
        CALENDAR_TIME_LABEL_ANCHOR_CLASS,
        compact && "inset-x-1"
      )}
    >
      <span
        className={cn(
          CALENDAR_TIME_LABEL_CLASS,
          CALENDAR_TIME_LABEL_PILL_CLASS,
          compact && "px-1 text-[10px]",
          "text-center"
        )}
      >
        {formatHourLabel(hour)}
      </span>
    </div>
  );
}

export { CALENDAR_TIME_LABEL_CLASS };
