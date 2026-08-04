import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activity";
import {
  getPaymongoSecretKey,
  getPaymongoWebhookSecret,
  isPaymongoLiveMode,
} from "@/lib/paymongo/client";
import type {
  ApplyCheckoutPaidOutcome,
  ConfirmPaymentDecision,
  ParsedCheckoutPaidEvent,
  PaymongoSignatureParts,
} from "@/lib/paymongo/types";

/** Reject webhook timestamps older/newer than this (replay protection). */
export const PAYMONGO_WEBHOOK_MAX_SKEW_SECONDS = 300;

export class PaymongoSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymongoSignatureError";
  }
}

export function parsePaymongoSignatureHeader(
  header: string
): PaymongoSignatureParts | null {
  if (!header.trim()) return null;

  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const eq = segment.indexOf("=");
    if (eq <= 0) continue;
    const key = segment.slice(0, eq).trim();
    const value = segment.slice(eq + 1).trim();
    if (key && value) parts[key] = value;
  }

  if (!parts.t) return null;

  return {
    timestamp: parts.t,
    testSignature: parts.te ?? "",
    liveSignature: parts.li ?? "",
  };
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verify PayMongo webhook signature.
 * Signed payload is `${timestamp}.${rawBody}` (HMAC-SHA256, hex).
 * Uses `te` in test mode and `li` in live mode based on the secret key prefix.
 */
