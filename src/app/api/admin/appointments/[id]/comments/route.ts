import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import {
  APPOINTMENT_COMMENT_AUTHOR_SELECT,
  resolveAuthorDisplayName,
  toAppointmentCommentView,
} from "@/lib/appointment-comments";
import { syncMissingProfileAvatars } from "@/lib/profile-avatar-sync";
import type { AppointmentCommentWithAuthor } from "@/types/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: appointmentId } = await context.params;

  const { data: appointment } = await auth.supabase
    .from("appointments")
    .select("id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from("appointment_comments")
    .select(APPOINTMENT_COMMENT_AUTHOR_SELECT)
    .eq("appointment_id", appointmentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as AppointmentCommentWithAuthor[];
  const avatarMap = await syncMissingProfileAvatars(
    auth.supabase,
    rows.map((row) => row.author_id)
  );

  return NextResponse.json({
    comments: rows.map((row) => toAppointmentCommentView(row, avatarMap)),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: appointmentId } = await context.params;
  const body = await request.json();
  const commentBody =
    typeof body.body === "string" ? body.body.trim() : "";

  if (!commentBody) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  const { data: appointment } = await auth.supabase
    .from("appointments")
    .select("id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", auth.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await syncMissingProfileAvatars(auth.supabase, [auth.user.id]);

  const { data, error } = await auth.supabase
    .from("appointment_comments")
    .insert({
      appointment_id: appointmentId,
      author_id: auth.user.id,
      author_name: resolveAuthorDisplayName(profile),
      author_role: profile.role,
      body: commentBody,
      kind: "comment",
    })
    .select(APPOINTMENT_COMMENT_AUTHOR_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as unknown as AppointmentCommentWithAuthor;
  const avatarMap = await syncMissingProfileAvatars(auth.supabase, [
    row.author_id,
  ]);

  await logActivity(auth.supabase, {
    entityType: "appointment",
    entityId: appointmentId,
    ...adminActor(auth.user.id),
    action: "comment_added",
    source: "Admin Panel",
  });

  return NextResponse.json({
    comment: toAppointmentCommentView(row, avatarMap),
  });
}
