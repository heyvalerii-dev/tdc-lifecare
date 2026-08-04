import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

interface ServiceInput {
  name: string;
  description?: string | null;
  price_cents: number;
  duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
}

function validateService(service: ServiceInput) {
  if (typeof service.name !== "string" || !service.name.trim()) {
    return "Each service needs a name";
  }

  const price = Number(service.price_cents);
  const duration = Number(service.duration_minutes);
  const buffer = Number(service.buffer_minutes);

  if (!Number.isFinite(price) || price < 0) {
    return "Price must be 0 or greater";
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return "Duration must be greater than 0";
  }
  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 240) {
    return "Buffer must be between 0 and 240 minutes";
  }

  return null;
}

function toPayload(service: ServiceInput) {
  return {
    name: service.name.trim(),
    description: service.description?.trim() || null,
    price_cents: Math.round(Number(service.price_cents)),
    duration_minutes: Math.round(Number(service.duration_minutes)),
    buffer_minutes: Math.round(Number(service.buffer_minutes)),
    is_active: Boolean(service.is_active),
    updated_at: new Date().toISOString(),
  };
}

/** Create a single service. Never used for existing rows. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as ServiceInput;
  const validationError = validateService(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const payload = toPayload(body);

  if (process.env.NODE_ENV === "development") {
    console.log("[api/admin/services] CREATE", payload);
  }

  const { data, error } = await auth.supabase
    .from("services")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[api/admin/services] CREATE response", data);
  }

  return NextResponse.json({ service: data });
}
