import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminAppointmentDetailDashboard } from "@/components/admin/appointments/appointment-detail/appointment-detail-dashboard";
import { ADMIN_APPOINTMENT_DETAIL_SELECT } from "@/lib/appointment-selects";
import {
  APPOINTMENT_COMMENT_AUTHOR_SELECT,
  toAppointmentCommentView,
} from "@/lib/appointment-comments";
import { resolveClientAvatarSrc } from "@/lib/admin-avatar";
import { syncMissingProfileAvatars } from "@/lib/profile-avatar-sync";
import type {
  AppointmentCommentWithAuthor,
  AppointmentWithRelations,
  Payment,
  QuestionnaireResponse,
  UserRole,
} from "@/types/database";

export default async function AdminAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(ADMIN_APPOINTMENT_DETAIL_SELECT)
    .eq("id", id)
    .returns<(AppointmentWithRelations & { payment: Payment | Payment[] | null; questionnaire_response: QuestionnaireResponse | QuestionnaireResponse[] | null })[]>()
    .single();

  if (!appointment) notFound();

  const typed = appointment as unknown as AppointmentWithRelations;
  const payment = (
    Array.isArray(appointment.payment) ? appointment.payment[0] : appointment.payment
  ) as Payment | null;
  const questionnaireResponse = (
    Array.isArray(appointment.questionnaire_response)
      ? appointment.questionnaire_response[0]
      : appointment.questionnaire_response
  ) as QuestionnaireResponse | null;

  const [{ data: profile }, { data: commentRows }, clientAvatarSrc] =
    await Promise.all([
      user
        ? supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from("appointment_comments")
        .select(APPOINTMENT_COMMENT_AUTHOR_SELECT)
        .eq("appointment_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      resolveClientAvatarSrc(typed.client_id, typed.client?.avatar_url),
    ]);

  const rows = (commentRows ?? []) as unknown as AppointmentCommentWithAuthor[];
  const avatarMap = await syncMissingProfileAvatars(
    supabase,
    rows.map((row) => row.author_id)
  );
  const comments = rows.map((row) => toAppointmentCommentView(row, avatarMap));

  return (
    <AdminAppointmentDetailDashboard
      appointment={typed}
      payment={payment}
      questionnaireResponse={questionnaireResponse}
      clientAvatarSrc={clientAvatarSrc}
      comments={comments}
      currentUserId={user?.id ?? profile?.id ?? ""}
      currentUserRole={(profile?.role as UserRole) ?? "admin"}
    />
  );
}
