import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPsychologistDetailDashboard } from "@/components/admin/psychologists/psychologist-detail-dashboard";
import type { PsychologistTimelineEvent } from "@/components/admin/psychologists/psychologist-detail-lists";
import { ADMIN_APPOINTMENT_WITH_AVATAR_SELECT } from "@/lib/appointment-selects";
import {
  isPsychologistUuid,
  psychologistAdminPath,
} from "@/lib/psychologist-slugs";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  Service,
  UnavailableBlock,
} from "@/types/database";

const UPCOMING_STATUSES = new Set(["pending_payment", "confirmed"]);

function buildPsychologistTimeline(
  psychologist: Psychologist,
  availabilityBlocks: AvailabilityBlock[]
): PsychologistTimelineEvent[] {
  const events: PsychologistTimelineEvent[] = [
    {
      id: `created-${psychologist.id}`,
      title: "Profile created",
      timestamp: psychologist.created_at,
    },
  ];

  if (psychologist.updated_at !== psychologist.created_at) {
    const createdMs = new Date(psychologist.created_at).getTime();
    const updatedMs = new Date(psychologist.updated_at).getTime();
    if (updatedMs - createdMs > 60_000) {
      events.push({
        id: `profile-updated-${psychologist.id}-${psychologist.updated_at}`,
        title: "Profile updated",
        timestamp: psychologist.updated_at,
      });
    }
  }

  const availabilityUpdates = availabilityBlocks
    .filter(
      (block) =>
        block.updated_at !== block.created_at ||
        new Date(block.updated_at).getTime() >
          new Date(psychologist.created_at).getTime()
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  for (const block of availabilityUpdates.slice(0, 5)) {
    events.push({
      id: `availability-${block.id}-${block.updated_at}`,
      title: "Availability changed",
      timestamp: block.updated_at,
    });
  }

  if (availabilityUpdates.length === 0 && availabilityBlocks.length > 0) {
    const latest = [...availabilityBlocks].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0]!;
    events.push({
      id: `availability-${latest.id}`,
      title: "Availability changed",
      timestamp: latest.updated_at,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function loadPsychologistBySlugOrId(slugOrId: string) {
  const supabase = await createClient();

  if (isPsychologistUuid(slugOrId)) {
    const { data, error } = await supabase
      .from("psychologists")
      .select("*")
      .eq("id", slugOrId)
      .maybeSingle();
    if (error && process.env.NODE_ENV === "development") {
      console.error("[psychologist page] id lookup failed:", error.message);
    }
    return {
      supabase,
      psychologist: (data as Psychologist | null) ?? null,
      viaUuid: true,
    };
  }

  const { data, error } = await supabase
    .from("psychologists")
    .select("*")
    .eq("slug", slugOrId)
    .maybeSingle();
  if (error && process.env.NODE_ENV === "development") {
    console.error("[psychologist page] slug lookup failed:", error.message);
  }
  return {
    supabase,
    psychologist: (data as Psychologist | null) ?? null,
    viaUuid: false,
  };
}

export default async function AdminPsychologistDetailPage({
  params,
}: {
  params: Promise<{ id?: string; slug?: string }>;
}) {
  const resolved = await params;
  // Segment value is the public slug (or legacy UUID). Folder param is `id`.
  const slugOrId = resolved.id ?? resolved.slug;
  if (!slugOrId) notFound();

  const { supabase, psychologist, viaUuid } =
    await loadPsychologistBySlugOrId(slugOrId);

  if (!psychologist) notFound();

  if (viaUuid) {
    permanentRedirect(psychologistAdminPath(psychologist.slug));
  }

  const id = psychologist.id;

  const [
    { data: appointments },
    { data: availabilityBlocks },
    { data: unavailableBlocks },
    { data: services },
    { data: psychologistServices },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(ADMIN_APPOINTMENT_WITH_AVATAR_SELECT)
      .eq("psychologist_id", id)
      .order("start_at", { ascending: false })
      .returns<AppointmentWithRelations[]>(),
    supabase
      .from("availability_blocks")
      .select("*")
      .eq("psychologist_id", id)
      .order("day_of_week"),
    supabase
      .from("unavailable_blocks")
      .select("*")
      .eq("psychologist_id", id)
      .order("start_at", { ascending: true }),
    supabase.from("services").select("*").order("name"),
    supabase
      .from("psychologist_services")
      .select("*")
      .eq("psychologist_id", id),
  ]);

  const allAppointments = (appointments ?? []) as AppointmentWithRelations[];
  const nowMs = Date.now();
  const upcomingAppointments = allAppointments
    .filter(
      (appointment) =>
        UPCOMING_STATUSES.has(appointment.status) &&
        new Date(appointment.start_at).getTime() >= nowMs
    )
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

  const enabledServiceIds = (psychologistServices ?? []).map(
    (link) => link.service_id
  );

  const allServices = (services ?? []) as Service[];
  const blocks = (availabilityBlocks ?? []) as AvailabilityBlock[];

  const timeline = buildPsychologistTimeline(psychologist, blocks);

  return (
    <AdminPsychologistDetailDashboard
      psychologist={psychologist}
      upcomingAppointments={upcomingAppointments}
      totalAppointments={allAppointments.length}
      upcomingCount={upcomingAppointments.length}
      completedCount={
        allAppointments.filter((a) => a.status === "completed").length
      }
      availabilityBlocks={blocks}
      unavailableBlocks={(unavailableBlocks ?? []) as UnavailableBlock[]}
      allServices={allServices}
      enabledServiceIds={enabledServiceIds}
      timeline={timeline}
    />
  );
}
