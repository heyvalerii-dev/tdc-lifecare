import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getClinicWorkingDays } from "@/lib/clinic-working-days";
import { getAvailableDates, SCHEDULING_APPOINTMENT_SELECT, type SchedulingAppointment } from "@/lib/scheduling";
import type { AvailabilityBlock, UnavailableBlock, Service } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const psychologistId = searchParams.get("psychologist_id");
  const serviceId = searchParams.get("service_id");
  const bypass = searchParams.get("bypass") === "true";

  if (!psychologistId || !serviceId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = await createClient();
  const settings = await getClinicSettings();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const [{ data: availability }, { data: unavailable }, { data: appointments }] = await Promise.all([
    supabase.from("availability_blocks").select("*").eq("psychologist_id", psychologistId).eq("is_active", true),
    supabase.from("unavailable_blocks").select("*").eq("psychologist_id", psychologistId),
    supabase.from("appointments").select(SCHEDULING_APPOINTMENT_SELECT).eq("psychologist_id", psychologistId),
  ]);

  const dates = getAvailableDates(new Date(), 30, {
    availabilityBlocks: (availability ?? []) as AvailabilityBlock[],
    unavailableBlocks: (unavailable ?? []) as UnavailableBlock[],
    existingAppointments: (appointments ?? []) as SchedulingAppointment[],
    service: service as Service,
    minimumAdvanceHours: settings.minimum_advance_booking_hours,
    allowSameDay: settings.allow_same_day_booking,
    bypassRules: bypass,
    workingDays: getClinicWorkingDays(settings),
  });

  return NextResponse.json(dates);
}
