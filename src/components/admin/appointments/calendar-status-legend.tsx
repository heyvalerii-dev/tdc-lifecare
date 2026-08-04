import { CALENDAR_STATUS_LEGEND } from "@/lib/admin-calendar";
import { cn } from "@/lib/utils";

interface CalendarStatusLegendProps {
  className?: string;
  variant?: "default" | "compact";
}

export function CalendarStatusLegend({
  className,
  variant = "default",
}: CalendarStatusLegendProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-0.5",
          className
        )}
        role="list"
        aria-label="Appointment status legend"
      >
        {CALENDAR_STATUS_LEGEND.map((item) => (
          <span
            key={item.status}
            role="listitem"
            title={item.label}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--brand-text-muted)]"
          >
            <span
              className={cn("size-1.5 shrink-0 rounded-full", item.dot)}
              aria-hidden
            />
            {item.shortLabel}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5",
        className
      )}
      role="list"
      aria-label="Appointment status legend"
    >
      {CALENDAR_STATUS_LEGEND.map((item) => (
        <span
          key={item.status}
          role="listitem"
          title={item.label}
          className="inline-flex items-center gap-1 text-xs font-normal text-[var(--brand-text-muted)]/65"
        >
          <span
            className={cn("size-[6px] shrink-0 rounded-full opacity-75", item.dot)}
            aria-hidden
          />
          <span className="hidden sm:inline">{item.label}</span>
          <span className="sm:hidden">{item.shortLabel}</span>
        </span>
      ))}
    </div>
  );
}
