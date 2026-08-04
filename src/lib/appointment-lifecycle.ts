import type { Appointment, AppointmentWithRelations } from "@/types/database";

export type AppointmentLifecycleGroup = "upcoming" | "completed" | "expired";

export interface GroupedAppointments {
  upcoming: AppointmentWithRelations[];
  completed: AppointmentWithRelations[];
  expired: AppointmentWithRelations[];
}

function normalizeAppointment(appointment: AppointmentWithRelations): AppointmentWithRelations {
  const payment = Array.isArray(appointment.payment)
    ? appointment.payment[0]
    : appointment.payment;
  return { ...appointment, payment };
}

export function isPaymentDeadlinePassed(
  appointment: Pick<Appointment, "status" | "payment_due_at">,
  now: Date = new Date()
): boolean {
  if (appointment.status === "expired") return true;
  if (appointment.status !== "pending_payment") return false;
  if (!appointment.payment_due_at) return false;
  return new Date(appointment.payment_due_at) < now;
}

export function getAppointmentLifecycleGroup(
  appointment: Pick<Appointment, "status" | "payment_due_at">,
  now: Date = new Date()
): AppointmentLifecycleGroup | null {
  if (appointment.status === "cancelled" || appointment.status === "no_show") {
    return null;
  }

  if (appointment.status === "completed") {
    return "completed";
  }

  if (isPaymentDeadlinePassed(appointment, now)) {
    return "expired";
  }

  if (appointment.status === "confirmed" || appointment.status === "pending_payment") {
    return "upcoming";
  }

  return null;
}

/** Status key used by PatientStatusPill on the dashboard */
export function getDashboardDisplayStatus(
  appointment: Pick<Appointment, "status" | "payment_due_at">,
  now: Date = new Date()
): string {
  const group = getAppointmentLifecycleGroup(appointment, now);
  if (group === "expired") return "expired";
  if (group === "completed") return "completed";
  if (appointment.status === "pending_payment") return "pending_payment";
  if (appointment.status === "confirmed") return "confirmed";
  return appointment.status;
}

export function groupAppointmentsByLifecycle(
  appointments: AppointmentWithRelations[],
  now: Date = new Date()
): GroupedAppointments {
  const grouped: GroupedAppointments = {
    upcoming: [],
    completed: [],
    expired: [],
  };

  for (const raw of appointments) {
    const appointment = normalizeAppointment(raw);
    const group = getAppointmentLifecycleGroup(appointment, now);
    if (!group) continue;
    grouped[group].push(appointment);
  }

  grouped.upcoming.sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  grouped.completed.sort(
    (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
  );
  grouped.expired.sort(
    (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
  );

  return grouped;
}
