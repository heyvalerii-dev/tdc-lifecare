import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const fullName =
    typeof body.full_name === "string" ? body.full_name.trim() : "";

  if (!fullName) {
    return NextResponse.json(
      { error: "Display name is required" },
      { status: 400 }
    );
  }

  if (fullName.length > 120) {
    return NextResponse.json(
      { error: "Display name must be 120 characters or fewer" },
      { status: 400 }
    );
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  const now = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
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
    user_metadata: { full_name: fullName },
  });

  return NextResponse.json({ profile: data });
}
