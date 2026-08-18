import { createClient } from "@/lib/supabase/server";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";
import { PSYCHOLOGIST_SLUGS, resolvePsychologistId } from "@/lib/psychologist-slugs";
import type { Psychologist, Service, Questionnaire } from "@/types/database";

export { PSYCHOLOGIST_SLUGS, resolvePsychologistId };

export async function getBookingPageData() {
  const supabase = await createClient();
  const settings = await getClinicSettings();

  const [{ data: psychologists }, { data: psLinks }, { data: services }, { data: questionnaire }] =
    await Promise.all([
      supabase.from("psychologists").select("*").eq("is_active", true),
      supabase.from("psychologist_services").select("*"),
      supabase.from("services").select("*").eq("is_active", true),
      supabase.from("questionnaires").select("*").eq("is_active", true).limit(1).single(),
    ]);

  const psychologistsWithServices = (psychologists ?? [])
    .map((p) => ({
      ...(p as Psychologist),
      services: (psLinks ?? [])
        .filter((link) => link.psychologist_id === p.id)
        .map((link) => (services ?? []).find((s) => s.id === link.service_id))
        .filter(Boolean) as Service[],
    }))
    .filter((p) => p.services.length > 0);

  return {
    psychologists: psychologistsWithServices,
    questionnaire: (questionnaire as Questionnaire) ?? null,
    workingDays: getClinicWorkingDays(settings),
  };
}
