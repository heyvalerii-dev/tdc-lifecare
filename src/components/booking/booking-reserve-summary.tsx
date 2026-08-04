import { Brain, Calendar, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { type } from "@/lib/typography";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type { Psychologist, Service } from "@/types/database";

interface BookingReserveSummaryProps {
  psychologist: Psychologist;
  service: Service;
  selectedSlot: string;
  className?: string;
  /** Use white for payment and other prominent summary cards. */
  variant?: "tinted" | "white";
}

function SummaryBlock({
  icon: Icon,
  children,
}: {
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-purple-light)]/80 text-[var(--brand-purple)]">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 space-y-0.5 pt-0.5">{children}</div>
    </div>
  );
}

export function BookingReserveSummary({
  psychologist,
  service,
  selectedSlot,
  className,
  variant = "tinted",
}: BookingReserveSummaryProps) {
  const dateLabel = formatClinicDate(selectedSlot, "EEEE, MMMM d");
  const timeLabel = formatClinicTime(selectedSlot);

  return (
    <Card
      className={cn(
        "border-[var(--brand-purple)]/12 shadow-[0_4px_24px_rgba(93,80,122,0.05)]",
        variant === "white" ? "bg-white" : "bg-[var(--brand-cream)]/30",
        className
      )}
    >
      <CardContent className="space-y-6 py-6 sm:py-7">
        <p className={cn(type.smallMuted, "text-sm font-medium")}>Booking summary</p>

        <div className="space-y-5">
          <SummaryBlock icon={User}>
            <p className={cn(type.small, "font-semibold text-[var(--brand-text)]")}>
              {psychologist.name}
            </p>
            {psychologist.title && (
              <p className={cn(type.smallMuted, "text-sm")}>{psychologist.title}</p>
            )}
          </SummaryBlock>

          <SummaryBlock icon={Brain}>
            <p className={cn(type.small, "font-semibold text-[var(--brand-text)]")}>
              {service.name}
            </p>
            <p className={cn(type.smallMuted, "text-sm")}>
              {formatDuration(service.duration_minutes)}
            </p>
          </SummaryBlock>

          <div className="space-y-3 pl-[3.375rem]">
            <div className="flex items-center gap-2.5 text-[var(--brand-text)]">
              <Calendar className="h-4 w-4 shrink-0 text-[var(--brand-purple)]/70" strokeWidth={1.75} />
              <span className={cn(type.small, "font-medium")}>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[var(--brand-text)]">
              <Clock className="h-4 w-4 shrink-0 text-[var(--brand-purple)]/70" strokeWidth={1.75} />
              <span className={cn(type.small, "font-medium")}>{timeLabel}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--brand-purple)]/10 pt-5">
          <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--brand-purple)]">
            {formatCurrency(service.price_cents)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
