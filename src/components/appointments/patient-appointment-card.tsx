import Link from "next/link";
import { Calendar, ChevronRight, Clock, User } from "lucide-react";
import { PatientStatusPill } from "@/components/appointments/patient-status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { type } from "@/lib/typography";
import { cn, formatCurrency } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";
import type { LucideIcon } from "lucide-react";

interface PatientAppointmentCardProps {
  appointment: AppointmentWithRelations;
  href: string;
  displayStatus?: string;
  variant?: "default" | "expired";
}

function InlineDetail({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon
        className="h-4 w-4 shrink-0 text-[var(--brand-purple)]/70"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className={cn(type.small, "text-[var(--brand-text-muted)]")}>{children}</span>
    </div>
  );
}

export function PatientAppointmentCard({
  appointment,
  href,
  displayStatus,
  variant = "default",
}: PatientAppointmentCardProps) {
  const dateLabel = formatClinicDate(appointment.start_at, "EEEE, MMMM d");
  const timeLabel = formatClinicTime(appointment.start_at);
  const priceCents = appointment.service?.price_cents;
  const status = displayStatus ?? appointment.status;
  const bookAgainHref = `/book?psychologist=${appointment.psychologist_id}&service=${appointment.service_id}`;

  return (
    <Card className="border-[var(--brand-purple)]/12 shadow-[0_4px_24px_rgba(93,80,122,0.05)] transition-all duration-200 hover:border-[var(--brand-purple)]/20 hover:shadow-[0_8px_24px_rgba(93,80,122,0.08)]">
      <CardContent className="px-6 py-5 sm:px-8 sm:py-6">
        <Link href={href} className="group block">
          <div className="flex items-start justify-between gap-6 sm:gap-10">
            <div className="min-w-0 flex-1 space-y-3.5">
              <h3 className="font-heading text-xl font-semibold leading-snug tracking-tight text-[var(--brand-text)] sm:text-[22px]">
                {appointment.service?.name ?? "Appointment"}
              </h3>

              <div className="space-y-2.5">
                <InlineDetail icon={User}>
                  {appointment.psychologist?.name ?? "Psychologist"}
                </InlineDetail>
                <InlineDetail icon={Calendar}>{dateLabel}</InlineDetail>
                <InlineDetail icon={Clock}>
                  {timeLabel} (Philippine Time)
                </InlineDetail>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4 sm:gap-5">
              <div className="flex flex-col items-end gap-2">
                {priceCents != null && (
                  <p className="font-heading text-xl font-semibold tracking-tight text-[var(--brand-purple)]">
                    {formatCurrency(priceCents)}
                  </p>
                )}
                <PatientStatusPill status={status} />
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[var(--brand-text-muted)]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--brand-purple)]"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          </div>
        </Link>

        {variant === "expired" && (
          <div className="mt-5 space-y-4 border-t border-[var(--brand-purple)]/10 pt-5">
            <p className="font-sans text-sm font-normal leading-relaxed text-[var(--brand-text-muted)]">
              The payment deadline has passed and this appointment was automatically released.
            </p>
            <Link href={bookAgainHref}>
              <Button variant="outline">Book Again</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
