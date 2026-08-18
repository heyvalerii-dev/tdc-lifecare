import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientAppointmentDetail } from "@/components/appointments/patient-appointment-detail";
import { homeContainer } from "@/components/home/home-styles";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(`
      *,
      psychologist:psychologists(*),
      service:services(*),
      payment:payments(*),
      questionnaire_response:questionnaire_responses(*)
    `)
    .eq("id", id)
    .eq("client_id", user!.id)
    .single();

  if (!appointment) notFound();

  const payment = Array.isArray(appointment.payment)
    ? appointment.payment[0]
    : appointment.payment;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const paymentUrl = `${appUrl}/pay/${id}`;

  return (
    <div className={cn(homeContainer, "px-5 py-12 sm:px-8 sm:py-14")}>
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={<PageLoadingState />}>
          <PatientAppointmentDetail
            appointment={{ ...appointment, payment } as AppointmentWithRelations}
            paymentUrl={paymentUrl}
          />
        </Suspense>
      </div>
    </div>
  );
}
