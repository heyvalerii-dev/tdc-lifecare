import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatClinicDateTime } from "@/lib/datetime";
import { formatCurrency } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import type { AppointmentWithRelations } from "@/types/database";
import { ChevronRight } from "lucide-react";

interface AppointmentCardProps {
  appointment: AppointmentWithRelations;
  href: string;
  showClient?: boolean;
}

export function AppointmentCard({ appointment, href, showClient }: AppointmentCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                status={appointment.status}
                label={APPOINTMENT_STATUS_LABELS[appointment.status]}
              />
              {appointment.is_admin_booking && (
                <span className="text-xs text-[var(--brand-text-muted)]">Admin booking</span>
              )}
            </div>
            <p className="mt-2 font-medium text-[var(--brand-text)]">
              {appointment.service?.name ?? "Service"}
            </p>
            <p className="text-sm text-[var(--brand-text-muted)]">
              {appointment.psychologist?.name ?? "Psychologist"}
            </p>
            {showClient && appointment.client && (
              <p className="text-sm text-[var(--brand-text-muted)]">{appointment.client.full_name ?? appointment.client.email}</p>
            )}
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
              {formatClinicDateTime(appointment.start_at)}
            </p>
            {appointment.service && (
              <p className="mt-1 text-sm font-medium text-[var(--brand-purple)]">
                {formatCurrency(appointment.service.price_cents)}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--brand-text-muted)]" />
        </CardContent>
      </Card>
    </Link>
  );
}
