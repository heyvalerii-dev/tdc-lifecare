import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientProfileEventType =
  | "photo_changed"
  | "name_changed"
  | "email_changed"
  | "phone_changed"
  | "birthdate_changed"
  | "sex_changed"
  | "assigned_psychologist_changed"
  | "status_changed";

export interface ClientProfileEventInsert {
  event_type: ClientProfileEventType;
  title: string;
  detail?: string | null;
}

export async function insertClientProfileEvents(
  supabase: SupabaseClient,
  {
    clientId,
    createdBy,
    events,
  }: {
    clientId: string;
    createdBy: string;
    events: ClientProfileEventInsert[];
  }
) {
  if (events.length === 0) return;

  const { error } = await supabase.from("client_profile_events").insert(
    events.map((event) => ({
      client_id: clientId,
      event_type: event.event_type,
      title: event.title,
      detail: event.detail ?? null,
      created_by: createdBy,
    }))
  );

  if (error && process.env.NODE_ENV === "development") {
    console.error("[client_profile_events] insert failed:", error);
  }
}

export function changeDetail(
  from: string | null | undefined,
  to: string | null | undefined
): string {
  const left = from?.trim() || "—";
  const right = to?.trim() || "—";
  return `${left} → ${right}`;
}
