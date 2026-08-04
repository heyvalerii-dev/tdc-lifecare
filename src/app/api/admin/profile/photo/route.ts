import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  optimizedStorageExt,
  validateOptimizedUpload,
} from "@/lib/images";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

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
  const path = `${auth.user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await auth.supabase.storage
    .from("profile-photos")
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
  } = auth.supabase.storage.from("profile-photos").getPublicUrl(path);

  const now = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_by: auth.user.id,
      updated_at: now,
    })
    .eq("id", auth.user.id)
    .select("id, email, full_name, first_name, last_name, avatar_url, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auth.supabase.auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      avatar_url: publicUrl,
      picture: publicUrl,
    },
  });

  return NextResponse.json({ profile: data, avatar_url: publicUrl });
}
