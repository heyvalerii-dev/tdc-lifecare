import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import {
  APPOINTMENT_COMMENT_AUTHOR_SELECT,
  canEditOrDeleteComment,
  toAppointmentCommentView,
} from "@/lib/appointment-comments";
import { syncMissingProfileAvatars } from "@/lib/profile-avatar-sync";
import type { AppointmentCommentWithAuthor } from "@/types/database";

type RouteContext = {
  params: Promise<{ id: string; commentId: string }>;
};

async function loadAuthorRole(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? "admin";
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: appointmentId, commentId } = await context.params;
  const body = await request.json();
  const commentBody =
    typeof body.body === "string" ? body.body.trim() : "";

  if (!commentBody) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  const { data: existing, error: loadError } = await auth.supabase
    .from("appointment_comments")
    .select("*")
    .eq("id", commentId)
    .eq("appointment_id", appointmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const role = await loadAuthorRole(auth.supabase, auth.user.id);
  if (
    !canEditOrDeleteComment({
      authorId: existing.author_id,
      currentUserId: auth.user.id,
      currentUserRole: role,
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("appointment_comments")
    .update({
      body: commentBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
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
    action: "comment_updated",
    source: "Admin Panel",
  });

  return NextResponse.json({
    comment: toAppointmentCommentView(row, avatarMap),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: appointmentId, commentId } = await context.params;

  const { data: existing, error: loadError } = await auth.supabase
    .from("appointment_comments")
    .select("*")
    .eq("id", commentId)
    .eq("appointment_id", appointmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const role = await loadAuthorRole(auth.supabase, auth.user.id);
  if (
    !canEditOrDeleteComment({
      authorId: existing.author_id,
      currentUserId: auth.user.id,
      currentUserRole: role,
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await auth.supabase
    .from("appointment_comments")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(auth.supabase, {
    entityType: "appointment",
    entityId: appointmentId,
    ...adminActor(auth.user.id),
    action: "comment_deleted",
    source: "Admin Panel",
  });

  return NextResponse.json({ ok: true });
}
