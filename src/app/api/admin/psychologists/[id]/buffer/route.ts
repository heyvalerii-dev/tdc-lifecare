import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const serviceId = typeof body.service_id === "string" ? body.service_id : null;
  const bufferMinutes = Number(body.buffer_minutes);

  if (!serviceId) {
    return NextResponse.json({ error: "service_id is required" }, { status: 400 });
  }

  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 240) {
    return NextResponse.json(
      { error: "buffer_minutes must be between 0 and 240" },
      { status: 400 }
    );
  }

  const { data: link, error: linkError } = await auth.supabase
    .from("psychologist_services")
    .select("id")
    .eq("psychologist_id", id)
    .eq("service_id", serviceId)
    .maybeSingle();

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }
  if (!link) {
    return NextResponse.json(
      { error: "Service is not enabled for this psychologist" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("services")
    .update({
      buffer_minutes: Math.round(bufferMinutes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ service: data });
}
