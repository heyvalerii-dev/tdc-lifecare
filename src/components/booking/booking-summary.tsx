import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Psychologist, Service } from "@/types/database";

interface BookingSummaryProps {
  psychologist: Psychologist;
  service: Service;
  selectedSlot: string;
  compact?: boolean;
  showTotal?: boolean;
  showDuration?: boolean;
  showPrice?: boolean;
  combineDateTime?: boolean;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={type.smallMuted}>{label}</span>
      <span className={cn(type.small, "text-right")}>{value}</span>
    </div>
  );
}

export function BookingSummary({
  psychologist,
  service,
  selectedSlot,
  compact = false,
  showTotal = false,
  showDuration = false,
  showPrice = false,
  combineDateTime = false,
}: BookingSummaryProps) {
  const dateLabel = formatClinicDate(selectedSlot, "EEEE, MMMM d");
  const timeLabel = formatClinicTime(selectedSlot);

  if (compact) {
    return (
      <Card className="border-[var(--brand-purple)]/15 bg-[var(--brand-purple-light)]/30">
        <CardContent className="space-y-3 py-5">
          <p className={cn(type.smallMuted, "uppercase tracking-wide")}>Your appointment</p>
          <p className={type.small}>{psychologist.name}</p>
          <p className={type.smallMuted}>{service.name}</p>
          <p className={type.smallMuted}>
            {dateLabel} · {timeLabel}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <SummaryRow label="Psychologist" value={psychologist.name} />
        <SummaryRow label="Service" value={service.name} />
        {combineDateTime ? (
          <SummaryRow label="Date & time" value={`${dateLabel} at ${timeLabel}`} />
        ) : (
          <>
            <SummaryRow label="Date" value={dateLabel} />
            <SummaryRow label="Time" value={timeLabel} />
          </>
        )}
        {showDuration && (
          <SummaryRow label="Duration" value={formatDuration(service.duration_minutes)} />
        )}
        {showPrice && (
          <SummaryRow label="Price" value={formatCurrency(service.price_cents)} />
        )}
        {showTotal && (
          <div className="flex justify-between gap-4 border-t border-[var(--brand-purple)]/10 pt-4">
            <span className={type.label}>Total</span>
            <span className={cn(type.small, "text-[var(--brand-purple)]")}>
              {formatCurrency(service.price_cents)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
