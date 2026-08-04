import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import {
  assertPaymongoConfigured,
  createCheckoutSession,
  PaymongoConfigError,
} from "@/lib/paymongo";
import {
  isPayMongoEnabled,
  logPaymentsModeOnce,
} from "@/lib/payments/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ReturnTo = "book" | "pay";

function resolveReturnTo(value: unknown): ReturnTo {
  return value === "book" ? "book" : "pay";
}

export async function POST(request: Request) {
  logPaymentsModeOnce();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { appointment_id?: string; return_to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const appointmentId =
    typeof body.appointment_id === "string" ? body.appointment_id.trim() : "";
  if (!appointmentId) {
    return NextResponse.json(
      { error: "Missing appointment_id" },
      { status: 400 }
    );
  }

  const returnTo = resolveReturnTo(body.return_to);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select(
      "id, client_id, status, payment_due_at, service:services(id, name, price_cents), psychologist:psychologists(name), payment:payments(id, status, amount_cents, method, paymongo_checkout_id, expires_at, metadata)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError) {
    return NextResponse.json(
      { error: appointmentError.message },
      { status: 500 }
    );
  }

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  if (!isAdmin && appointment.client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.status !== "pending_payment") {
    return NextResponse.json(
      { error: "Appointment is not awaiting payment" },
      { status: 400 }
    );
  }

  if (
    appointment.payment_due_at &&
    new Date(appointment.payment_due_at).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "Payment hold has expired for this appointment" },
      { status: 400 }
    );
  }

  const paymentRow = Array.isArray(appointment.payment)
    ? appointment.payment[0]
    : appointment.payment;

  if (!paymentRow) {
    return NextResponse.json(
      { error: "Payment record not found for appointment" },
      { status: 404 }
    );
  }

  if (paymentRow.status !== "pending") {
    return NextResponse.json(
      { error: "Payment is not awaiting checkout" },
      { status: 400 }
    );
  }

  const service = Array.isArray(appointment.service)
    ? appointment.service[0]
    : appointment.service;
  const psychologist = Array.isArray(appointment.psychologist)
    ? appointment.psychologist[0]
    : appointment.psychologist;

  if (!service || typeof service.price_cents !== "number") {
    return NextResponse.json(
      { error: "Service price could not be loaded" },
      { status: 500 }
    );
  }

  // Always charge the DB service price — never trust the client.
  const amountCents = service.price_cents;
  const psychologistName =
    (psychologist as { name?: string } | null)?.name?.trim() || "Psychologist";
  const description = `${service.name} with ${psychologistName}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 }
    );
  }

  const successUrl =
    returnTo === "book"
      ? `${appUrl}/book?confirmed=${appointmentId}`
      : `${appUrl}/pay/${appointmentId}?success=true`;
  const cancelUrl =
    returnTo === "book"
      ? `${appUrl}/book?payment=cancelled&appointment=${appointmentId}`
      : `${appUrl}/pay/${appointmentId}?cancelled=true`;

  // -------------------------------------------------------------------------
  // Demo Mode — simulate webhook confirmation locally (no PayMongo API).
  // Same client UX: redirect to success URL, then poll until ready.
  // -------------------------------------------------------------------------
  if (!isPayMongoEnabled()) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[create-checkout] Demo Mode — simulating payment confirmation"
      );
    }

    const serviceClient = await createServiceClient();
    const now = new Date().toISOString();

    await serviceClient
      .from("payments")
      .update({
        status: "paid",
        paid_at: now,
        method: "paymongo",
        amount_cents: amountCents,
        updated_at: now,
        metadata: { mode: "demo", simulated_webhook: true },
      })
      .eq("id", paymentRow.id)
      .eq("status", "pending");

    await serviceClient
      .from("appointments")
      .update({ status: "confirmed", updated_at: now })
      .eq("id", appointmentId)
      .eq("status", "pending_payment");

    await logActivity(serviceClient, {
      entityType: "appointment",
      entityId: appointmentId,
      actorId: user.id,
      actorType: isAdmin ? "admin" : "client",
      action: "payment_confirmed",
      source: isAdmin ? "Admin Panel" : "Online Booking",
      metadata: {
        mode: "demo",
        paymentId: paymentRow.id,
        amountCents,
        description,
        simulatedWebhook: true,
      },
    });

    const response = {
      checkout_url: successUrl,
      checkout_id: null,
      mode: "demo" as const,
    };
    console.log("Create checkout response:", response);
    return NextResponse.json(response);
  }

  // -------------------------------------------------------------------------
  // PayMongo Enabled
  // -------------------------------------------------------------------------
  try {
    assertPaymongoConfigured();
  } catch (err) {
    const message =
      err instanceof PaymongoConfigError
        ? err.message
        : "PayMongo is not configured";
    console.error("[create-checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let checkoutId: string;
  let checkoutUrl: string;
  try {
    const session = await createCheckoutSession({
      amountCents,
      description,
      successUrl,
      cancelUrl,
      metadata: {
        appointment_id: appointmentId,
        payment_id: paymentRow.id,
      },
    });
    checkoutId = session.checkoutId;
    checkoutUrl = session.checkoutUrl;
  } catch (err) {
    if (err instanceof PaymongoConfigError) {
      console.error("[create-checkout]", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error("[create-checkout] PayMongo API error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not create PayMongo checkout session",
      },
      { status: 502 }
    );
  }

  // Persist checkout ID with service role (clients cannot UPDATE payments under RLS).
  // Retry overwrites paymongo_checkout_id with the latest session; prior IDs are kept in
  // metadata so ops can reconcile, and webhooks fall back to metadata.payment_id.
  const serviceClient = await createServiceClient();
  const now = new Date().toISOString();
  const priorMeta =
    paymentRow &&
    typeof (paymentRow as { metadata?: unknown }).metadata === "object" &&
    (paymentRow as { metadata?: Record<string, unknown> }).metadata
      ? ((paymentRow as { metadata?: Record<string, unknown> }).metadata ?? {})
      : {};
  const priorCheckoutIds = Array.isArray(priorMeta.prior_checkout_ids)
    ? priorMeta.prior_checkout_ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      )
    : [];
  if (
    typeof paymentRow.paymongo_checkout_id === "string" &&
    paymentRow.paymongo_checkout_id &&
    paymentRow.paymongo_checkout_id !== checkoutId &&
    !priorCheckoutIds.includes(paymentRow.paymongo_checkout_id)
  ) {
    priorCheckoutIds.push(paymentRow.paymongo_checkout_id);
  }

  const { data: updatedPayment, error: updateError } = await serviceClient
    .from("payments")
    .update({
      paymongo_checkout_id: checkoutId,
      method: "paymongo",
      amount_cents: amountCents,
      updated_at: now,
      metadata: {
        ...priorMeta,
        prior_checkout_ids: priorCheckoutIds,
        latest_checkout_id: checkoutId,
      },
    })
    .eq("id", paymentRow.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updatedPayment) {
    console.error(
      "[create-checkout] Failed to persist checkout id — aborting redirect",
      {
        appointmentId,
        checkoutId,
        error: updateError?.message,
      }
    );
    return NextResponse.json(
      {
        error:
          "Checkout was created but could not be saved. Please try again.",
      },
      { status: 500 }
    );
  }

  await logActivity(serviceClient, {
    entityType: "appointment",
    entityId: appointmentId,
    actorId: user.id,
    actorType: isAdmin ? "admin" : "client",
    action: "checkout_created",
    source: isAdmin ? "Admin Panel" : "Online Booking",
    metadata: {
      mode: "paymongo",
      checkoutId,
      paymentId: paymentRow.id,
      amountCents,
    },
  });

  const response = {
    checkout_url: checkoutUrl,
    checkout_id: checkoutId,
    mode: "paymongo" as const,
  };
  console.log("Create checkout response:", response);
  return NextResponse.json(response);
}
