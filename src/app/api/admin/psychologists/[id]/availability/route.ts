import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AvailabilityInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const blocks = (body.blocks ?? []) as AvailabilityInput[];

  for (const block of blocks) {
    if (
      typeof block.day_of_week !== "number" ||
      block.day_of_week < 0 ||
      block.day_of_week > 6
    ) {
      return NextResponse.json(
        { error: "Invalid day_of_week" },
        { status: 400 }
      );
    }
    if (!block.start_time || !block.end_time) {
      return NextResponse.json(
        { error: "Start and end times are required" },
        { status: 400 }
      );
    }
    if (block.start_time >= block.end_time) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }
  }

  const { error: deleteError } = await auth.supabase
    .from("availability_blocks")
    .delete()
    .eq("psychologist_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (blocks.length === 0) {
    return NextResponse.json({ blocks: [] });
  }

  const rows = blocks.map((block) => ({
    psychologist_id: id,
    day_of_week: block.day_of_week,
    start_time: block.start_time.length === 5
      ? `${block.start_time}:00`
      : block.start_time,
    end_time: block.end_time.length === 5
      ? `${block.end_time}:00`
      : block.end_time,
    is_active: block.is_active !== false,
  }));

  const { data, error } = await auth.supabase
    .from("availability_blocks")
    .insert(rows)
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: data });
}
