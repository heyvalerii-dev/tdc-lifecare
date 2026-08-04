import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  adminActor,
  logActivities,
  type LogActivityInput,
} from "@/lib/activity";
import {
  changeDetail,
  insertClientProfileEvents,
  type ClientProfileEventInsert,
} from "@/lib/client-profile-events";
import { CLIENT_SEX_LABELS } from "@/lib/client-profile";
import { getPsychologistShortName } from "@/lib/admin-calendar";
import type { ClientSex, Profile } from "@/types/database";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SEX_VALUES = new Set<ClientSex>([
  "female",
  "male",
  "other",
  "prefer_not_to_say",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function sameText(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return (a?.trim() || "") === (b?.trim() || "");
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();

  const { data: existing, error: existingError } = await auth.supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "client")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const current = existing as Profile;
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  };
  const events: ClientProfileEventInsert[] = [];

  const firstName =
    typeof body.first_name === "string"
      ? body.first_name.trim()
      : current.first_name ?? "";
  const lastName =
    typeof body.last_name === "string"
      ? body.last_name.trim()
      : current.last_name ?? "";

  if (typeof body.first_name === "string" || typeof body.last_name === "string") {
    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 }
      );
    }
    if (!lastName) {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();
    updates.first_name = firstName;
    updates.last_name = lastName;
    updates.full_name = fullName;

    const prevName =
      current.full_name?.trim() ||
      `${current.first_name ?? ""} ${current.last_name ?? ""}`.trim();
    if (!sameText(prevName, fullName)) {
      events.push({
        event_type: "name_changed",
        title: "Name changed",
        detail: changeDetail(prevName, fullName),
      });
    }
  }

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 }
      );
    }
    updates.email = email;
    if (!sameText(current.email, email)) {
      const { error: authError } = await auth.supabase.auth.admin.updateUserById(
        id,
        { email }
      );
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
      events.push({
        event_type: "email_changed",
        title: "Email changed",
        detail: changeDetail(current.email, email),
      });
    }
  }

  if (typeof body.phone === "string" || body.phone === null) {
    const phone = emptyToNull(body.phone);
    updates.phone = phone;
    if (!sameText(current.phone, phone)) {
      events.push({
        event_type: "phone_changed",
        title: "Phone changed",
        detail: changeDetail(current.phone, phone),
      });
    }
  }

  if (typeof body.birthdate === "string" || body.birthdate === null) {
    const birthdate = emptyToNull(body.birthdate);
    if (birthdate && Number.isNaN(Date.parse(birthdate))) {
      return NextResponse.json(
        { error: "Enter a valid birthdate" },
        { status: 400 }
      );
    }
    updates.birthdate = birthdate;
    if (!sameText(current.birthdate, birthdate)) {
      events.push({
        event_type: "birthdate_changed",
        title: "Birthdate changed",
        detail: changeDetail(current.birthdate, birthdate),
      });
    }
  }

  if (typeof body.sex === "string" || body.sex === null) {
    const sexRaw = emptyToNull(body.sex);
    if (sexRaw && !SEX_VALUES.has(sexRaw as ClientSex)) {
      return NextResponse.json(
        { error: "Select a valid sex option" },
        { status: 400 }
      );
    }
    const sex = (sexRaw as ClientSex | null) ?? null;
    updates.sex = sex;
    if (current.sex !== sex) {
      events.push({
        event_type: "sex_changed",
        title: "Sex changed",
        detail: changeDetail(
          current.sex ? CLIENT_SEX_LABELS[current.sex] : null,
          sex ? CLIENT_SEX_LABELS[sex] : null
        ),
      });
    }
  }

  if (
    typeof body.assigned_psychologist_id === "string" ||
    body.assigned_psychologist_id === null
  ) {
    const assignedId = emptyToNull(body.assigned_psychologist_id);
    updates.assigned_psychologist_id = assignedId;

    if (current.assigned_psychologist_id !== assignedId) {
      const ids = [current.assigned_psychologist_id, assignedId].filter(
        Boolean
      ) as string[];
      let nameById = new Map<string, string>();
      if (ids.length > 0) {
        const { data: psychs } = await auth.supabase
          .from("psychologists")
          .select("id, name")
          .in("id", ids);
        nameById = new Map(
          (psychs ?? []).map((p) => [
            p.id as string,
            getPsychologistShortName(p.name as string),
          ])
        );
      }

      events.push({
        event_type: "assigned_psychologist_changed",
        title: "Assigned psychologist changed",
        detail: changeDetail(
          current.assigned_psychologist_id
            ? nameById.get(current.assigned_psychologist_id) ?? "Unknown"
            : "Unassigned",
          assignedId ? nameById.get(assignedId) ?? "Unknown" : "Unassigned"
        ),
      });
    }
  }

  if (typeof body.is_active === "boolean") {
    updates.is_active = body.is_active;
    if (Boolean(current.is_active) !== body.is_active) {
      events.push({
        event_type: "status_changed",
        title: "Status changed",
        detail: changeDetail(
          current.is_active ? "Active" : "Inactive",
          body.is_active ? "Active" : "Inactive"
        ),
      });
    }
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .eq("role", "client")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (typeof updates.full_name === "string") {
    await auth.supabase.auth.admin.updateUserById(id, {
      user_metadata: { full_name: updates.full_name },
    });
  }

  await insertClientProfileEvents(auth.supabase, {
    clientId: id,
    createdBy: auth.user.id,
    events,
  });

  const actor = adminActor(auth.user.id);
  const activity: LogActivityInput[] = events.map((event) => {
    if (event.event_type === "assigned_psychologist_changed") {
      const [from, to] = (event.detail ?? "— → —").split("→").map((s) => s.trim());
      return {
        entityType: "client" as const,
        entityId: id,
        ...actor,
        action: "assigned_psychologist_changed" as const,
        source: "Admin Panel",
        metadata: {
          oldPsychologist: from || "—",
          newPsychologist: to || "—",
        },
      };
    }
    if (event.event_type === "status_changed") {
      const [from, to] = (event.detail ?? "— → —").split("→").map((s) => s.trim());
      return {
        entityType: "client" as const,
        entityId: id,
        ...actor,
        action: "status_changed" as const,
        source: "Admin Panel",
        metadata: { oldStatus: from || "—", newStatus: to || "—" },
      };
    }
    return {
      entityType: "client" as const,
      entityId: id,
      ...actor,
      action: "profile_updated" as const,
      source: "Admin Panel",
      metadata: {
        description: event.title,
        detail: event.detail,
      },
    };
  });

  await logActivities(auth.supabase, activity);

  return NextResponse.json({ client: data });
}
