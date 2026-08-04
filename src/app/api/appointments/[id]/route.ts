import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select(`
      id,
      psychologist_id,
      service_id,
      start_at,
      end_at,
      status,
      client_id,
      psychologist:psychologists(*),
      service:services(*)
    `)
    .eq("id", id)
    .single();

  if (error || !appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (appointment.client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(appointment);
}
