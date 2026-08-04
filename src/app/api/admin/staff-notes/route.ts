import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import { syncMissingProfileAvatars } from "@/lib/profile-avatar-sync";
import {
  isStaffNoteEntityType,
  STAFF_NOTE_AUTHOR_SELECT,
  toTimelineNote,
} from "@/lib/staff-notes";
import type { ActivityEntityType, StaffNoteWithAuthor } from "@/types/database";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!isStaffNoteEntityType(entityType) || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("staff_notes")
    .select(STAFF_NOTE_AUTHOR_SELECT)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as StaffNoteWithAuthor[];
  const avatarMap = await syncMissingProfileAvatars(
    auth.supabase,
    rows.map((row) => row.author_id)
  );

  return NextResponse.json({
    notes: rows.map((row) => toTimelineNote(row, avatarMap)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const entityType = body.entityType;
  const entityId =
    typeof body.entityId === "string" ? body.entityId.trim() : "";
  const noteBody =
    typeof body.body === "string" ? body.body.trim() : "";

  if (!isStaffNoteEntityType(entityType) || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  if (!noteBody) {
    return NextResponse.json(
      { error: "Note content is required" },
      { status: 400 }
    );
  }

  if (entityType === "client") {
    const { data: client } = await auth.supabase
      .from("profiles")
      .select("id")
      .eq("id", entityId)
      .eq("role", "client")
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  // Persist OAuth picture onto the author profile before insert so the join
  // returns avatar_url (header already shows it via user_metadata fallback).
  await syncMissingProfileAvatars(auth.supabase, [auth.user.id]);

  const { data, error } = await auth.supabase
    .from("staff_notes")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      author_id: auth.user.id,
      body: noteBody,
    })
    .select(STAFF_NOTE_AUTHOR_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as unknown as StaffNoteWithAuthor;
  const avatarMap = await syncMissingProfileAvatars(auth.supabase, [
    row.author_id,
  ]);

  const activityEntityType: ActivityEntityType | null =
    entityType === "client"
      ? "client"
      : entityType === "appointment"
        ? "appointment"
        : null;

  if (activityEntityType) {
    await logActivity(auth.supabase, {
      entityType: activityEntityType,
      entityId,
      ...adminActor(auth.user.id),
      action: "staff_note_added",
      source: "Admin Panel",
    });
  }

  return NextResponse.json({
    note: toTimelineNote(row, avatarMap),
  });
}
