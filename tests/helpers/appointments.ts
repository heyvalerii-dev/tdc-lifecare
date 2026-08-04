import type { Appointment } from "@/types/database";
import { clinicIso } from "./dates";
import { nextId } from "./ids";

type CreateAppointmentInput = Partial<Appointment> & {
  psychologistId: string;
  clientId?: string;
  serviceId?: string;
  /** Clinic date yyyy-MM-dd */
  date: string;
  /** HH:mm clinic local */
  startTime?: string;
  durationMinutes?: number;
};

function addMinutesHhmm(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function createAppointment(input: CreateAppointmentInput): Appointment {
  const startTime = input.startTime ?? "10:00";
  const duration = input.durationMinutes ?? 50;
  const endTime = addMinutesHhmm(startTime, duration);

  const {
    psychologistId,
    clientId,
    serviceId,
    date,
    startTime: _st,
    durationMinutes: _dm,
    ...rest
  } = input;

  return {
    id: nextId("appt"),
    client_id: clientId ?? nextId("client"),
    psychologist_id: psychologistId,
    service_id: serviceId ?? nextId("service"),
    start_at: clinicIso(date, startTime),
    end_at: clinicIso(date, endTime),
    status: "confirmed",
    payment_due_at: null,
    notes: null,
    is_admin_booking: false,
    completed_at: null,
    cancelled_at: null,
    no_show_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...rest,
  };
}
