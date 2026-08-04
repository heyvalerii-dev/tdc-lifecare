import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  decideCheckoutPaidAction,
  parseCheckoutPaidEvent,
  processCheckoutPaidEvent,
  verifyPaymongoSignature,
  type CheckoutPaidPaymentRow,
  type CheckoutPaidStore,
  type ParsedCheckoutPaidEvent,
} from "@/lib/paymongo";

const WEBHOOK_SECRET = "whsk_test_regression_secret";
const API_SECRET_TEST = "sk_test_regression";

function signBody(
  rawBody: string,
  timestamp: string,
  secret = WEBHOOK_SECRET
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

function paidEventPayload(overrides?: {
  eventId?: string;
  checkoutId?: string;
  paymentId?: string;
  metadataPaymentId?: string;
  metadataAppointmentId?: string;
}): { raw: string; parsed: ParsedCheckoutPaidEvent } {
  const eventId = overrides?.eventId ?? "evt_test_1";
  const checkoutId = overrides?.checkoutId ?? "cs_test_1";
  const paymentId = overrides?.paymentId ?? "pay_test_1";
  const metadata: Record<string, string> = {};
  if (overrides?.metadataPaymentId) {
    metadata.payment_id = overrides.metadataPaymentId;
  }
  if (overrides?.metadataAppointmentId) {
    metadata.appointment_id = overrides.metadataAppointmentId;
  }
  const payload = {
    data: {
      id: eventId,
      type: "event",
      attributes: {
        type: "checkout_session.payment.paid",
        livemode: false,
        data: {
          id: checkoutId,
          type: "checkout_session",
          attributes: {
            payments: [{ id: paymentId }],
            metadata,
          },
        },
      },
    },
  };
  return {
    raw: JSON.stringify(payload),
    parsed: parseCheckoutPaidEvent(payload)!,
  };
}

function createMemoryStore(seed?: {
  payment?: CheckoutPaidPaymentRow | null;
  processedEventIds?: string[];
}): CheckoutPaidStore & {
  payments: Map<string, CheckoutPaidPaymentRow>;
  paymentsById: Map<string, CheckoutPaidPaymentRow>;
  events: Set<string>;
  confirmedAppointments: string[];
  manualReviews: unknown[];
  paymentConfirmedLogs: unknown[];
} {
  const payments = new Map<string, CheckoutPaidPaymentRow>();
  const paymentsById = new Map<string, CheckoutPaidPaymentRow>();
  if (seed?.payment) {
    payments.set("cs", seed.payment);
    paymentsById.set(seed.payment.id, seed.payment);
  }
  const events = new Set(seed?.processedEventIds ?? []);
  const confirmedAppointments: string[] = [];
  const manualReviews: unknown[] = [];
  const paymentConfirmedLogs: unknown[] = [];

  return {
    payments,
    paymentsById,
    events,
    confirmedAppointments,
    manualReviews,
    paymentConfirmedLogs,
    async hasProcessedEvent(eventId) {
      return events.has(eventId);
    },
    async recordEvent(input) {
      events.add(input.eventId);
    },
    async findPaymentByCheckoutId(checkoutId) {
      return payments.get(checkoutId) ?? null;
    },
    async findPaymentById(paymentId) {
      return paymentsById.get(paymentId) ?? null;
    },
    async markPaymentPaid(input) {
      for (const [key, row] of payments) {
        if (row.id === input.paymentId) {
          payments.set(key, { ...row, status: "paid" });
        }
      }
      const byId = paymentsById.get(input.paymentId);
      if (byId) {
        paymentsById.set(input.paymentId, { ...byId, status: "paid" });
      }
    },
    async confirmAppointment(appointmentId) {
      confirmedAppointments.push(appointmentId);
      for (const [key, row] of payments) {
        if (row.appointment?.id === appointmentId && row.appointment) {
          payments.set(key, {
            ...row,
            appointment: { ...row.appointment, status: "confirmed" },
            status: "paid",
          });
        }
      }
      for (const [key, row] of paymentsById) {
        if (row.appointment?.id === appointmentId && row.appointment) {
          paymentsById.set(key, {
            ...row,
            appointment: { ...row.appointment, status: "confirmed" },
            status: "paid",
          });
        }
      }
    },
    async logManualReview(input) {
      manualReviews.push(input);
    },
    async logPaymentConfirmed(input) {
      paymentConfirmedLogs.push(input);
    },
  };
}

function seedPayment(
  store: ReturnType<typeof createMemoryStore>,
  input: {
    checkoutId: string;
    paymentId?: string;
    paymentStatus?: string;
    appointmentId?: string;
    appointmentStatus?: string;
  }
) {
  const row: CheckoutPaidPaymentRow = {
    id: input.paymentId ?? "pay_row_1",
    appointment_id: input.appointmentId ?? "appt_1",
    status: input.paymentStatus ?? "pending",
    appointment: {
      id: input.appointmentId ?? "appt_1",
      status: input.appointmentStatus ?? "pending_payment",
    },
  };
  store.payments.set(input.checkoutId, row);
  store.paymentsById.set(row.id, row);
  return row;
}

describe("PayMongo webhook signature", () => {
  it("rejects an invalid webhook signature", () => {
    const raw = JSON.stringify({ data: { id: "evt_x" } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const header = `t=${timestamp},te=deadbeef,li=`;

    const result = verifyPaymongoSignature(raw, header, {
      webhookSecret: WEBHOOK_SECRET,
      apiSecretKey: API_SECRET_TEST,
      nowSeconds: Number(timestamp),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/mismatch/i);
    }
  });

  it("accepts a valid test-mode signature", () => {
    const raw = JSON.stringify({ hello: "world" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const te = signBody(raw, timestamp);
    const header = `t=${timestamp},te=${te},li=`;

    const result = verifyPaymongoSignature(raw, header, {
      webhookSecret: WEBHOOK_SECRET,
      apiSecretKey: API_SECRET_TEST,
      nowSeconds: Number(timestamp),
    });

    expect(result.ok).toBe(true);
  });

  it("rejects signatures outside allowed timestamp skew", () => {
    const raw = "{}";
    const timestamp = String(Math.floor(Date.now() / 1000) - 10_000);
    const te = signBody(raw, timestamp);
    const header = `t=${timestamp},te=${te},li=`;

    const result = verifyPaymongoSignature(raw, header, {
      webhookSecret: WEBHOOK_SECRET,
      apiSecretKey: API_SECRET_TEST,
      nowSeconds: Math.floor(Date.now() / 1000),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/skew/i);
    }
  });
});

describe("PayMongo checkout paid event parsing", () => {
  it("parses checkout_session.payment.paid payloads", () => {
    const { parsed } = paidEventPayload();
    expect(parsed.checkoutId).toBe("cs_test_1");
    expect(parsed.paymentId).toBe("pay_test_1");
    expect(parsed.eventId).toBe("evt_test_1");
  });
});

describe("PayMongo confirm decision", () => {
  it("does not revive cancelled appointments", () => {
    expect(
      decideCheckoutPaidAction({
        appointmentStatus: "cancelled",
        paymentStatus: "pending",
      }).action
    ).toBe("skip_not_revivable");
  });

  it("does not revive expired appointments", () => {
    expect(
      decideCheckoutPaidAction({
        appointmentStatus: "expired",
        paymentStatus: "pending",
      }).action
    ).toBe("skip_not_revivable");
  });

  it("confirms pending_payment appointments", () => {
    expect(
      decideCheckoutPaidAction({
        appointmentStatus: "pending_payment",
        paymentStatus: "pending",
      }).action
    ).toBe("confirm");
  });
});

describe("PayMongo processCheckoutPaidEvent", () => {
  it("returns unknown_checkout for an unknown checkout ID", async () => {
    const store = createMemoryStore();
    const { parsed } = paidEventPayload({ checkoutId: "cs_missing" });

    const result = await processCheckoutPaidEvent(store, parsed);

    expect(result).toEqual({
      outcome: "unknown_checkout",
      checkoutId: "cs_missing",
    });
    expect(store.confirmedAppointments).toHaveLength(0);
  });

  it("confirms a successful payment", async () => {
    const store = createMemoryStore();
    seedPayment(store, {
      checkoutId: "cs_ok",
      appointmentStatus: "pending_payment",
      paymentStatus: "pending",
    });
    const { parsed } = paidEventPayload({ checkoutId: "cs_ok" });

    const result = await processCheckoutPaidEvent(store, parsed);

    expect(result.outcome).toBe("confirmed");
    expect(store.confirmedAppointments).toEqual(["appt_1"]);
    expect(store.paymentConfirmedLogs).toHaveLength(1);
    expect(store.events.has(parsed.eventId)).toBe(true);
  });

  it("is idempotent for a replayed webhook event", async () => {
    const store = createMemoryStore();
    seedPayment(store, {
      checkoutId: "cs_replay",
      appointmentStatus: "pending_payment",
    });
    const { parsed } = paidEventPayload({
      eventId: "evt_replay",
      checkoutId: "cs_replay",
    });

    const first = await processCheckoutPaidEvent(store, parsed);
    const second = await processCheckoutPaidEvent(store, parsed);

    expect(first.outcome).toBe("confirmed");
    expect(second).toEqual({
      outcome: "already_processed_event",
      eventId: "evt_replay",
    });
    expect(store.confirmedAppointments).toHaveLength(1);
  });

  it("does not confirm a cancelled appointment", async () => {
    const store = createMemoryStore();
    seedPayment(store, {
      checkoutId: "cs_cancelled",
      appointmentStatus: "cancelled",
      paymentStatus: "pending",
    });
    const { parsed } = paidEventPayload({ checkoutId: "cs_cancelled" });

    const result = await processCheckoutPaidEvent(store, parsed);

    expect(result.outcome).toBe("not_revivable");
    if (result.outcome === "not_revivable") {
      expect(result.appointmentStatus).toBe("cancelled");
    }
    expect(store.confirmedAppointments).toHaveLength(0);
    expect(store.manualReviews).toHaveLength(1);
  });

  it("does not confirm an expired appointment", async () => {
    const store = createMemoryStore();
    seedPayment(store, {
      checkoutId: "cs_expired",
      appointmentStatus: "expired",
      paymentStatus: "pending",
    });
    const { parsed } = paidEventPayload({ checkoutId: "cs_expired" });

    const result = await processCheckoutPaidEvent(store, parsed);

    expect(result.outcome).toBe("not_revivable");
    if (result.outcome === "not_revivable") {
      expect(result.appointmentStatus).toBe("expired");
    }
    expect(store.confirmedAppointments).toHaveLength(0);
    expect(store.manualReviews).toHaveLength(1);
  });

  it("confirms a stale checkout after Pay again overwrote paymongo_checkout_id", async () => {
    const store = createMemoryStore();
    // Simulate retry: DB now points at cs_new, but user paid the earlier cs_old session.
    seedPayment(store, {
      checkoutId: "cs_new",
      paymentId: "pay_row_retry",
      appointmentStatus: "pending_payment",
      paymentStatus: "pending",
    });
    const { parsed } = paidEventPayload({
      checkoutId: "cs_old",
      metadataPaymentId: "pay_row_retry",
      metadataAppointmentId: "appt_1",
    });

    const result = await processCheckoutPaidEvent(store, parsed);

    expect(result.outcome).toBe("confirmed");
    expect(store.confirmedAppointments).toEqual(["appt_1"]);
  });
});
