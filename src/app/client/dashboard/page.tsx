import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PatientAppointmentCard } from "@/components/appointments/patient-appointment-card";
import { homeContainer } from "@/components/home/home-styles";
import { Button } from "@/components/ui/button";
import {
  getDashboardDisplayStatus,
  groupAppointmentsByLifecycle,
} from "@/lib/appointment-lifecycle";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import type { AppointmentWithRelations } from "@/types/database";

function AppointmentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h2
        className={cn(
          type.sectionTitle,
          "text-xl sm:text-2xl lg:text-2xl lg:font-semibold"
        )}
      >
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      *,
      psychologist:psychologists(*),
      service:services(*),
      payment:payments(*)
    `)
    .eq("client_id", user!.id)
    .order("start_at", { ascending: false });

  const now = new Date();
  const { upcoming, completed, expired } = groupAppointmentsByLifecycle(
    (appointments ?? []) as AppointmentWithRelations[],
    now
  );

  const hasAppointments =
    upcoming.length > 0 || completed.length > 0 || expired.length > 0;

  return (
    <div className={cn(homeContainer, "px-5 py-12 sm:px-8 sm:py-14")}>
      <div className="mx-auto max-w-4xl">
        <div className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className={type.pageTitle}>My Appointments</h1>
            <Link href="/book" className="shrink-0">
              <Button>Book Appointment</Button>
            </Link>
          </div>
          <p className={cn(type.bodyMuted, type.prose)}>View and manage your appointments.</p>
        </div>

        {!hasAppointments ? (
          <div className="mt-14 flex flex-col items-center py-8 text-center sm:mt-16">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--brand-purple)]/12 bg-[var(--brand-purple-light)]/60">
              <Calendar className="h-7 w-7 text-[var(--brand-purple)]/70" strokeWidth={1.75} />
            </div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-[var(--brand-text)]">
              No appointments yet
            </h2>
            <p className={cn(type.bodyMuted, "mt-2 max-w-sm text-base")}>
              When you book a session, it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-16 space-y-12 sm:mt-20 sm:space-y-14">
            {upcoming.length > 0 && (
              <AppointmentSection title="Upcoming">
                {upcoming.map((appt) => (
                  <PatientAppointmentCard
                    key={appt.id}
                    appointment={appt}
                    href={`/client/appointments/${appt.id}`}
                    displayStatus={getDashboardDisplayStatus(appt, now)}
                  />
                ))}
              </AppointmentSection>
            )}

            {completed.length > 0 && (
              <AppointmentSection title="Completed">
                {completed.map((appt) => (
                  <PatientAppointmentCard
                    key={appt.id}
                    appointment={appt}
                    href={`/client/appointments/${appt.id}`}
                    displayStatus="completed"
                  />
                ))}
              </AppointmentSection>
            )}

            {expired.length > 0 && (
              <AppointmentSection title="Expired">
                {expired.map((appt) => (
                  <PatientAppointmentCard
                    key={appt.id}
                    appointment={appt}
                    href={`/client/appointments/${appt.id}`}
                    displayStatus="expired"
                    variant="expired"
                  />
                ))}
              </AppointmentSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
