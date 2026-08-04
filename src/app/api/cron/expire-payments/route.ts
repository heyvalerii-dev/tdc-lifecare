import { NextResponse } from "next/server";
import { logActivities, systemActor, type LogActivityInput } from "@/lib/activity";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  // Status-guarded update: concurrent runs / webhook races cannot expire
  // appointments that are no longer pending_payment.
  const { data: expiredAppointments, error: expireError } = await supabase
    .from("appointments")
    .update({ status: "expired", updated_at: now })
    .eq("status", "pending_payment")
    .lt("payment_due_at", now)
    .select("id");

  if (expireError) {
    return NextResponse.json({ error: expireError.message }, { status: 500 });
  }

  if (!expiredAppointments?.length) {
    return NextResponse.json({ expired: 0 });
  }

  const ids = expiredAppointments.map((a) => a.id);

  await supabase
    .from("payments")
    .update({ status: "expired", updated_at: now })
    .in("appointment_id", ids)
    .eq("status", "pending");

  const actor = systemActor();
  const activities: LogActivityInput[] = ids.map((id) => ({
    entityType: "appointment",
    entityId: id,
    ...actor,
    action: "payment_expired",
    source: "System",
    metadata: {
      oldStatus: "pending_payment",
      newStatus: "expired",
    },
  }));
  await logActivities(supabase, activities);

  return NextResponse.json({ expired: ids.length });
}
