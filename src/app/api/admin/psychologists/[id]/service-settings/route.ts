import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ServiceSettingInput {
  service_id: string;
  enabled: boolean;
  buffer_minutes: number;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const services = Array.isArray(body.services)
    ? (body.services as ServiceSettingInput[])
    : null;

  if (!services) {
    return NextResponse.json(
      { error: "services array is required" },
      { status: 400 }
    );
  }

  for (const service of services) {
    if (typeof service.service_id !== "string" || !service.service_id) {
      return NextResponse.json({ error: "Invalid service_id" }, { status: 400 });
    }

    const bufferMinutes = Number(service.buffer_minutes);
    if (
      !Number.isFinite(bufferMinutes) ||
      bufferMinutes < 0 ||
      bufferMinutes > 240
    ) {
      return NextResponse.json(
        { error: "buffer_minutes must be between 0 and 240" },
        { status: 400 }
      );
    }
  }

  const enabledIds = services.filter((service) => service.enabled).map(
    (service) => service.service_id
  );

  const { error: deleteError } = await auth.supabase
    .from("psychologist_services")
    .delete()
    .eq("psychologist_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (enabledIds.length > 0) {
    const { error: insertError } = await auth.supabase
      .from("psychologist_services")
      .insert(
        enabledIds.map((service_id) => ({
          psychologist_id: id,
          service_id,
        }))
      );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  for (const service of services) {
    if (!service.enabled) continue;

    const { error } = await auth.supabase
      .from("services")
      .update({
        buffer_minutes: Math.round(Number(service.buffer_minutes)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.service_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
