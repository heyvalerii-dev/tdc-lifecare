import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_START_ERROR,
  fetchPaymentStatus,
  pollPaymentStatus,
  startCheckout,
} from "@/lib/payments/client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PayMongo Phase 2 — checkout client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts checkout and returns the hosted checkout URL for redirect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        checkout_url: "https://checkout.paymongo.com/cs_test_abc",
        checkout_id: "cs_test_abc",
        mode: "paymongo",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await startCheckout({
      appointmentId: "appt_1",
      returnTo: "book",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/create-checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          appointment_id: "appt_1",
          return_to: "book",
        }),
      })
    );
    expect(result.checkoutUrl).toBe("https://checkout.paymongo.com/cs_test_abc");
    expect(result.checkoutId).toBe("cs_test_abc");
    expect(result.mode).toBe("paymongo");
  });

  it("surfaces a friendly error when checkout creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Nope" }, 500))
    );

    await expect(
      startCheckout({ appointmentId: "appt_1", returnTo: "pay" })
    ).rejects.toThrow("Nope");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({}, 502))
    );

    await expect(
      startCheckout({ appointmentId: "appt_1", returnTo: "pay" })
    ).rejects.toThrow(CHECKOUT_START_ERROR);
  });

  it("allows retry by creating a fresh checkout session each call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          checkout_url: "https://checkout.paymongo.com/cs_1",
          checkout_id: "cs_1",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          checkout_url: "https://checkout.paymongo.com/cs_2",
          checkout_id: "cs_2",
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const first = await startCheckout({
      appointmentId: "appt_1",
      returnTo: "book",
    });
    const second = await startCheckout({
      appointmentId: "appt_1",
      returnTo: "book",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.checkoutId).toBe("cs_1");
    expect(second.checkoutId).toBe("cs_2");
    expect(second.checkoutUrl).not.toBe(first.checkoutUrl);
  });
});

describe("PayMongo Phase 2 — payment status polling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("polls until payment is paid and appointment is confirmed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          appointment_id: "appt_1",
          appointment_status: "pending_payment",
          payment_status: "pending",
          is_paid: false,
          is_confirmed: false,
          ready: false,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          appointment_id: "appt_1",
          appointment_status: "confirmed",
          payment_status: "paid",
          is_paid: true,
          is_confirmed: true,
          ready: true,
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const ticks: boolean[] = [];
    const result = await pollPaymentStatus({
      appointmentId: "appt_1",
      timeoutMs: 5_000,
      intervalMs: 10,
      onTick: (s) => ticks.push(s.ready),
    });

    expect(result.status).toBe("confirmed");
    if (result.status === "confirmed") {
      expect(result.snapshot.isPaid).toBe(true);
      expect(result.snapshot.isConfirmed).toBe(true);
    }
    expect(ticks).toEqual([false, true]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("times out while waiting for webhook confirmation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          appointment_id: "appt_1",
          appointment_status: "pending_payment",
          payment_status: "pending",
          is_paid: false,
          is_confirmed: false,
          ready: false,
        })
      )
    );

    const result = await pollPaymentStatus({
      appointmentId: "appt_1",
      timeoutMs: 40,
      intervalMs: 10,
    });

    expect(result.status).toBe("timeout");
    if (result.status === "timeout") {
      expect(result.snapshot?.ready).toBe(false);
    }
  });

  it("aborts polling when the signal is cancelled (e.g. cancelled checkout UX)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          appointment_id: "appt_1",
          appointment_status: "pending_payment",
          payment_status: "pending",
          ready: false,
        })
      )
    );

    const controller = new AbortController();
    const pending = pollPaymentStatus({
      appointmentId: "appt_1",
      timeoutMs: 5_000,
      intervalMs: 50,
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).resolves.toEqual({ status: "aborted" });
  });

  it("reads payment status without inventing confirmation from the redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          appointment_id: "appt_1",
          appointment_status: "pending_payment",
          payment_status: "pending",
          is_paid: false,
          is_confirmed: false,
          ready: false,
        })
      )
    );

    const snapshot = await fetchPaymentStatus("appt_1");
    expect(snapshot.ready).toBe(false);
    expect(snapshot.isConfirmed).toBe(false);
  });
});

describe("PayMongo Phase 2 — return URLs", () => {
  it("documents success and cancel return paths used by create-checkout", () => {
    const appointmentId = "appt_abc";
    const appUrl = "https://clinic.example";

    const bookSuccess = `${appUrl}/book?confirmed=${appointmentId}`;
    const bookCancel = `${appUrl}/book?payment=cancelled&appointment=${appointmentId}`;
    const paySuccess = `${appUrl}/pay/${appointmentId}?success=true`;
    const payCancel = `${appUrl}/pay/${appointmentId}?cancelled=true`;

    expect(bookSuccess).toContain("confirmed=");
    expect(bookCancel).toContain("payment=cancelled");
    expect(bookCancel).toContain(`appointment=${appointmentId}`);
    expect(paySuccess).toContain("success=true");
    expect(payCancel).toContain("cancelled=true");
  });
});
