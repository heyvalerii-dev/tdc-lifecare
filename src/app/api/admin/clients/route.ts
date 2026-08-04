import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import type { ClientSex } from "@/types/database";

const SEX_VALUES = new Set<ClientSex>([
  "female",
  "male",
  "other",
  "prefer_not_to_say",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateClientInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  birthdate?: string | null;
  sex?: ClientSex | null;
  assigned_psychologist_id?: string | null;
  is_active?: boolean;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
}

function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateCreateClient(body: CreateClientInput) {
  const firstName = emptyToNull(body.first_name);
  const lastName = emptyToNull(body.last_name);
  const email = emptyToNull(body.email)?.toLowerCase() ?? null;

  if (!firstName) return "First name is required";
  if (!lastName) return "Last name is required";
  if (!email) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address";

  if (
    body.sex != null &&
    typeof body.sex === "string" &&
    body.sex.length > 0 &&
    !SEX_VALUES.has(body.sex as ClientSex)
  ) {
    return "Select a valid sex option";
  }

  if (body.birthdate) {
    const date = String(body.birthdate).trim();
    if (date && Number.isNaN(Date.parse(date))) {
      return "Enter a valid birthdate";
    }
  }

  return null;
}

function randomPassword() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

/** Create a client auth user + profile (manual / walk-in entry). */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as CreateClientInput;
  const validationError = validateCreateClient(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const firstName = body.first_name.trim();
  const lastName = body.last_name.trim();
  const email = body.email.trim().toLowerCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const sex =
    body.sex && SEX_VALUES.has(body.sex) ? body.sex : null;
  const birthdate = emptyToNull(body.birthdate);
  const assignedPsychologistId = emptyToNull(body.assigned_psychologist_id);
  const isActive = body.is_active !== false;

  const { data: authData, error: authError } =
    await auth.supabase.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "client",
      },
    });

  if (authError || !authData.user) {
    const message = authError?.message ?? "Could not create client account";
    const status = message.toLowerCase().includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const userId = authData.user.id;
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .update({
      email,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: emptyToNull(body.phone),
      birthdate,
      sex,
      address: emptyToNull(body.address),
      city: emptyToNull(body.city),
      province: emptyToNull(body.province),
      emergency_contact_name: emptyToNull(body.emergency_contact_name),
      emergency_contact_relationship: emptyToNull(
        body.emergency_contact_relationship
      ),
      emergency_contact_phone: emptyToNull(body.emergency_contact_phone),
      assigned_psychologist_id: assignedPsychologistId,
      is_active: isActive,
      role: "client",
      created_by: auth.user.id,
      updated_by: auth.user.id,
      updated_at: now,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (profileError || !profile) {
    await auth.supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: profileError?.message ?? "Could not save client profile" },
      { status: 500 }
    );
  }

  await logActivity(auth.supabase, {
    entityType: "client",
    entityId: userId,
    ...adminActor(auth.user.id),
    action: "client_created",
    source: "Admin Panel",
  });

  return NextResponse.json({ client: profile });
}
