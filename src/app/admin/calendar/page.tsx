import { createClient } from "@/lib/supabase/server";
import { ADMIN_APPOINTMENT_LIST_SELECT } from "@/lib/appointment-selects";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";
import { AdminAppointmentsShell } from "@/components/admin/appointments/admin-appointments-shell";
import { adminWideContainer } from "@/lib/admin-layout";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  UnavailableBlock,
} from "@/types/database";

export default async function AdminCalendarPage() {
  const supabase = await createClient();
  const settings = await getClinicSettings();
  const workingDays = getClinicWorkingDays(settings);

  const appointmentsQuery = supabase
    .from("appointments")
    .select(ADMIN_APPOINTMENT_LIST_SELECT)
    .order("start_at", { ascending: false })
    .returns<AppointmentWithRelations[]>();

  const [
    { data: appointments, error: appointmentsError },
    { data: psychologists },
    { data: blocks },
    { data: availability },
  ] = await Promise.all([
    appointmentsQuery,
    supabase.from("psychologists").select("*").eq("is_active", true),
    supabase
      .from("unavailable_blocks")
      .select("*")
      .order("start_at", { ascending: true }),
    supabase
      .from("availability_blocks")
      .select("*")
      .eq("is_active", true),
  ]);

  if (appointmentsError) {
    console.error("[admin/calendar] query failed:", appointmentsError.message);
  }

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <AdminAppointmentsShell
        appointments={(appointments ?? []) as AppointmentWithRelations[]}
        psychologists={(psychologists ?? []) as Psychologist[]}
        blocks={(blocks ?? []) as UnavailableBlock[]}
        availability={(availability ?? []) as AvailabilityBlock[]}
        workingDays={workingDays}
      />
    </div>
  );
}
