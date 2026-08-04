import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { uniquePsychologistSlug } from "@/lib/psychologist-slugs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.title === "string" || body.title === null) {
    updates.title = body.title?.trim() || null;
  }
  if (typeof body.bio === "string" || body.bio === null) {
    updates.bio = body.bio?.trim() || null;
  }
  if (typeof body.email === "string" || body.email === null) {
    updates.email = body.email?.trim() || null;
  }
  if (typeof body.license_number === "string" || body.license_number === null) {
    updates.license_number = body.license_number?.trim() || null;
  }
  if (typeof body.photo_url === "string" || body.photo_url === null) {
    updates.photo_url = body.photo_url?.trim() || null;
  }
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (Array.isArray(body.specialties)) {
    updates.specialties = body.specialties
      .map((s: unknown) => String(s).trim())
      .filter(Boolean);
  }

  if ("name" in updates && !String(updates.name ?? "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (typeof updates.name === "string") {
    const { data: peers } = await auth.supabase
      .from("psychologists")
      .select("id, slug")
      .neq("id", id);
    updates.slug = uniquePsychologistSlug(
      updates.name,
      (peers ?? []).map((p) => p.slug).filter(Boolean),
      id
    );
  }

  const { data, error } = await auth.supabase
    .from("psychologists")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Psychologist not found" }, { status: 404 });
  }

  return NextResponse.json({ psychologist: data });
}
