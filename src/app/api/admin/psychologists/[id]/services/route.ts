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
  const serviceIds = Array.isArray(body.serviceIds)
    ? (body.serviceIds as unknown[]).map(String)
    : null;

  if (!serviceIds) {
    return NextResponse.json(
      { error: "serviceIds array is required" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await auth.supabase
    .from("psychologist_services")
    .delete()
    .eq("psychologist_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (serviceIds.length === 0) {
    return NextResponse.json({ serviceIds: [] });
  }

  const { error } = await auth.supabase.from("psychologist_services").insert(
    serviceIds.map((service_id) => ({
      psychologist_id: id,
      service_id,
    }))
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ serviceIds });
}
