import { createClient } from "@/lib/supabase/server";
import { PsychologistsListView } from "@/components/admin/psychologists/psychologists-list-view";
import { buildPsychologistListRows } from "@/lib/admin-psychologists-list";
import { adminWideContainer } from "@/lib/admin-layout";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { ADMIN_APPOINTMENT_WITH_AVATAR_SELECT } from "@/lib/appointment-selects";
import type {
  AppointmentWithRelations,
  Psychologist,
} from "@/types/database";

export default async function AdminPsychologistsPage() {
  const supabase = await createClient();

  const [{ data: psychologists }, { data: appointments }] = await Promise.all([
    supabase.from("psychologists").select("*").order("name"),
    supabase
      .from("appointments")
      .select(ADMIN_APPOINTMENT_WITH_AVATAR_SELECT)
      .order("start_at", { ascending: true })
      .returns<AppointmentWithRelations[]>(),
  ]);

  const rows = buildPsychologistListRows(
    (psychologists ?? []) as Psychologist[],
    (appointments ?? []) as AppointmentWithRelations[]
  );

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <div className="mb-8 space-y-2">
        <h1 className={type.pageTitle}>Psychologists</h1>
        <p className={cn(type.bodyMuted, "text-base")}>
          Profiles, availability, services, and upcoming sessions.
        </p>
      </div>

      <PsychologistsListView rows={rows} />
    </div>
  );
}
