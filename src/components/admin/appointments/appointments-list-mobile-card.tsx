import {
  AdminListMobileCard,
  AdminListMobileCardBody,
  AdminListMobileCardHeader,
  AdminListMobileCardPillRow,
  AdminListMobileDetailsRows,
  AdminListMobileInfoRow,
  adminListMobileCardPolishedClass,
} from "@/components/admin/list/admin-list-mobile-card";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import { Avatar } from "@/components/ui/avatar";
import { getPsychologistIdentityColorById } from "@/lib/admin-calendar";
import {
  formatAppointmentListDateTime,
  getAppointmentClientName,
} from "@/lib/admin-appointments-list";
import { CalendarDays, HeartHandshake, HeartPulse } from "lucide-react";
import type { AppointmentWithRelations, Psychologist } from "@/types/database";

interface AppointmentsListMobileCardProps {
  appointment: AppointmentWithRelations;
  psychologists: Psychologist[];
}

export function AppointmentsListMobileCard({
  appointment,
  psychologists,
}: AppointmentsListMobileCardProps) {
  const clientName = getAppointmentClientName(appointment);
  const psychologistColor = getPsychologistIdentityColorById(
    appointment.psychologist_id,
    psychologists
  );

  return (
    <AdminListMobileCard
      href={`/admin/appointments/${appointment.id}`}
      aria-label={`View appointment for ${clientName}`}
      showChevron={false}
      className={adminListMobileCardPolishedClass}
    >
      <AdminListMobileCardBody
        avatar={
          <Avatar
            name={clientName}
            email={appointment.client?.email}
            src={appointment.client?.avatar_url}
            size="sm"
          />
        }
      >
        <AdminListMobileCardHeader title={clientName} />

        <AdminListMobileCardPillRow>
          <AdminAppointmentStatusPill status={appointment.status} />
        </AdminListMobileCardPillRow>

        <AdminListMobileDetailsRows>
          {appointment.psychologist?.name ? (
            <AdminListMobileInfoRow
              icon={HeartHandshake}
              iconStyle={{ color: psychologistColor }}
              textClassName="text-[var(--brand-text)]"
            >
              {appointment.psychologist.name}
            </AdminListMobileInfoRow>
          ) : null}

          <AdminListMobileInfoRow
            icon={CalendarDays}
            textClassName="font-medium text-[var(--brand-text)]"
          >
            {formatAppointmentListDateTime(appointment.start_at)}
          </AdminListMobileInfoRow>

          <AdminListMobileInfoRow
            icon={HeartPulse}
            textClassName="font-normal text-[var(--brand-text-muted)]"
          >
            {appointment.service?.name ?? "Appointment"}
          </AdminListMobileInfoRow>
        </AdminListMobileDetailsRows>
      </AdminListMobileCardBody>
    </AdminListMobileCard>
  );
}
