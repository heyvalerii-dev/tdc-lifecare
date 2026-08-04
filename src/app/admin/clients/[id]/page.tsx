import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminClientDetailDashboard } from "@/components/admin/clients/client-detail-dashboard";
import { buildClientListRows } from "@/lib/admin-clients-list";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { syncMissingProfileAvatars } from "@/lib/profile-avatar-sync";
import {
  STAFF_NOTE_AUTHOR_SELECT,
  toTimelineNote,
} from "@/lib/staff-notes";
import { ADMIN_APPOINTMENT_DETAIL_SELECT } from "@/lib/appointment-selects";
import type {
  AppointmentWithRelations,
  ClientProfileEvent,
  Profile,
  Psychologist,
  QuestionnaireResponse,
  StaffNoteWithAuthor,
} from "@/types/database";

function buildClientTimeline(
  profile: Profile,
  appointments: AppointmentWithRelations[],
  responses: Array<
    QuestionnaireResponse & {
      questionnaire?: { title?: string | null } | null;
    }
  >,
  profileEvents: ClientProfileEvent[]
) {
  const events: Array<{
    id: string;
    title: string;
    timestamp: string;
    detail?: string;
  }> = [
    {
      id: `created-${profile.id}`,
      title: "Client created",
      timestamp: profile.created_at,
    },
  ];

  for (const event of profileEvents) {
    events.push({
      id: `profile-event-${event.id}`,
      title: event.title,
      timestamp: event.created_at,
      detail: event.detail ?? undefined,
    });
  }

  for (const response of responses) {
    events.push({
      id: `questionnaire-${response.id}`,
      title: "Intake form submitted",
      timestamp: response.submitted_at,
      detail: response.questionnaire?.title ?? undefined,
    });
  }

  for (const appointment of appointments) {
    events.push({
      id: `booked-${appointment.id}`,
      title: "Appointment booked",
      timestamp: appointment.created_at,
      detail: appointment.service?.name ?? undefined,
    });

    const payment = Array.isArray(appointment.payment)
      ? appointment.payment[0]
      : appointment.payment;

    if (payment?.paid_at) {
      events.push({
        id: `payment-${payment.id}`,
        title: "Payment completed",
        timestamp: payment.paid_at,
        detail: appointment.service?.name ?? undefined,
      });
    }

    if (appointment.completed_at) {
      events.push({
        id: `completed-${appointment.id}`,
        title: "Appointment completed",
        timestamp: appointment.completed_at,
        detail: appointment.service?.name ?? undefined,
      });
    }

    if (appointment.cancelled_at) {
      events.push({
        id: `cancelled-${appointment.id}`,
        title: "Appointment cancelled",
        timestamp: appointment.cancelled_at,
        detail: appointment.service?.name ?? undefined,
      });
    }

    if (appointment.no_show_at) {
      events.push({
        id: `no-show-${appointment.id}`,
        title: "Marked as no show",
        timestamp: appointment.no_show_at,
        detail: appointment.service?.name ?? undefined,
      });
    }

    if (
      appointment.updated_at !== appointment.created_at &&
      !appointment.completed_at &&
      !appointment.cancelled_at &&
      !appointment.no_show_at
    ) {
      const createdMs = new Date(appointment.created_at).getTime();
      const updatedMs = new Date(appointment.updated_at).getTime();
      if (updatedMs - createdMs > 60_000) {
        events.push({
          id: `updated-${appointment.id}-${appointment.updated_at}`,
          title: "Appointment updated",
          timestamp: appointment.updated_at,
          detail:
            APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status,
        });
      }
    }
  }

  return events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const service = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "client")
    .single();

  if (!profile) notFound();

  const typedProfile = profile as Profile;

  const [
    { data: appointments },
    { data: questionnaireResponses },
    { data: psychologists },
    { data: profileEvents },
    { data: staffNotesRows },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(ADMIN_APPOINTMENT_DETAIL_SELECT)
      .eq("client_id", id)
      .order("start_at", { ascending: false })
      .returns<AppointmentWithRelations[]>(),
    supabase
      .from("questionnaire_responses")
      .select(
        "*, questionnaire:questionnaires(title), appointment:appointments(id, start_at)"
      )
      .eq("client_id", id)
      .order("submitted_at", { ascending: false }),
    supabase.from("psychologists").select("*").order("name", { ascending: true }),
    supabase
      .from("client_profile_events")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_notes")
      .select(STAFF_NOTE_AUTHOR_SELECT)
      .eq("entity_type", "client")
      .eq("entity_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const typedAppointments = (appointments ?? []) as AppointmentWithRelations[];
  const typedResponses = (questionnaireResponses ?? []) as Array<
    QuestionnaireResponse & {
      questionnaire?: { title?: string | null } | null;
      appointment?: { id: string; start_at: string } | null;
    }
  >;
  const typedPsychologists = (psychologists ?? []) as Psychologist[];
  const typedEvents = (profileEvents ?? []) as ClientProfileEvent[];
  const noteRows = (staffNotesRows ?? []) as unknown as StaffNoteWithAuthor[];

  // Authors are admins; header may show Google picture via auth metadata while
  // profiles.avatar_url is still null. Sync so notes can use the profile column.
  const avatarMap = await syncMissingProfileAvatars(
    service,
    noteRows.map((row) => row.author_id)
  );

  const staffNotes = noteRows.map((row) => toTimelineNote(row, avatarMap));

  const [row] = buildClientListRows(
    [typedProfile],
    typedAppointments,
    typedResponses,
    typedPsychologists
  );

  if (!row) notFound();

  const assignedPsychologist = row.assignedPsychologist;

  const timeline = buildClientTimeline(
    typedProfile,
    typedAppointments,
    typedResponses,
    typedEvents
  );

  return (
    <AdminClientDetailDashboard
      profile={typedProfile}
      appointments={typedAppointments}
      questionnaireResponses={typedResponses}
      assignedPsychologist={assignedPsychologist}
      nextAppointment={row.nextAppointment}
      lastAppointment={row.lastAppointment}
      psychologists={typedPsychologists.filter((p) => p.is_active)}
      timeline={timeline}
      staffNotes={staffNotes}
    />
  );
}