export function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string,
  options?: {
    webhookSecret?: string;
    apiSecretKey?: string;
    nowSeconds?: number;
    maxSkewSeconds?: number;
  }
): { ok: true; parts: PaymongoSignatureParts } | { ok: false; reason: string } {
  let webhookSecret: string;
  try {
    webhookSecret = options?.webhookSecret ?? getPaymongoWebhookSecret();
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Webhook secret missing",
    };
  }

  const parts = parsePaymongoSignatureHeader(signatureHeader);
  if (!parts) {
    return { ok: false, reason: "Missing or malformed Paymongo-Signature header" };
  }

  const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxSkew = options?.maxSkewSeconds ?? PAYMONGO_WEBHOOK_MAX_SKEW_SECONDS;
  const timestamp = Number(parts.timestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "Invalid signature timestamp" };
  }
  if (Math.abs(nowSeconds - timestamp) > maxSkew) {
    return { ok: false, reason: "Signature timestamp outside allowed skew" };
  }

  const signedPayload = `${parts.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  let apiSecretKey: string | undefined = options?.apiSecretKey;
  if (!apiSecretKey) {
    try {
      apiSecretKey = getPaymongoSecretKey();
    } catch {
      apiSecretKey = undefined;
    }
  }

  const live = apiSecretKey ? isPaymongoLiveMode(apiSecretKey) : false;
  const candidate = live ? parts.liveSignature : parts.testSignature;
  const fallback = live ? parts.testSignature : parts.liveSignature;

  if (safeEqualHex(expected, candidate) || safeEqualHex(expected, fallback)) {
    return { ok: true, parts };
  }

  return { ok: false, reason: "Signature mismatch" };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function nestedAttr(obj: Record<string, unknown> | null, key: string): unknown {
  if (!obj) return undefined;
  return obj[key];
}

/**
 * Normalize PayMongo event type strings (`checkout_session.payment.paid`
 * vs legacy `checkout.session.payment.paid`).
 */
export function isCheckoutSessionPaymentPaid(eventType: string): boolean {
  const normalized = eventType.trim().toLowerCase().replace(/_/g, ".");
  return (
    normalized === "checkout.session.payment.paid" ||
    eventType.trim() === "checkout_session.payment.paid"
  );
}

/**
 * Extract checkout-paid fields from a raw PayMongo event payload.
 * Returns null when the payload is not a paid checkout event or is malformed.
 */
export function parseCheckoutPaidEvent(
  payload: unknown
): ParsedCheckoutPaidEvent | null {
  const root = asRecord(payload);
  const data = asRecord(nestedAttr(root, "data"));
  if (!data) return null;

  const eventId = typeof data.id === "string" ? data.id : "";
  const attributes = asRecord(nestedAttr(data, "attributes"));
  if (!attributes) return null;

  const eventType =
    typeof attributes.type === "string" ? attributes.type : "";
  if (!isCheckoutSessionPaymentPaid(eventType)) return null;

  const resource = asRecord(nestedAttr(attributes, "data"));
  if (!resource) return null;

  const checkoutId = typeof resource.id === "string" ? resource.id : "";
  if (!checkoutId) return null;

  const resourceAttrs = asRecord(nestedAttr(resource, "attributes"));
  const payments = nestedAttr(resourceAttrs, "payments");
  let paymentId: string | null = null;
  if (Array.isArray(payments) && payments.length > 0) {
    const first = asRecord(payments[0]);
    if (first && typeof first.id === "string") paymentId = first.id;
  }

  const metadata = asRecord(nestedAttr(resourceAttrs, "metadata"));
  const metadataPaymentId =
    typeof metadata?.payment_id === "string" && metadata.payment_id.trim()
      ? metadata.payment_id.trim()
      : null;
  const metadataAppointmentId =
    typeof metadata?.appointment_id === "string" &&
    metadata.appointment_id.trim()
      ? metadata.appointment_id.trim()
      : null;

  return {
    eventId: eventId || `checkout:${checkoutId}`,
    eventType,
    checkoutId,
    paymentId,
    metadataPaymentId,
    metadataAppointmentId,
    livemode: attributes.livemode === true,
  };
}

/**
 * Pure decision: given current appointment/payment status, what should we do?
 */
export function decideCheckoutPaidAction(input: {
  appointmentStatus: string;
  paymentStatus: string;
}): ConfirmPaymentDecision {
  if (input.paymentStatus === "paid" || input.appointmentStatus === "confirmed") {
    return { action: "already_paid" };
  }

  if (input.appointmentStatus === "cancelled") {
    return {
      action: "skip_not_revivable",
      appointmentStatus: "cancelled",
      reason: "Appointment is cancelled; paid webhook will not revive it",
    };
  }

  if (input.appointmentStatus === "expired") {
    return {
      action: "skip_not_revivable",
      appointmentStatus: "expired",
      reason: "Appointment is expired; paid webhook will not revive it",
    };
  }

  if (input.appointmentStatus !== "pending_payment") {
    return {
      action: "skip_not_revivable",
      appointmentStatus: input.appointmentStatus,
      reason: `Appointment status "${input.appointmentStatus}" is not pending_payment`,
    };
  }

  return { action: "confirm" };
}

export interface CheckoutPaidPaymentRow {
  id: string;
  appointment_id: string;
  status: string;
  appointment: {
    id: string;
    status: string;
  } | null;
}

/** Injectable store for unit tests and the Supabase adapter. */
export interface CheckoutPaidStore {
  hasProcessedEvent(eventId: string): Promise<boolean>;
  recordEvent(input: {
    eventId: string;
    eventType: string;
    checkoutId: string;
    paymentId: string | null;
    appointmentId: string;
  }): Promise<void>;
  findPaymentByCheckoutId(
    checkoutId: string
  ): Promise<CheckoutPaidPaymentRow | null>;
  findPaymentById(paymentId: string): Promise<CheckoutPaidPaymentRow | null>;
  markPaymentPaid(input: {
    paymentId: string;
    paymongoPaymentId: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  confirmAppointment(appointmentId: string): Promise<void>;
  logManualReview(input: {
    appointmentId: string;
    reason: string;
    appointmentStatus: string;
    checkoutId: string;
    paymongoPaymentId: string | null;
    paymentId: string;
  }): Promise<void>;
  logPaymentConfirmed(input: {
    appointmentId: string;
    checkoutId: string;
    paymongoPaymentId: string | null;
    paymentId: string;
  }): Promise<void>;
}

/**
 * Core checkout-paid processor — used by the webhook route and regression tests.
 */
export async function processCheckoutPaidEvent(
  store: CheckoutPaidStore,
  event: ParsedCheckoutPaidEvent
): Promise<ApplyCheckoutPaidOutcome> {
  if (event.eventId && (await store.hasProcessedEvent(event.eventId))) {
    return { outcome: "already_processed_event", eventId: event.eventId };
  }

  const row =
    (await store.findPaymentByCheckoutId(event.checkoutId)) ??
    (event.metadataPaymentId
      ? await store.findPaymentById(event.metadataPaymentId)
      : null);
  if (!row) {
    return { outcome: "unknown_checkout", checkoutId: event.checkoutId };
  }

  const appointment = Array.isArray(row.appointment)
    ? row.appointment[0] ?? null
    : row.appointment;

  if (!appointment) {
    return { outcome: "unknown_checkout", checkoutId: event.checkoutId };
  }

  const decision = decideCheckoutPaidAction({
    appointmentStatus: appointment.status,
    paymentStatus: row.status,
  });

  const recordEvent = async () => {
    if (!event.eventId) return;
    await store.recordEvent({
      eventId: event.eventId,
      eventType: event.eventType,
      checkoutId: event.checkoutId,
      paymentId: event.paymentId,
      appointmentId: appointment.id,
    });
  };

  if (decision.action === "already_paid") {
    await recordEvent();
    return {
      outcome: "already_paid",
      appointmentId: appointment.id,
      paymentId: row.id,
    };
  }

  if (decision.action === "skip_not_revivable") {
    console.warn("[paymongo/webhook] paid event for non-revivable appointment", {
      appointmentId: appointment.id,
      paymentId: row.id,
      checkoutId: event.checkoutId,
      appointmentStatus: decision.appointmentStatus,
      reason: decision.reason,
    });

    await store.logManualReview({
      appointmentId: appointment.id,
      reason: decision.reason,
      appointmentStatus: decision.appointmentStatus,
      checkoutId: event.checkoutId,
      paymongoPaymentId: event.paymentId,
      paymentId: row.id,
    });

    // Money was received — mark payment paid for audit, do not revive appointment.
    await store.markPaymentPaid({
      paymentId: row.id,
      paymongoPaymentId: event.paymentId,
      metadata: {
        paid_while_appointment_status: decision.appointmentStatus,
        requires_manual_review: true,
      },
    });

    await recordEvent();

    return {
      outcome: "not_revivable",
      appointmentId: appointment.id,
      paymentId: row.id,
      appointmentStatus: decision.appointmentStatus,
      reason: decision.reason,
    };
  }

  await store.markPaymentPaid({
    paymentId: row.id,
    paymongoPaymentId: event.paymentId,
  });
  await store.confirmAppointment(appointment.id);
  await store.logPaymentConfirmed({
    appointmentId: appointment.id,
    checkoutId: event.checkoutId,
    paymongoPaymentId: event.paymentId,
    paymentId: row.id,
  });
  await recordEvent();

  return {
    outcome: "confirmed",
    appointmentId: appointment.id,
    paymentId: row.id,
  };
}

function createSupabaseCheckoutPaidStore(
  supabase: SupabaseClient
): CheckoutPaidStore {
  return {
    async hasProcessedEvent(eventId) {
      const { data } = await supabase
        .from("paymongo_webhook_events")
        .select("event_id")
        .eq("event_id", eventId)
        .maybeSingle();
      return Boolean(data);
    },

    async recordEvent(input) {
      await supabase.from("paymongo_webhook_events").upsert(
        {
          event_id: input.eventId,
          event_type: input.eventType,
          metadata: {
            checkout_id: input.checkoutId,
            payment_id: input.paymentId,
            appointment_id: input.appointmentId,
          },
        },
        { onConflict: "event_id", ignoreDuplicates: true }
      );
    },

    async findPaymentByCheckoutId(checkoutId) {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, appointment_id, status, appointment:appointments(id, status)"
        )
        .eq("paymongo_checkout_id", checkoutId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load payment: ${error.message}`);
      }
      if (!data) return null;
      return data as unknown as CheckoutPaidPaymentRow;
    },

    async findPaymentById(paymentId) {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, appointment_id, status, appointment:appointments(id, status)"
        )
        .eq("id", paymentId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load payment by id: ${error.message}`);
      }
      if (!data) return null;
      return data as unknown as CheckoutPaidPaymentRow;
    },

    async markPaymentPaid(input) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: now,
          paymongo_payment_id: input.paymongoPaymentId,
          method: "paymongo",
          updated_at: now,
          ...(input.metadata ? { metadata: input.metadata } : {}),
        })
        .eq("id", input.paymentId)
        .neq("status", "paid");

      if (error) {
        throw new Error(`Failed to update payment: ${error.message}`);
      }
    },

    async confirmAppointment(appointmentId) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed", updated_at: now })
        .eq("id", appointmentId)
        .eq("status", "pending_payment");

      if (error) {
        throw new Error(`Failed to confirm appointment: ${error.message}`);
      }
    },

    async logManualReview(input) {
      await logActivity(supabase, {
        entityType: "appointment",
        entityId: input.appointmentId,
        actorType: "system",
        action: "payment_confirmed",
        source: "PayMongo",
        metadata: {
          description:
            "PayMongo payment received but appointment was not confirmed",
          reason: input.reason,
          appointmentStatus: input.appointmentStatus,
          checkoutId: input.checkoutId,
          paymongoPaymentId: input.paymongoPaymentId,
          paymentId: input.paymentId,
          requiresManualReview: true,
        },
      });
    },

    async logPaymentConfirmed(input) {
      await logActivity(supabase, {
        entityType: "appointment",
        entityId: input.appointmentId,
        actorType: "system",
        action: "payment_confirmed",
        source: "PayMongo",
        metadata: {
          checkoutId: input.checkoutId,
          paymongoPaymentId: input.paymongoPaymentId,
          paymentId: input.paymentId,
        },
      });
    },
  };
}

/**
 * Apply a verified checkout.session.payment.paid event via Supabase service role.
 */
export async function applyCheckoutSessionPaid(
  supabase: SupabaseClient,
  event: ParsedCheckoutPaidEvent
): Promise<ApplyCheckoutPaidOutcome> {
  return processCheckoutPaidEvent(
    createSupabaseCheckoutPaidStore(supabase),
    event
  );
}

