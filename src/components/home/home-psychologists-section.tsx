import { createClient } from "@/lib/supabase/server";
import { PsychologistsSection } from "@/components/home/psychologists-section";
import { getPsychologistDisplay } from "@/lib/psychologist-display";
import type { Psychologist } from "@/types/database";

export async function HomePsychologistsSection() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("psychologists")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const psychologists = ((data ?? []) as Psychologist[]).map((p) =>
    getPsychologistDisplay(p.id, p.name, p.title, p.specialties, {
      bio: p.bio,
      photoUrl: p.photo_url,
      slug: p.slug,
    })
  );

  return <PsychologistsSection psychologists={psychologists} />;
}
