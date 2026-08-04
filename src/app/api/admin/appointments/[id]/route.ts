import { NextResponse } from "next/server";
import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivities, type LogActivityInput } from "@/lib/activity";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";
import { CLINIC_TIMEZONE, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  SCHEDULING_APPOINTMENT_SELECT,
  validateSlot,
  type SchedulingAppointment,
} from "@/lib/scheduling";
import type {
  AvailabilityBlock,
  PaymentMethod,
  Service,
  UnavailableBlock,
} from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Admin update / reschedule for an existing appointment.
 * Conflict checks ignore the appointment being edited.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();

  const { data: existing, error: loadError } = await auth.supabase
    .from("appointments")
    .select("*, payment:payments(*)")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const psychologistId =
    typeof body.psychologist_id === "string"
      ? body.psychologist_id
      : existing.psychologist_id;
  const serviceId =
    typeof body.service_id === "string" ? body.service_id : existing.service_id;
  const clientId =
    typeof body.client_id === "string" ? body.client_id : existing.client_id;
  const startAtRaw =
    typeof body.start_at === "string" ? body.start_at : existing.start_at;
  const notes =
    body.notes !== undefined
      ? typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null
      : existing.notes;

  const slotStart = parseISO(startAtRaw);
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

  const endAt = addMinutes(
    slotStart,
    (service as Service).duration_minutes
  ).toISOString();

  const scheduleUnchanged =
    clientId === existing.client_id &&
    psychologistId === existing.psychologist_id &&
    serviceId === existing.service_id &&
    parseISO(existing.start_at).getTime() === slotStart.getTime();

  // Notes / payment-method-only updates should not re-run availability checks
  // (e.g. editing admin notes on a closed-day or past appointment).
  if (!scheduleUnchanged) {
    const settings = await getClinicSettings();
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

    const others = ((appointments ?? []) as SchedulingAppointment[]).filter(
      (a) => a.id !== id
    );

    const sameStart =
      parseISO(existing.start_at).getTime() === slotStart.getTime();

    const validation = validateSlot(slotStart, {
      availabilityBlocks: (availability ?? []) as AvailabilityBlock[],
      unavailableBlocks: (unavailable ?? []) as UnavailableBlock[],
      existingAppointments: others,
      service: service as Service,
      minimumAdvanceHours: settings.minimum_advance_booking_hours,
      allowSameDay: settings.allow_same_day_booking,
      bypassRules: true,
      allowPast: sameStart,
      workingDays: getClinicWorkingDays(settings),
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("appointments")
    .update({
      client_id: clientId,
      psychologist_id: psychologistId,
      service_id: serviceId,
      start_at: slotStart.toISOString(),
      end_at: endAt,
      notes,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const actor = adminActor(auth.user.id);
  const activity: LogActivityInput[] = [];

  const prevStart = formatInTimeZone(
    existing.start_at,
    CLINIC_TIMEZONE,
    "MMM d, yyyy h:mm a"
  );
  const nextStart = formatInTimeZone(
    slotStart.toISOString(),
    CLINIC_TIMEZONE,
    "MMM d, yyyy h:mm a"
  );
  if (existing.start_at !== slotStart.toISOString()) {
    activity.push({
      entityType: "appointment",
      entityId: id,
      ...actor,
      action: "appointment_rescheduled",
      source: "Manual Booking",
      metadata: { oldTime: prevStart, newTime: nextStart },
    });
  }

  if (existing.psychologist_id !== psychologistId) {
    const [{ data: oldPsych }, { data: newPsych }] = await Promise.all([
      auth.supabase
        .from("psychologists")
        .select("name")
        .eq("id", existing.psychologist_id)
        .maybeSingle(),
      auth.supabase
        .from("psychologists")
        .select("name")
        .eq("id", psychologistId)
        .maybeSingle(),
    ]);
    activity.push({
      entityType: "appointment",
      entityId: id,
      ...actor,
      action: "psychologist_changed",
      source: "Manual Booking",
      metadata: {
        oldPsychologist: oldPsych?.name ?? "—",
        newPsychologist: newPsych?.name ?? "—",
      },
    });
  }

  if (existing.service_id !== serviceId) {
    const { data: oldService } = await auth.supabase
      .from("services")
      .select("name")
      .eq("id", existing.service_id)
      .maybeSingle();
    activity.push({
      entityType: "appointment",
      entityId: id,
      ...actor,
      action: "service_changed",
      source: "Manual Booking",
      metadata: {
        oldService: oldService?.name ?? "—",
        newService: (service as Service).name,
      },
    });
  }

  if (typeof body.payment_method === "string" && body.payment_method) {
    const method = body.payment_method as PaymentMethod;
    const existingPayment = Array.isArray(existing.payment)
      ? existing.payment[0]
      : existing.payment;
    const oldMethod = existingPayment?.method as PaymentMethod | null | undefined;

    const { error: paymentError } = await auth.supabase
      .from("payments")
      .update({
        method,
        updated_at: new Date().toISOString(),
      })
      .eq("appointment_id", id);

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    if (oldMethod !== method) {
      activity.push({
        entityType: "appointment",
        entityId: id,
        ...actor,
        action: "payment_method_changed",
        source: "Manual Booking",
        metadata: {
          oldPaymentMethod: oldMethod
            ? PAYMENT_METHOD_LABELS[oldMethod] ?? oldMethod
            : "—",
          newPaymentMethod: PAYMENT_METHOD_LABELS[method] ?? method,
        },
      });
    }
  }

  await logActivities(auth.supabase, activity);

  return NextResponse.json({ appointment: updated });
}
