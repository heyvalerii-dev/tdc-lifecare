import { type } from "@/lib/typography";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type { Psychologist, Service } from "@/types/database";

interface BookingScheduleSummaryProps {
  psychologist: Psychologist;
  service: Service;
  className?: string;
}

export function BookingScheduleSummary({
  psychologist,
  service,
  className,
}: BookingScheduleSummaryProps) {
  return (
    <div className={cn("space-y-1.5 text-center sm:text-left", className)}>
      <p className={cn(type.smallMuted, "text-sm")}>Booking with</p>
      <p className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)] sm:text-xl">
        {psychologist.name}
      </p>
      {psychologist.title && (
        <p className={cn(type.smallMuted, "text-sm")}>{psychologist.title}</p>
      )}
      <p className={cn(type.small, "pt-1 text-[var(--brand-text-muted)]")}>
        {service.name} · {formatDuration(service.duration_minutes)} ·{" "}
        {formatCurrency(service.price_cents)}
      </p>
    </div>
  );
}
