/**
 * Client helpers for starting PayMongo checkout and reconciling return URLs.
 * The webhook remains the source of truth for confirmation.
 */

export const CHECKOUT_START_ERROR =
  "Couldn't start payment. Please try again.";

export const PAYMENT_POLL_TIMEOUT_MESSAGE =
  "We're still confirming your payment. This can take a moment — you can wait a bit longer or try again.";

export interface StartCheckoutResult {
  checkoutUrl: string;
  checkoutId: string | null;
  mode: "paymongo" | "demo";
}

export async function startCheckout(input: {
  appointmentId: string;
  returnTo: "book" | "pay";
}): Promise<StartCheckoutResult> {
  const res = await fetch("/api/payments/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appointment_id: input.appointmentId,
      return_to: input.returnTo,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    checkout_url?: string;
    checkout_id?: string | null;
    mode?: "paymongo" | "demo";
  };

  // TEMP: debug checkout redirect
  console.log("Checkout response:", data);
  console.log("Redirecting to:", data.checkout_url);

  if (!res.ok || !data.checkout_url) {
    throw new Error(data.error?.trim() || CHECKOUT_START_ERROR);
  }

  return {
    checkoutUrl: data.checkout_url,
    checkoutId: data.checkout_id ?? null,
    mode: data.mode === "demo" ? "demo" : "paymongo",
  };
}

export interface PaymentStatusSnapshot {
  appointmentId: string;
  appointmentStatus: string;
  paymentStatus: string | null;
  paidAt: string | null;
  isPaid: boolean;
  isConfirmed: boolean;
  ready: boolean;
}

export async function fetchPaymentStatus(
  appointmentId: string
): Promise<PaymentStatusSnapshot> {
  const res = await fetch(
    `/api/appointments/${appointmentId}/payment-status`,
    { cache: "no-store" }
  );
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    appointment_id?: string;
    appointment_status?: string;
    payment_status?: string | null;
    paid_at?: string | null;
    is_paid?: boolean;
    is_confirmed?: boolean;
    ready?: boolean;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Could not check payment status");
  }

  return {
    appointmentId: data.appointment_id ?? appointmentId,
    appointmentStatus: data.appointment_status ?? "pending_payment",
    paymentStatus: data.payment_status ?? null,
    paidAt: data.paid_at ?? null,
    isPaid: Boolean(data.is_paid),
    isConfirmed: Boolean(data.is_confirmed),
    ready: Boolean(data.ready),
  };
}

export interface PollPaymentStatusOptions {
  appointmentId: string;
  /** Max wait before giving up (default 60s). */
  timeoutMs?: number;
  /** Interval between polls (default 2s). */
  intervalMs?: number;
  signal?: AbortSignal;
  onTick?: (status: PaymentStatusSnapshot) => void;
}

export type PollPaymentStatusResult =
  | { status: "confirmed"; snapshot: PaymentStatusSnapshot }
  | { status: "timeout"; snapshot: PaymentStatusSnapshot | null }
  | { status: "aborted" };

/**
 * Poll until appointment is confirmed + payment paid, or timeout.
 * Does not invent confirmation — waits for server state (webhook / demo sim).
 */
export async function pollPaymentStatus(
  options: PollPaymentStatusOptions
): Promise<PollPaymentStatusResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 2_000;
  const started = Date.now();
  let last: PaymentStatusSnapshot | null = null;

  while (Date.now() - started < timeoutMs) {
    if (options.signal?.aborted) {
      return { status: "aborted" };
    }

    try {
      last = await fetchPaymentStatus(options.appointmentId);
      options.onTick?.(last);
      if (last.ready) {
        return { status: "confirmed", snapshot: last };
      }
    } catch {
      // Transient network errors — keep polling until timeout.
    }

    try {
      await sleep(intervalMs, options.signal);
    } catch {
      return { status: "aborted" };
    }
  }

  return { status: "timeout", snapshot: last };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
