import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeStaffSearch } from "@/lib/admin-staff";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const query = sanitizeStaffSearch(url.searchParams.get("q") ?? "");

  if (query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const pattern = `"%${query}%"`;
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, email, full_name, first_name, last_name, avatar_url, role")
    .neq("role", "admin")
    .or(
      `full_name.ilike.${pattern},email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`
    )
    .order("full_name", { ascending: true, nullsFirst: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
