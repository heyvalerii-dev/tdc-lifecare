import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import type { Profile, Psychologist, Service } from "@/types/database";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [
    { data: psychologists, error: psychError },
    { data: psLinks, error: linkError },
    { data: services, error: serviceError },
    { data: clients, error: clientError },
  ] = await Promise.all([
    auth.supabase.from("psychologists").select("*").eq("is_active", true),
    auth.supabase.from("psychologist_services").select("*"),
    auth.supabase.from("services").select("*").eq("is_active", true),
    auth.supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "client")
      .order("full_name"),
  ]);

  if (psychError || linkError || serviceError || clientError) {
    return NextResponse.json(
      {
        error:
          psychError?.message ||
          linkError?.message ||
          serviceError?.message ||
          clientError?.message ||
          "Failed to load booking options",
      },
      { status: 500 }
    );
  }

  const psychologistsWithServices = ((psychologists ?? []) as Psychologist[])
    .map((psych) => ({
      ...psych,
      services: (psLinks ?? [])
        .filter((link) => link.psychologist_id === psych.id)
        .map((link) =>
          ((services ?? []) as Service[]).find((s) => s.id === link.service_id)
        )
        .filter(Boolean) as Service[],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    psychologists: psychologistsWithServices,
    clients: (clients ?? []) as Pick<
      Profile,
      "id" | "full_name" | "email" | "role"
    >[],
  });
}
