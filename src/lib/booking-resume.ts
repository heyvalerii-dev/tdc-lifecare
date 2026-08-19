import {
  fetchPaymentStatus,
  startCheckout,
  type PaymentStatusSnapshot,
  type StartCheckoutResult,
} from "@/lib/payments/client";

export type BookingResumeUnavailableReason = "cancelled" | "expired" | "not_found";

export type BookingResumeAction =
  | { type: "show_payment" }
  | { type: "redirect_to_appointment" }
  | { type: "unavailable"; reason: BookingResumeUnavailableReason };

export function bookingResumeUnavailableMessage(
  reason: BookingResumeUnavailableReason
): string {
  if (reason === "cancelled") {
    return "This appointment was cancelled.";
  }
  if (reason === "expired") {
    return "This reservation is no longer available.";
  }
  return "This appointment is no longer available.";
}

/**
 * Resume means "check the existing booking", not "start payment".
 * Server appointment/payment status is the source of truth.
 */
export function decideBookingResume(
  snapshot: PaymentStatusSnapshot
): BookingResumeAction {
  const status = snapshot.appointmentStatus;

  if (status === "cancelled") {
    return { type: "unavailable", reason: "cancelled" };
  }
  if (status === "expired") {
    return { type: "unavailable", reason: "expired" };
  }

  if (
    snapshot.isPaid ||
    snapshot.isConfirmed ||
    snapshot.ready ||
    status === "confirmed" ||
    status === "completed" ||
    status === "no_show"
  ) {
    return { type: "redirect_to_appointment" };
  }

  if (status === "pending_payment") {
    return { type: "show_payment" };
  }

  return { type: "redirect_to_appointment" };
}

export function shouldCreateCheckoutSession(
  snapshot: PaymentStatusSnapshot
): boolean {
  return decideBookingResume(snapshot).type === "show_payment";
}

export type StartCheckoutIfAwaitingResult =
  | { started: true; action: Extract<BookingResumeAction, { type: "show_payment" }>; result: StartCheckoutResult }
  | { started: false; action: BookingResumeAction };

/**
 * Starts PayMongo checkout only when the appointment is still awaiting payment.
 * Confirmed/paid/cancelled/expired appointments never call create-checkout.
 */
export async function startCheckoutIfAwaiting(input: {
  appointmentId: string;
  returnTo: "book" | "pay";
  fetchStatus?: typeof fetchPaymentStatus;
  start?: typeof startCheckout;
}): Promise<StartCheckoutIfAwaitingResult> {
  const fetchStatus = input.fetchStatus ?? fetchPaymentStatus;
  const start = input.start ?? startCheckout;

  let snapshot: PaymentStatusSnapshot;
  try {
    snapshot = await fetchStatus(input.appointmentId);
  } catch {
    return {
      started: false,
      action: { type: "unavailable", reason: "not_found" },
    };
  }

  const action = decideBookingResume(snapshot);
  if (action.type !== "show_payment") {
    return { started: false, action };
  }

  const result = await start({
    appointmentId: input.appointmentId,
    returnTo: input.returnTo,
  });
  return { started: true, action, result };
}
