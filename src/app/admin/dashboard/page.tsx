import Link from "next/link";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { AdminAppointmentCard } from "@/components/appointments/admin-appointment-card";
import { homeContainer } from "@/components/home/home-styles";
import { Card, CardContent } from "@/components/ui/card";
import { getClinicStartOfDay, getClinicToday } from "@/lib/datetime";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Calendar, CreditCard, Users } from "lucide-react";
import { ADMIN_APPOINTMENT_LIST_SELECT } from "@/lib/appointment-selects";
import type { AppointmentWithRelations } from "@/types/database";

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 sm:space-y-5">
      <h2
        className={cn(
          type.sectionTitle,
          "text-xl sm:text-2xl lg:text-2xl lg:font-semibold"
        )}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="border-[var(--brand-purple)]/10 bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)] transition-all duration-200 hover:border-[var(--brand-purple)]/16 hover:shadow-[0_8px_24px_rgba(93,80,122,0.06)]">
        <CardContent className="flex items-center gap-4 px-5 py-4 sm:px-8 sm:py-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--brand-purple)]/12 bg-[var(--brand-purple-light)]/60">
            <Icon className="h-5 w-5 text-[var(--brand-purple)]" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--brand-text)]">
              {value}
            </p>
            <p className="font-sans text-sm text-[var(--brand-text-muted)]">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-[var(--brand-purple)]/10 bg-white px-6 py-8 text-center font-sans text-sm text-[var(--brand-text-muted)] shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
      {message}
    </p>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const todayStr = getClinicToday();
  const startOfToday = getClinicStartOfDay(todayStr);
  const startOfTomorrow = addDays(startOfToday, 1);

  const [
    { count: pendingPayments },
    { count: todayAppointmentsCount },
    { count: totalClients },
    { data: todayAppointments },
    { data: recentAppointments },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_payment"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("start_at", startOfToday.toISOString())
      .lt("start_at", startOfTomorrow.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "client"),
    supabase
      .from("appointments")
      .select(ADMIN_APPOINTMENT_LIST_SELECT)
      .gte("start_at", startOfToday.toISOString())
      .lt("start_at", startOfTomorrow.toISOString())
      .order("start_at", { ascending: true })
      .returns<AppointmentWithRelations[]>(),
    supabase
      .from("appointments")
      .select(ADMIN_APPOINTMENT_LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<AppointmentWithRelations[]>(),
  ]);

  const metrics = [
    {
      label: "Pending Payments",
      value: pendingPayments ?? 0,
      icon: CreditCard,
      href: "/admin/payments",
    },
    {
      label: "Today's Appointments",
      value: todayAppointmentsCount ?? 0,
      icon: Calendar,
      href: "/admin/calendar",
    },
    {
      label: "Total Clients",
      value: totalClients ?? 0,
      icon: Users,
      href: "/admin/clients",
    },
  ];

  return (
    <div className={cn(homeContainer, "px-5 py-8 sm:px-8 sm:py-14")}>
      <div className="mx-auto max-w-4xl space-y-10 sm:space-y-14">
        <div>
          <h1 className={type.pageTitle}>Admin Dashboard</h1>
        </div>

        <DashboardSection title="Today's Overview">
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Today's Appointments">
          {(todayAppointments ?? []).length === 0 ? (
            <EmptyState message="No appointments scheduled for today." />
          ) : (
            <div className="space-y-3 sm:space-y-5">
              {todayAppointments!.map((appt) => (
                <AdminAppointmentCard
                  key={appt.id}
                  appointment={appt as AppointmentWithRelations}
                  href={`/admin/appointments/${appt.id}`}
                />
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Recent Activity">
          {(recentAppointments ?? []).length === 0 ? (
            <EmptyState message="No recent activity yet." />
          ) : (
            <div className="space-y-3 sm:space-y-5">
              {recentAppointments!.map((appt) => (
                <AdminAppointmentCard
                  key={appt.id}
                  appointment={appt as AppointmentWithRelations}
                  href={`/admin/appointments/${appt.id}`}
                />
              ))}
            </div>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
