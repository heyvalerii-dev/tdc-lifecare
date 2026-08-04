import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  HeartHandshake,
  User,
} from "lucide-react";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";
import type { LucideIcon } from "lucide-react";

interface AdminAppointmentCardProps {
  appointment: AppointmentWithRelations;
  href: string;
  className?: string;
}

const detailIconClass =
  "h-[17px] w-[17px] shrink-0 text-[var(--brand-purple)]/70 sm:h-4 sm:w-4";

function DetailRow({
  icon: Icon,
  label,
  children,
  textClassName,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  textClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3" aria-label={label}>
      <Icon className={detailIconClass} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{label}</span>
      <span
        className={cn(
          "min-w-0 font-sans text-[15px] leading-snug sm:text-sm",
          textClassName
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function AdminAppointmentCard({
  appointment,
  href,
  className,
}: AdminAppointmentCardProps) {
  const dateLabel = formatClinicDate(appointment.start_at, "EEEE, MMMM d");
  const timeLabel = formatClinicTime(appointment.start_at);
  const clientName =
    appointment.client?.full_name ?? appointment.client?.email ?? "Client";
  const psychologistName =
    appointment.psychologist?.name ?? "Psychologist";

  return (
    <Card
      className={cn(
        "rounded-2xl border-[var(--brand-purple)]/10 bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)] transition-all duration-200 active:scale-[0.99] sm:rounded-xl sm:active:scale-100 sm:hover:border-[var(--brand-purple)]/16 sm:hover:shadow-[0_8px_24px_rgba(93,80,122,0.06)]",
        className
      )}
    >
      <CardContent className="px-5 py-4 sm:px-6 sm:py-5">
        <Link href={href} className="group block">
          {/* Mobile header */}
          <div className="md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-lg font-semibold leading-snug tracking-tight text-[var(--brand-text)]">
                  {appointment.service?.name ?? "Appointment"}
                </h3>
                <div className="mt-2.5">
                  <AdminAppointmentStatusPill status={appointment.status} />
                </div>
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[var(--brand-text-muted)]/40"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden items-start gap-3 md:flex">
            <h3 className="min-w-0 flex-1 font-heading text-xl font-semibold leading-snug tracking-tight text-[var(--brand-text)]">
              {appointment.service?.name ?? "Appointment"}
            </h3>
            <div className="flex shrink-0 items-center gap-2.5">
              <AdminAppointmentStatusPill status={appointment.status} />
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[var(--brand-text-muted)]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--brand-purple)]"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          </div>

          <div
            className="my-3.5 h-px bg-[var(--brand-purple)]/10 md:my-4"
            aria-hidden
          />

          <div className="space-y-2.5 md:space-y-3">
            <DetailRow
              icon={User}
              label="Client"
              textClassName="font-semibold text-[var(--brand-text)]"
            >
              {clientName}
            </DetailRow>
            <DetailRow
              icon={HeartHandshake}
              label="Psychologist"
              textClassName="font-normal text-[var(--brand-text-muted)]"
            >
              {psychologistName}
            </DetailRow>
            <DetailRow
              icon={CalendarDays}
              label="Scheduled for"
              textClassName="font-normal text-[var(--brand-text-muted)]"
            >
              {dateLabel} • {timeLabel} (PHT)
            </DetailRow>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
