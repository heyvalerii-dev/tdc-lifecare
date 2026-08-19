import { describe, expect, it, vi } from "vitest";
import {
  bookingResumeUnavailableMessage,
  decideBookingResume,
  shouldCreateCheckoutSession,
  startCheckoutIfAwaiting,
} from "@/lib/booking-resume";
import type { PaymentStatusSnapshot } from "@/lib/payments/client";

function snapshot(
  overrides: Partial<PaymentStatusSnapshot> = {}
): PaymentStatusSnapshot {
  return {
    appointmentId: "appt_1",
    appointmentStatus: "pending_payment",
    paymentStatus: "pending",
    paidAt: null,
    isPaid: false,
    isConfirmed: false,
    ready: false,
    ...overrides,
  };
}

describe("booking resume — /book?resume=1", () => {
  it("resume + awaiting payment → stay on the payment step", () => {
    const action = decideBookingResume(snapshot());
    expect(action).toEqual({ type: "show_payment" });
    expect(shouldCreateCheckoutSession(snapshot())).toBe(true);
  });

  it("resume + confirmed/paid → redirect to /client/appointments/[id]", () => {
    const paid = snapshot({
      appointmentStatus: "confirmed",
      paymentStatus: "paid",
      isPaid: true,
      isConfirmed: true,
      ready: true,
    });
    expect(decideBookingResume(paid)).toEqual({
      type: "redirect_to_appointment",
    });
    expect(shouldCreateCheckoutSession(paid)).toBe(false);

    const completed = snapshot({
      appointmentStatus: "completed",
      paymentStatus: "paid",
      isPaid: true,
      isConfirmed: false,
      ready: false,
    });
    expect(decideBookingResume(completed).type).toBe("redirect_to_appointment");
  });

  it("resume + cancelled/expired → unavailable error, not checkout", () => {
    expect(
      decideBookingResume(snapshot({ appointmentStatus: "cancelled" }))
    ).toEqual({ type: "unavailable", reason: "cancelled" });
    expect(
      decideBookingResume(snapshot({ appointmentStatus: "expired" }))
    ).toEqual({ type: "unavailable", reason: "expired" });
    expect(bookingResumeUnavailableMessage("cancelled")).toMatch(/cancelled/i);
    expect(bookingResumeUnavailableMessage("expired")).toMatch(/no longer available/i);
  });

  it("confirmed appointment must never call create-checkout", async () => {
    const start = vi.fn();
    const fetchStatus = vi.fn().mockResolvedValue(
      snapshot({
        appointmentStatus: "confirmed",
        paymentStatus: "paid",
        isPaid: true,
        isConfirmed: true,
        ready: true,
      })
    );

    const result = await startCheckoutIfAwaiting({
      appointmentId: "appt_1",
      returnTo: "book",
      fetchStatus,
      start,
    });

    expect(result.started).toBe(false);
    expect(start).not.toHaveBeenCalled();
    expect(fetchStatus).toHaveBeenCalledWith("appt_1");
  });

  it("awaiting payment may start checkout", async () => {
    const start = vi.fn().mockResolvedValue({
      checkoutUrl: "https://checkout.paymongo.com/cs_1",
      checkoutId: "cs_1",
      mode: "paymongo",
    });
    const fetchStatus = vi.fn().mockResolvedValue(snapshot());

    const result = await startCheckoutIfAwaiting({
      appointmentId: "appt_1",
      returnTo: "book",
      fetchStatus,
      start,
    });

    expect(result.started).toBe(true);
    expect(start).toHaveBeenCalledWith({
      appointmentId: "appt_1",
      returnTo: "book",
    });
  });
});
