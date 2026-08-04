import {
  AdminListMobileCard,
  AdminListMobileCardBody,
  AdminListMobileCardHeader,
  AdminListMobileCardPillRow,
  AdminListMobileDetailsRows,
  AdminListMobileInfoRow,
  adminListMobileCardPolishedClass,
} from "@/components/admin/list/admin-list-mobile-card";
import { ClientStatusPill } from "@/components/admin/clients/client-status-pill";
import { Avatar } from "@/components/ui/avatar";
import { getPsychologistIdentityColorById } from "@/lib/admin-calendar";
import {
  formatClientListDateTime,
  type ClientListRow,
} from "@/lib/admin-clients-list";
import { CalendarDays, HeartHandshake } from "lucide-react";
import type { Psychologist } from "@/types/database";

interface ClientsListMobileCardProps {
  client: ClientListRow;
  psychologists: Psychologist[];
}

export function ClientsListMobileCard({
  client,
  psychologists,
}: ClientsListMobileCardProps) {
  const psychologist = client.assignedPsychologist;
  const psychologistColor = psychologist
    ? getPsychologistIdentityColorById(psychologist.id, psychologists)
    : undefined;

  return (
    <AdminListMobileCard
      href={`/admin/clients/${client.id}`}
      aria-label={`View ${client.name}`}
      showChevron={false}
      className={adminListMobileCardPolishedClass}
    >
      <AdminListMobileCardBody
        avatar={
          <Avatar
            name={client.name}
            email={client.email}
            src={client.avatarUrl}
            size="sm"
          />
        }
      >
        <AdminListMobileCardHeader title={client.name} />

        <AdminListMobileCardPillRow>
          <ClientStatusPill status={client.status} />
        </AdminListMobileCardPillRow>

        {(psychologist || client.nextAppointment) && (
          <AdminListMobileDetailsRows>
            {psychologist ? (
              <AdminListMobileInfoRow
                icon={HeartHandshake}
                iconStyle={
                  psychologistColor ? { color: psychologistColor } : undefined
                }
                textClassName="text-[var(--brand-text)]"
              >
                {psychologist.name}
              </AdminListMobileInfoRow>
            ) : null}

            {client.nextAppointment ? (
              <AdminListMobileInfoRow
                icon={CalendarDays}
                textClassName="font-medium text-[var(--brand-text)]"
              >
                {formatClientListDateTime(client.nextAppointment.start_at)}
              </AdminListMobileInfoRow>
            ) : null}
          </AdminListMobileDetailsRows>
        )}
      </AdminListMobileCardBody>
    </AdminListMobileCard>
  );
}
