import {
  Brain,
  Calendar,
  Clock,
  Receipt,
  Timer,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { type } from "@/lib/typography";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type { Psychologist, Service } from "@/types/database";

interface BookingConfirmationCardProps {
  psychologist: Psychologist;
  service: Service;
  selectedSlot: string;
  className?: string;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: typeof User;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex gap-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-purple-light)]/80 text-[var(--brand-purple)]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 space-y-0.5 pt-0.5">
        <p className={cn(type.smallMuted, "text-xs")}>{label}</p>
        <p className={cn(type.small, "font-semibold text-[var(--brand-text)]")}>{value}</p>
        {subValue && <p className={cn(type.smallMuted, "text-sm")}>{subValue}</p>}
      </div>
    </div>
  );
}

export function BookingConfirmationCard({
  psychologist,
  service,
  selectedSlot,
  className,
}: BookingConfirmationCardProps) {
  const dateLabel = formatClinicDate(selectedSlot, "EEEE, MMMM d");
  const timeLabel = formatClinicTime(selectedSlot);

  return (
    <Card
      className={cn(
        "border-[var(--brand-purple)]/12 bg-white shadow-[0_4px_24px_rgba(93,80,122,0.06)]",
        className
      )}
    >
      <CardContent className="space-y-6 py-6 sm:py-7">
        <p className={cn(type.smallMuted, "text-sm font-medium")}>Appointment details</p>

        <div className="space-y-5">
          <DetailRow
            icon={User}
            label="Psychologist"
            value={psychologist.name}
            subValue={psychologist.title ?? undefined}
          />
          <DetailRow icon={Brain} label="Service" value={service.name} />
          <DetailRow icon={Calendar} label="Date" value={dateLabel} />
          <DetailRow icon={Clock} label="Time" value={timeLabel} />
          <DetailRow
            icon={Timer}
            label="Duration"
            value={formatDuration(service.duration_minutes)}
          />
        </div>

        <div className="flex gap-3.5 border-t border-[var(--brand-purple)]/10 pt-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-purple-light)]/80 text-[var(--brand-purple)]">
            <Receipt className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 space-y-0.5 pt-0.5">
            <p className={cn(type.smallMuted, "text-xs")}>Total paid</p>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--brand-purple)]">
              {formatCurrency(service.price_cents)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
