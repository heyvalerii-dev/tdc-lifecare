import { NextResponse } from "next/server";
import { parseISO } from "date-fns";
import { requireAdmin } from "@/lib/admin-auth";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";
import {
  SCHEDULING_APPOINTMENT_SELECT,
  validateSlot,
  type SchedulingAppointment,
} from "@/lib/scheduling";
import type { AvailabilityBlock, Service, UnavailableBlock } from "@/types/database";

/**
 * Validate a proposed admin booking start without creating an appointment.
 * Returns the same reasons as POST /api/bookings slot checks.
 *
 * Pass `exclude_appointment_id` when editing so the current appointment
 * is not treated as a conflict with itself.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const psychologistId = searchParams.get("psychologist_id");
  const serviceId = searchParams.get("service_id");
  const startAt = searchParams.get("start_at");
  const excludeAppointmentId = searchParams.get("exclude_appointment_id");

  if (!psychologistId || !serviceId || !startAt) {
    return NextResponse.json(
      { error: "psychologist_id, service_id, and start_at are required" },
      { status: 400 }
    );
  }

  const settings = await getClinicSettings();
  const slotStart = parseISO(startAt);
  if (Number.isNaN(slotStart.getTime())) {
    return NextResponse.json({ error: "Invalid start_at" }, { status: 400 });
  }

  const { data: service } = await auth.supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const [{ data: availability }, { data: unavailable }, { data: appointments }] =
    await Promise.all([
      auth.supabase
        .from("availability_blocks")
        .select("*")
        .eq("psychologist_id", psychologistId)
        .eq("is_active", true),
      auth.supabase
        .from("unavailable_blocks")
        .select("*")
        .eq("psychologist_id", psychologistId),
      auth.supabase
        .from("appointments")
        .select(SCHEDULING_APPOINTMENT_SELECT)
        .eq("psychologist_id", psychologistId),
    ]);

  const allAppointments = (appointments ?? []) as SchedulingAppointment[];
  const existingAppointments = excludeAppointmentId
    ? allAppointments.filter((a) => a.id !== excludeAppointmentId)
    : allAppointments;

  const excluded = excludeAppointmentId
    ? allAppointments.find((a) => a.id === excludeAppointmentId)
    : undefined;
  const allowPast = Boolean(
    excluded && parseISO(excluded.start_at).getTime() === slotStart.getTime()
  );

  const validation = validateSlot(slotStart, {
    availabilityBlocks: (availability ?? []) as AvailabilityBlock[],
    unavailableBlocks: (unavailable ?? []) as UnavailableBlock[],
    existingAppointments,
    service: service as Service,
    minimumAdvanceHours: settings.minimum_advance_booking_hours,
    allowSameDay: settings.allow_same_day_booking,
    bypassRules: true,
    allowPast,
    workingDays: getClinicWorkingDays(settings),
  });

  return NextResponse.json({
    valid: validation.valid,
    reason: validation.reason ?? null,
  });
}
