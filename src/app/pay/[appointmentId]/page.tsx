import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientAppointmentDetail } from "@/components/appointments/patient-appointment-detail";
import { BrandLogo } from "@/components/brand/brand-logo";
import { homeContainer } from "@/components/home/home-styles";
import { PayMongoSandboxBanner } from "@/components/payments/paymongo-sandbox-badge";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";

export default async function PayPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
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
    .single();

  if (!appointment) notFound();

  const payment = Array.isArray(appointment.payment)
    ? appointment.payment[0]
    : appointment.payment;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const paymentUrl = `${appUrl}/pay/${appointmentId}`;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E8E2F2] bg-white py-5">
        <div className={cn(homeContainer, "flex justify-center px-5 sm:px-8")}>
          <BrandLogo href="/" variant="dark" />
        </div>
      </header>
      <PayMongoSandboxBanner />
      <div className={cn(homeContainer, "px-5 py-12 sm:px-8 sm:py-14")}>
        <div className="mx-auto max-w-4xl">
          <Suspense fallback={<p className="text-[var(--brand-text-muted)]">Loading…</p>}>
            <PatientAppointmentDetail
              appointment={{ ...appointment, payment } as AppointmentWithRelations}
              paymentUrl={paymentUrl}
              showBackLink={false}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
