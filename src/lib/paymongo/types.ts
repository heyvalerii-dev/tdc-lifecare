/**
 * PayMongo API / webhook types used by the server foundation.
 * Keep PayMongo-specific shapes here — do not scatter them across routes.
 */

export interface CreateCheckoutSessionParams {
  amountCents: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionResult {
  checkoutId: string;
  checkoutUrl: string;
}

export interface PayMongoCheckoutSessionResponse {
  data: {
    id: string;
    attributes: {
      checkout_url: string;
      status: string;
    };
  };
}

/** Parsed `Paymongo-Signature` header parts. */
export interface PaymongoSignatureParts {
  timestamp: string;
  testSignature: string;
  liveSignature: string;
}

export type PaymongoWebhookEventType =
  | "checkout_session.payment.paid"
  | "checkout.session.payment.paid"
  | string;

export interface ParsedCheckoutPaidEvent {
  eventId: string;
  eventType: string;
  checkoutId: string;
  /** PayMongo payment intent/resource id from the session payments list. */
  paymentId: string | null;
  /**
   * Our internal payments.id from Checkout Session metadata (set at create-checkout).
   * Used as fallback when paymongo_checkout_id was overwritten by a retry.
   */
  metadataPaymentId: string | null;
  /** Our appointments.id from Checkout Session metadata. */
  metadataAppointmentId: string | null;
  livemode: boolean;
}

export type ConfirmPaymentDecision =
  | { action: "confirm" }
  | { action: "already_paid" }
  | {
      action: "skip_not_revivable";
      appointmentStatus: string;
      reason: string;
    };

export type ApplyCheckoutPaidOutcome =
  | {
      outcome: "confirmed";
      appointmentId: string;
      paymentId: string;
    }
  | {
      outcome: "already_paid";
      appointmentId: string;
      paymentId: string;
    }
  | {
      outcome: "already_processed_event";
      eventId: string;
    }
  | { outcome: "unknown_checkout"; checkoutId: string }
  | {
      outcome: "not_revivable";
      appointmentId: string;
      paymentId: string;
      appointmentStatus: string;
      reason: string;
    };
