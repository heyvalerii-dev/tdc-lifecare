import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import type { AppointmentStatus } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

type ActionBody =
  | { type: "complete" }
  | { type: "cancel" }
  | { type: "no_show" }
  | { type: "mark_payment_received" };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as ActionBody;
  const actor = adminActor(auth.user.id);
  const now = new Date().toISOString();

  const { data: existing, error: loadError } = await auth.supabase
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (body.type === "mark_payment_received") {
    await auth.supabase
      .from("payments")
      .update({ status: "paid", paid_at: now, updated_at: now })
      .eq("appointment_id", id);

    const { error } = await auth.supabase
      .from("appointments")
      .update({
        status: "confirmed" satisfies AppointmentStatus,
        updated_by: auth.user.id,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity(auth.supabase, {
      entityType: "appointment",
      entityId: id,
      ...actor,
      action: "payment_confirmed",
      source: "Admin Panel",
    });

    return NextResponse.json({ ok: true });
  }

  const statusMap = {
    complete: "completed",
    cancel: "cancelled",
    no_show: "no_show",
  } as const;

  if (!(body.type in statusMap)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const status = statusMap[body.type as keyof typeof statusMap];
  const updates: Record<string, unknown> = {
    status,
    updated_by: auth.user.id,
    updated_at: now,
  };
  if (status === "completed") updates.completed_at = now;
  if (status === "cancelled") updates.cancelled_at = now;
  if (status === "no_show") updates.no_show_at = now;

  const { error } = await auth.supabase
    .from("appointments")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action =
    status === "completed"
      ? "appointment_completed"
      : status === "cancelled"
        ? "appointment_cancelled"
        : "appointment_no_show";

  await logActivity(auth.supabase, {
    entityType: "appointment",
    entityId: id,
    ...actor,
    action,
    source: "Admin Panel",
    metadata: {
      oldStatus: existing.status,
      newStatus: status,
    },
  });

  return NextResponse.json({ ok: true });
}
