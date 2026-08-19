"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHECKOUT_START_ERROR,
  PAYMENT_POLL_TIMEOUT_MESSAGE,
  pollPaymentStatus,
} from "@/lib/payments/client";
import { startCheckoutIfAwaiting, bookingResumeUnavailableMessage } from "@/lib/booking-resume";

export type CheckoutPhase =
  | "idle"
  | "redirecting"
  | "checking"
  | "cancelled"
  | "timeout"
  | "error";

interface UseCheckoutPaymentOptions {
  appointmentId: string | null;
  returnTo: "book" | "pay";
  /** Called when server reports paid + confirmed (webhook / demo sim). */
  onConfirmed: (appointmentId: string) => void | Promise<void>;
  /** Poll timeout (default 60s). */
  timeoutMs?: number;
  /** Poll interval (default 2s). */
  intervalMs?: number;
}

/**
 * Checkout redirect + return-URL reconciliation.
 * Never marks payment paid on the client — only redirects and polls.
 */
export function useCheckoutPayment({
  appointmentId,
  returnTo,
  onConfirmed,
  timeoutMs,
  intervalMs,
}: UseCheckoutPaymentOptions) {
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  const stopPolling = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const beginPolling = useCallback(
    async (id: string) => {
      stopPolling();
      setPhase("checking");
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const result = await pollPaymentStatus({
        appointmentId: id,
        timeoutMs,
        intervalMs,
        signal: controller.signal,
      });

      if (result.status === "aborted") return;

      if (result.status === "confirmed") {
        await onConfirmedRef.current(id);
        setPhase("idle");
        return;
      }

      setPhase("timeout");
      setError(PAYMENT_POLL_TIMEOUT_MESSAGE);
    },
    [intervalMs, stopPolling, timeoutMs]
  );

  const beginCheckout = useCallback(async () => {
    if (!appointmentId || phase === "redirecting" || phase === "checking") {
      return;
    }

    setPhase("redirecting");
    setError(null);

    try {
      const outcome = await startCheckoutIfAwaiting({
        appointmentId,
        returnTo,
      });

      if (!outcome.started) {
        if (outcome.action.type === "redirect_to_appointment") {
          await onConfirmedRef.current(appointmentId);
          setPhase("idle");
          return;
        }

        const reason =
          outcome.action.type === "unavailable"
            ? outcome.action.reason
            : "not_found";
        setPhase("error");
        setError(bookingResumeUnavailableMessage(reason));
        return;
      }

      // TEMP: redirect happens here (not window.location.href)
      console.log("Redirecting to:", outcome.result.checkoutUrl);
      window.location.assign(outcome.result.checkoutUrl);
    } catch {
      setPhase("error");
      setError(CHECKOUT_START_ERROR);
    }
  }, [appointmentId, phase, returnTo]);

  const markCancelled = useCallback(() => {
    stopPolling();
    setPhase("cancelled");
    setError(null);
  }, [stopPolling]);

  const resetToIdle = useCallback(() => {
    stopPolling();
    setPhase("idle");
    setError(null);
  }, [stopPolling]);

  const isBusy = phase === "redirecting" || phase === "checking";

  return {
    phase,
    error,
    isBusy,
    beginCheckout,
    beginPolling,
    markCancelled,
    resetToIdle,
    setPhase,
    setError,
  };
}
