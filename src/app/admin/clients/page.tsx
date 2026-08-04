import { createClient } from "@/lib/supabase/server";
import { ClientsListView } from "@/components/admin/clients/clients-list-view";
import { buildClientListRows } from "@/lib/admin-clients-list";
import { adminWideContainer } from "@/lib/admin-layout";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { ADMIN_APPOINTMENT_CLIENT_CARD_SELECT } from "@/lib/appointment-selects";
import type {
  AppointmentWithRelations,
  Profile,
  Psychologist,
  QuestionnaireResponse,
} from "@/types/database";

export default async function AdminClientsPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: appointments },
    { data: psychologists },
    { data: questionnaireResponses },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("full_name", { ascending: true }),
    supabase
      .from("appointments")
      .select(ADMIN_APPOINTMENT_CLIENT_CARD_SELECT)
      .order("start_at", { ascending: false })
      .returns<AppointmentWithRelations[]>(),
    supabase.from("psychologists").select("*").order("name", { ascending: true }),
    supabase
      .from("questionnaire_responses")
      .select("*, questionnaire:questionnaires(title)")
      .order("submitted_at", { ascending: false }),
  ]);

  const typedPsychologists = (psychologists ?? []) as Psychologist[];

  const clients = buildClientListRows(
    (profiles ?? []) as Profile[],
    (appointments ?? []) as AppointmentWithRelations[],
    (questionnaireResponses ?? []) as Array<
      QuestionnaireResponse & {
        questionnaire?: { title?: string | null } | null;
      }
    >,
    typedPsychologists
  );

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <div className="mb-8 space-y-2">
        <h1 className={type.pageTitle}>Clients</h1>
        <p className={cn(type.bodyMuted, "text-base")}>
          Profiles, appointments, and intake history for every client.
        </p>
      </div>

      <ClientsListView
        clients={clients}
        psychologists={typedPsychologists.filter((p) => p.is_active)}
      />
    </div>
  );
}
