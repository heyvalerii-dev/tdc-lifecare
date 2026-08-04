import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
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
    .from("psychologist-photos")
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
  } = auth.supabase.storage.from("psychologist-photos").getPublicUrl(path);

  const { data, error } = await auth.supabase
    .from("psychologists")
    .update({
      photo_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ psychologist: data, photo_url: publicUrl });
}
