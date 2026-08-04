import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { insertClientProfileEvents } from "@/lib/client-profile-events";
import {
  optimizedStorageExt,
  validateOptimizedUpload,
} from "@/lib/images";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const { data: existing } = await auth.supabase
    .from("profiles")
    .select("id, role, avatar_url")
    .eq("id", id)
    .eq("role", "client")
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const validationError = validateOptimizedUpload(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ext = optimizedStorageExt(file.type);
  const path = `${id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await auth.supabase.storage
    .from("client-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = auth.supabase.storage.from("client-photos").getPublicUrl(path);

  const previousAvatar = existing.avatar_url as string | null;

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (previousAvatar !== publicUrl) {
    await insertClientProfileEvents(auth.supabase, {
      clientId: id,
      createdBy: auth.user.id,
      events: [
        {
          event_type: "photo_changed",
          title: "Profile photo changed",
          detail: previousAvatar ? "Photo updated" : "Photo added",
        },
      ],
    });
  }

  return NextResponse.json({ client: data, avatar_url: publicUrl });
}
