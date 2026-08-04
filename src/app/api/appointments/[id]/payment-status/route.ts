import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Lightweight status for return-URL reconciliation.
 * Does not trust the browser redirect — clients poll until webhook (or demo
 * simulation) confirms payment.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing appointment id" }, { status: 400 });
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // Service role for consistent reads (public /pay links + authenticated booking).
  const supabase = await createServiceClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(
      "id, client_id, status, payment:payments(id, status, paid_at, method)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user) {
    const { data: profile } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.role === "admin";
    const isOwner = appointment.client_id === user.id;
    if (!isAdmin && !isOwner) {
      // Allow status check for shareable pay links (UUID secrecy).
      // Still withhold client_id from the response below.
    }
  }

  const payment = Array.isArray(appointment.payment)
    ? appointment.payment[0]
    : appointment.payment;

  const appointmentStatus = appointment.status as string;
  const paymentStatus = (payment?.status as string | undefined) ?? null;
  const isPaid =
    paymentStatus === "paid" ||
    paymentStatus === "waived" ||
    appointmentStatus === "confirmed";
  const isConfirmed = appointmentStatus === "confirmed";

  return NextResponse.json({
    appointment_id: appointment.id,
    appointment_status: appointmentStatus,
    payment_status: paymentStatus,
    paid_at: payment?.paid_at ?? null,
    is_paid: isPaid,
    is_confirmed: isConfirmed,
    ready: isPaid && isConfirmed,
  });
}
