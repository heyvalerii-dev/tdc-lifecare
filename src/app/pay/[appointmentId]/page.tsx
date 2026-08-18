import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PatientAppointmentDetail } from "@/components/appointments/patient-appointment-detail";
import { BrandLogo } from "@/components/brand/brand-logo";
import { homeContainer } from "@/components/home/home-styles";
import { PayMongoSandboxBanner } from "@/components/payments/paymongo-sandbox-badge";
import { ShareablePaymentConfirming } from "@/components/payments/shareable-payment-confirming";
import {
  ShareablePaymentSuccess,
  ShareablePaymentUnavailable,
} from "@/components/payments/shareable-payment-success";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";

function paymentStatusOf(row: {
  payment?: { status?: string } | { status?: string }[] | null;
}): string | null {
  const payment = Array.isArray(row.payment) ? row.payment[0] : row.payment;
  return payment?.status ?? null;
}

function isShareablePaymentSettled(
  appointmentStatus: string,
  paymentStatus: string | null
): boolean {
  return (
    paymentStatus === "paid" ||
    paymentStatus === "waived" ||
    appointmentStatus === "confirmed" ||
    appointmentStatus === "completed"
  );
}

function PayChrome({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        centered ? "bg-[var(--brand-cream)]" : "bg-white"
      )}
    >
      <header className="border-b border-[#E8E2F2] bg-white py-5">
        <div className={cn(homeContainer, "flex justify-center px-5 sm:px-8")}>
          <BrandLogo href="/" variant="dark" />
        </div>
      </header>
      <PayMongoSandboxBanner />
      <div className={cn(homeContainer, "flex flex-1 flex-col px-5 py-12 sm:px-8 sm:py-14")}>
        <div
          className={cn(
            "mx-auto w-full max-w-4xl",
            centered && "flex flex-1 flex-col justify-center"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function PayPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const service = await createServiceClient();

  const { data: snapshot } = await service
    .from("appointments")
    .select("id, status, payment:payments(status)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!snapshot) notFound();

  const paymentStatus = paymentStatusOf(snapshot);

  if (isShareablePaymentSettled(snapshot.status, paymentStatus)) {
    return (
      <PayChrome centered>
        <ShareablePaymentSuccess />
      </PayChrome>
    );
  }

  if (snapshot.status === "pending_payment") {
    const supabase = await createClient();
    const { data: appointment } = await supabase
      .from("appointments")
      .select(`
        *,
        psychologist:psychologists(*),
        service:services(*),
        payment:payments(*)
      `)
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appointment) {
      // Webhook likely confirmed between lookups; RLS hides non-pending rows
      // from anonymous visitors. Reconcile from the server instead of 404.
      return (
        <PayChrome centered>
          <ShareablePaymentConfirming appointmentId={appointmentId} />
        </PayChrome>
      );
    }

    const payment = Array.isArray(appointment.payment)
      ? appointment.payment[0]
      : appointment.payment;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const paymentUrl = `${appUrl}/pay/${appointmentId}`;

    return (
      <PayChrome>
        <Suspense
          fallback={<p className="text-[var(--brand-text-muted)]">Loading…</p>}
        >
          <PatientAppointmentDetail
            appointment={
              { ...appointment, payment } as AppointmentWithRelations
            }
            paymentUrl={paymentUrl}
            showBackLink={false}
          />
        </Suspense>
      </PayChrome>
    );
  }

  const unavailable =
    snapshot.status === "expired" || paymentStatus === "expired"
      ? {
          title: "This payment link has expired",
          message:
            "The reservation for this appointment is no longer available. Please contact the clinic if you still need to pay.",
        }
      : {
          title: "This payment link is no longer available",
          message:
            "This appointment is not awaiting payment. Please contact the clinic if you have questions.",
        };

  return (
    <PayChrome centered>
      <ShareablePaymentUnavailable
        title={unavailable.title}
        message={unavailable.message}
      />
    </PayChrome>
  );
}
