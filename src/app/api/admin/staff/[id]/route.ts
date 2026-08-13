import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import {
  parseStaffRole,
  staffRoleChangeError,
  type StaffProfile,
} from "@/lib/admin-staff";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const nextRole = parseStaffRole(body.role);
  if (!nextRole) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("profiles")
    .select("id, email, full_name, first_name, last_name, avatar_url, role")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const current = existing as StaffProfile;
  const blocked = staffRoleChangeError({
    actorId: auth.user.id,
    targetId: current.id,
    currentRole: current.role,
    nextRole,
  });
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 400 });
  }

  if (current.role === nextRole) {
    return NextResponse.json({ profile: current });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await auth.supabase
    .from("profiles")
    .update({
      role: nextRole,
      updated_at: now,
      updated_by: auth.user.id,
    })
    .eq("id", id)
    .select("id, email, full_name, first_name, last_name, avatar_url, role")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity(auth.supabase, {
    entityType: "client",
    entityId: id,
    ...adminActor(auth.user.id),
    action:
      nextRole === "admin" ? "admin_access_granted" : "admin_access_revoked",
    source: "Admin Panel",
    metadata: {
      email: current.email,
      previous_role: current.role,
      next_role: nextRole,
    },
  });

  return NextResponse.json({ profile: updated });
}
