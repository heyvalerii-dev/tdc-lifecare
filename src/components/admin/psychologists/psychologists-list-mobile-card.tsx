import {
  AdminListMobileCard,
  AdminListMobileCardBody,
  AdminListMobileCardHeader,
  AdminListMobileCardPillRow,
  AdminListMobileDetailsRows,
  AdminListMobileInfoRow,
  adminListMobileCardPolishedClass,
} from "@/components/admin/list/admin-list-mobile-card";
import { PsychologistStatusPill } from "@/components/admin/psychologists/psychologist-status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  formatPsychologistListDateTime,
  type PsychologistListRow,
} from "@/lib/admin-psychologists-list";
import { getPsychologistDisplay } from "@/lib/psychologist-display";
import { psychologistAdminPath } from "@/lib/psychologist-slugs";
import { CalendarDays } from "lucide-react";

interface PsychologistsListMobileCardProps {
  row: PsychologistListRow;
}

export function PsychologistsListMobileCard({
  row,
}: PsychologistsListMobileCardProps) {
  const { psychologist } = row;
  const display = getPsychologistDisplay(
    psychologist.id,
    psychologist.name,
    psychologist.title,
    psychologist.specialties,
    {
      bio: psychologist.bio,
      photoUrl: psychologist.photo_url,
      slug: psychologist.slug,
    }
  );

  return (
    <AdminListMobileCard
      href={psychologistAdminPath(psychologist.slug)}
      aria-label={`View ${psychologist.name}`}
      showChevron={false}
      className={adminListMobileCardPolishedClass}
    >
      <AdminListMobileCardBody
        avatar={
          <Avatar name={psychologist.name} src={display.photo} size="sm" />
        }
      >
        <AdminListMobileCardHeader title={psychologist.name} />

        <AdminListMobileCardPillRow>
          <PsychologistStatusPill isActive={psychologist.is_active} />
        </AdminListMobileCardPillRow>

        {row.upcomingAppointment ? (
          <AdminListMobileDetailsRows>
            <AdminListMobileInfoRow
              icon={CalendarDays}
              textClassName="font-medium text-[var(--brand-text)]"
            >
              {formatPsychologistListDateTime(row.upcomingAppointment.start_at)}
            </AdminListMobileInfoRow>
          </AdminListMobileDetailsRows>
        ) : null}
      </AdminListMobileCardBody>
    </AdminListMobileCard>
  );
}
