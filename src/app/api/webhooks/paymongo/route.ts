import { NextResponse } from "next/server";
import {
  applyCheckoutSessionPaid,
  isCheckoutSessionPaymentPaid,
  parseCheckoutPaidEvent,
  PaymongoConfigError,
  verifyPaymongoSignature,
} from "@/lib/paymongo";
import {
  isPayMongoEnabled,
  logPaymentsModeOnce,
} from "@/lib/payments/config";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  logPaymentsModeOnce();

  if (!isPayMongoEnabled()) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[paymongo/webhook] Demo Mode — ignoring incoming webhook"
      );
    }
    return NextResponse.json({
      received: true,
      handled: false,
      reason: "paymongo_disabled",
    });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paymongo-signature") ?? "";

  let verification: ReturnType<typeof verifyPaymongoSignature>;
  try {
    verification = verifyPaymongoSignature(rawBody, signatureHeader);
  } catch (err) {
    if (err instanceof PaymongoConfigError) {
      console.error("[paymongo/webhook]", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  if (!verification.ok) {
    console.warn("[paymongo/webhook] Rejected invalid signature:", verification.reason);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const root = payload as {
    data?: { attributes?: { type?: string }; id?: string };
  };
  const eventType = root.data?.attributes?.type ?? "unknown";
  const eventId = root.data?.id ?? null;

  if (process.env.NODE_ENV === "development") {
    console.info("[paymongo/webhook] received", {
      eventId,
      eventType,
      livemodeHint: verification.parts,
    });
  }

  // Acknowledge non-paid events without error (avoid PayMongo retry storms).
  if (!isCheckoutSessionPaymentPaid(eventType)) {
    return NextResponse.json({
      received: true,
      handled: false,
      event_type: eventType,
    });
  }

  const parsed = parseCheckoutPaidEvent(payload);
  if (!parsed) {
    console.warn("[paymongo/webhook] Could not parse checkout paid event", {
      eventId,
      eventType,
    });
    return NextResponse.json({
      received: true,
      handled: false,
      reason: "unparseable_checkout_paid_event",
    });
  }

  try {
    const supabase = await createServiceClient();
    const result = await applyCheckoutSessionPaid(supabase, parsed);

    if (process.env.NODE_ENV === "development") {
      console.info("[paymongo/webhook] processed", result);
    } else if (
      result.outcome === "unknown_checkout" ||
      result.outcome === "not_revivable"
    ) {
      console.warn("[paymongo/webhook] processed with review needed", result);
    }

    return NextResponse.json({
      received: true,
      handled: true,
      result,
    });
  } catch (err) {
    console.error("[paymongo/webhook] processing failed:", err);
    // Return 500 so PayMongo retries transient failures.
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
