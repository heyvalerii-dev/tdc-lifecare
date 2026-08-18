"use client";

import { useCallback, useEffect, useState } from "react";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { PaymentStatusPanel } from "@/components/booking/payment-status-panel";
import { ShareablePaymentSuccess } from "@/components/payments/shareable-payment-success";
import { pollPaymentStatus } from "@/lib/payments/client";

/**
 * PayMongo return URL while the webhook may still be settling.
 * Polls server status — does not trust ?success=true.
 */
export function ShareablePaymentConfirming({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [phase, setPhase] = useState<"checking" | "success" | "timeout">(
    "checking"
  );

  const poll = useCallback(async (signal: AbortSignal) => {
    setPhase("checking");
    const result = await pollPaymentStatus({
      appointmentId,
      signal,
    });
    if (result.status === "aborted") return;
    setPhase(result.status === "confirmed" ? "success" : "timeout");
  }, [appointmentId]);

  useEffect(() => {
    const controller = new AbortController();
    void poll(controller.signal);
    return () => controller.abort();
  }, [poll]);

  if (phase === "success") {
    return <ShareablePaymentSuccess />;
  }

  if (phase === "timeout") {
    return (
      <div className="mx-auto w-full max-w-lg py-8 sm:py-12">
        <PaymentStatusPanel
          variant="timeout"
          onRetry={() => {
            void poll(new AbortController().signal);
          }}
          retryLabel="Check again"
        />
      </div>
    );
  }

  return <PageLoadingState />;
}
