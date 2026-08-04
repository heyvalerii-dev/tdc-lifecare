import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";
import { logActivity } from "@/lib/activity";
import { validateSlot, SCHEDULING_APPOINTMENT_SELECT, type SchedulingAppointment } from "@/lib/scheduling";
import { addHours, addMinutes, parseISO } from "date-fns";
import type { AvailabilityBlock, UnavailableBlock, Service } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { psychologist_id, service_id, start_at, questionnaire_responses, is_admin_booking, payment_method } = body;

  if (!psychologist_id || !service_id || !start_at) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const settings = await getClinicSettings();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", service_id)
    .single();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const slotStart = parseISO(start_at);
  const endAt = addMinutes(slotStart, (service as Service).duration_minutes);

  const [{ data: availability }, { data: unavailable }, { data: appointments }] = await Promise.all([
    supabase.from("availability_blocks").select("*").eq("psychologist_id", psychologist_id).eq("is_active", true),
    supabase.from("unavailable_blocks").select("*").eq("psychologist_id", psychologist_id),
    supabase.from("appointments").select(SCHEDULING_APPOINTMENT_SELECT).eq("psychologist_id", psychologist_id),
  ]);

  const validation = validateSlot(slotStart, {
    availabilityBlocks: (availability ?? []) as AvailabilityBlock[],
    unavailableBlocks: (unavailable ?? []) as UnavailableBlock[],
    existingAppointments: (appointments ?? []) as SchedulingAppointment[],
    service: service as Service,
    minimumAdvanceHours: settings.minimum_advance_booking_hours,
    allowSameDay: settings.allow_same_day_booking,
    bypassRules: !!is_admin_booking,
    workingDays: getClinicWorkingDays(settings),
  });

  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const isAdmin = is_admin_booking === true;
  let status = "pending_payment";
  let paymentDueAt: string | null = addHours(new Date(), settings.payment_hold_hours).toISOString();

  if (isAdmin) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bypassPayment = settings.allow_admin_booking_without_payment &&
      ["cash", "gcash_manual", "bank_transfer", "pro_bono", "waived"].includes(payment_method);

    if (bypassPayment) {
      status = "confirmed";
      paymentDueAt = null;
    }
  }

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      client_id: body.client_id ?? user.id,
      psychologist_id,
      service_id,
      start_at: slotStart.toISOString(),
      end_at: endAt.toISOString(),
      status,
      payment_due_at: paymentDueAt,
      is_admin_booking: isAdmin,
      notes: body.notes ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 });

  const paymentStatus = status === "confirmed" ? "paid" : "pending";
  const { error: paymentError } = await supabase.from("payments").insert({
    appointment_id: appointment.id,
    amount_cents: (service as Service).price_cents,
    status: paymentStatus,
    method: isAdmin ? payment_method ?? null : "paymongo",
    expires_at: paymentDueAt,
    paid_at: status === "confirmed" ? new Date().toISOString() : null,
  });

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });

  if (questionnaire_responses) {
    const { data: questionnaire } = await supabase
      .from("questionnaires")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (questionnaire) {
      await supabase.from("questionnaire_responses").insert({
        appointment_id: appointment.id,
        questionnaire_id: questionnaire.id,
        client_id: body.client_id ?? user.id,
        responses: questionnaire_responses,
      });
    }
  }

  await logActivity(supabase, {
    entityType: "appointment",
    entityId: appointment.id,
    actorId: user.id,
    actorType: isAdmin ? "admin" : "client",
    action: isAdmin ? "appointment_manual_booking" : "appointment_booked_online",
    source: isAdmin ? "Manual Booking" : "Online Booking",
  });

  return NextResponse.json({ appointment_id: appointment.id, status });
}
