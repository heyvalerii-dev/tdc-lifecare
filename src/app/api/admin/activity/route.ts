import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchEntityActivity } from "@/lib/activity";
import type { ActivityEntityType } from "@/types/database";

const ENTITY_TYPES = new Set<ActivityEntityType>([
  "appointment",
  "block",
  "client",
  "psychologist",
]);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as ActivityEntityType | null;
  const entityId = searchParams.get("entityId");

  if (!entityType || !ENTITY_TYPES.has(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  try {
    const activity = await fetchEntityActivity(
      auth.supabase,
      entityType,
      entityId
    );
    return NextResponse.json({ activity });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Couldn't load activity",
      },
      { status: 500 }
    );
  }
}
