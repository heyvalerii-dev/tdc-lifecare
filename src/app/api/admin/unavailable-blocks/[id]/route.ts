import { NextResponse } from "next/server";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { requireAdmin } from "@/lib/admin-auth";
import { adminActor, logActivity } from "@/lib/activity";
import {
  expandBlockOccurrences,
  expandRuleToOccurrences,
  inferLayer,
  type BlockRecurrenceInput,
} from "@/lib/calendar-blocks";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { clinicDateToUtc, rangesOverlap } from "@/lib/datetime";
import { SCHEDULING_APPOINTMENT_SELECT } from "@/lib/scheduling";
import type {
  Appointment,
  BlockLayer,
  BlockRecurrenceEndType,
  BlockRecurrenceType,
  UnavailableBlock,
} from "@/types/database";

type EditScope = "this" | "future" | "series";

function parseRecurrenceFromBody(
  body: Record<string, unknown>,
  fallback: UnavailableBlock
): BlockRecurrenceInput {
  return {
    type:
      (body.recurrence_type as BlockRecurrenceType) ||
      fallback.recurrence_type ||
      "none",
    interval: Math.max(
      1,
      Number(body.recurrence_interval) || fallback.recurrence_interval || 1
    ),
    days: Array.isArray(body.recurrence_days)
      ? (body.recurrence_days as number[])
      : fallback.recurrence_days || [],
    endType:
      (body.recurrence_end_type as BlockRecurrenceEndType) ||
      fallback.recurrence_end_type ||
      "never",
    endDate:
      typeof body.recurrence_end_date === "string"
        ? body.recurrence_end_date || null
        : fallback.recurrence_end_date,
    count:
      body.recurrence_count != null
        ? Math.max(1, Number(body.recurrence_count))
        : fallback.recurrence_count,
  };
}

function nextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  const { data: existing, error: loadError } = await auth.supabase
    .from("unavailable_blocks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const block = existing as UnavailableBlock;

  const explicitLayer =
    body.layer === "rule" || body.layer === "override"
      ? (body.layer as BlockLayer)
      : body.mode === "recurring"
        ? ("rule" as BlockLayer)
        : body.mode === "one_time"
          ? ("override" as BlockLayer)
          : null;

  let recurrence = parseRecurrenceFromBody(body, block);
  const layer =
    explicitLayer ??
    (block.layer as BlockLayer | undefined) ??
    inferLayer(recurrence.type);

  if (layer === "rule" && recurrence.type === "none") {
    recurrence = { ...recurrence, type: "weekday" };
  }
  if (layer === "override") {
    recurrence = {
      type: "none",
      interval: 1,
      days: [],
      endType: "never",
      endDate: null,
      count: null,
    };
  }

  const allDay =
    layer === "override"
      ? body.all_day === true ||
        (body.all_day === undefined && Boolean(block.all_day))
      : false;

  const suppressesRuleId =
    layer === "override"
      ? typeof body.suppresses_rule_id === "string" && body.suppresses_rule_id
        ? body.suppresses_rule_id
        : body.suppresses_rule_id === null
          ? null
          : (block.suppresses_rule_id ?? null)
      : null;

  let startAt = block.start_at;
  let endAt = block.end_at;

  if (typeof body.start_date === "string") {
    const startDate = body.start_date;
    const endDate =
      typeof body.end_date === "string" ? body.end_date : startDate;

    if (layer === "override") {
      if (allDay) {
        startAt = clinicDateToUtc(startDate, "00:00").toISOString();
        endAt = clinicDateToUtc(nextDayStr(endDate), "00:00").toISOString();
      } else if (
        typeof body.start_time === "string" &&
        typeof body.end_time === "string"
      ) {
        startAt = clinicDateToUtc(startDate, body.start_time).toISOString();
        endAt = clinicDateToUtc(endDate, body.end_time).toISOString();
      }
    } else if (
      typeof body.start_time === "string" &&
      typeof body.end_time === "string"
    ) {
      const first = expandBlockOccurrences({
        date: startDate,
        startTime: body.start_time,
        endTime: body.end_time,
        recurrence,
      })[0];
      if (first) {
        startAt = first.start_at;
        endAt = first.end_at;
      }
    }
  } else {
    if (typeof body.start_at === "string") startAt = body.start_at;
    if (typeof body.end_at === "string") endAt = body.end_at;
  }

  if (parseISO(startAt) >= parseISO(endAt)) {
    return NextResponse.json(
      { error: "End must be after start" },
      { status: 400 }
    );
  }

  const psychologistId =
    typeof body.psychologist_id === "string"
      ? body.psychologist_id
      : block.psychologist_id;

  const updates: Record<string, unknown> = {
    start_at: startAt,
    end_at: endAt,
    psychologist_id: psychologistId,
    layer,
    all_day: allDay,
    suppresses_rule_id: suppressesRuleId,
    recurrence_type: recurrence.type,
    recurrence_interval: recurrence.interval,
    recurrence_days: recurrence.days,
    recurrence_end_type: recurrence.endType,
    recurrence_end_date: recurrence.endDate,
    recurrence_count: recurrence.count,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof body.reason === "string") updates.reason = body.reason;
  if (body.title !== undefined) {
    updates.title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;
  }
  if (body.notes !== undefined) {
    updates.notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;
  }

  // Conflict checks
  const { data: allBlocks } = await auth.supabase
    .from("unavailable_blocks")
    .select("*")
    .eq("psychologist_id", psychologistId);

  const { data: appointments } = await auth.supabase
    .from("appointments")
    .select(SCHEDULING_APPOINTMENT_SELECT)
    .eq("psychologist_id", psychologistId)
    .lt("start_at", endAt)
    .gt("end_at", startAt);

  const others = ((allBlocks ?? []) as UnavailableBlock[]).filter(
    (b) => b.id !== block.id
  );

  const checkRanges =
    layer === "rule"
      ? expandBlockOccurrences({
          date: formatInTimeZone(startAt, CLINIC_TIMEZONE, "yyyy-MM-dd"),
          startTime: formatInTimeZone(startAt, CLINIC_TIMEZONE, "HH:mm"),
          endTime: formatInTimeZone(endAt, CLINIC_TIMEZONE, "HH:mm"),
          recurrence,
        }).slice(0, 60)
      : [{ start_at: startAt, end_at: endAt }];

  for (const occ of checkRanges) {
    const occStart = parseISO(occ.start_at);
    const occEnd = parseISO(occ.end_at);

    for (const appt of (appointments ?? []) as Appointment[]) {
      if (["cancelled", "expired"].includes(appt.status)) continue;
      if (
        rangesOverlap(
          occStart,
          occEnd,
          parseISO(appt.start_at),
          parseISO(appt.end_at)
        )
      ) {
        return NextResponse.json(
          { error: "This block overlaps an existing appointment." },
          { status: 400 }
        );
      }
    }

    if (layer === "override") {
      for (const other of others) {
        if ((other.layer || "override") !== "override") continue;
        if (
          rangesOverlap(
            occStart,
            occEnd,
            parseISO(other.start_at),
            parseISO(other.end_at)
          )
        ) {
          return NextResponse.json(
            { error: "This one-time block overlaps another one-time block." },
            { status: 400 }
          );
        }
      }
    } else {
      const windowStart = formatInTimeZone(startAt, CLINIC_TIMEZONE, "yyyy-MM-dd");
      const windowEnd = formatInTimeZone(
        checkRanges[checkRanges.length - 1]?.end_at ?? endAt,
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      for (const other of others) {
        if (other.layer !== "rule") continue;
        for (const otherOcc of expandRuleToOccurrences(
          other,
          windowStart,
          windowEnd
        )) {
          if (
            rangesOverlap(
              occStart,
              occEnd,
              parseISO(otherOcc.start_at),
              parseISO(otherOcc.end_at)
            )
          ) {
            return NextResponse.json(
              { error: "This recurring block overlaps another recurring block." },
              { status: 400 }
            );
          }
        }
      }
    }
  }

  void (body.scope as EditScope | undefined);

  const { data, error } = await auth.supabase
    .from("unavailable_blocks")
    .update(updates)
    .eq("id", block.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(auth.supabase, {
    entityType: "block",
    entityId: block.id,
    ...adminActor(auth.user.id),
    action: layer === "rule" ? "recurring_rule_updated" : "block_edited",
    source: "Admin Panel",
    metadata: {
      reason: (updates.reason as string) ?? block.reason,
      layer,
    },
  });

  return NextResponse.json({
    block: data as UnavailableBlock,
    blocks: [data as UnavailableBlock],
    updated: 1,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: existing } = await auth.supabase
    .from("unavailable_blocks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const existingBlock = existing as UnavailableBlock;

  await logActivity(auth.supabase, {
    entityType: "block",
    entityId: id,
    ...adminActor(auth.user.id),
    action:
      existingBlock.layer === "rule"
        ? "recurring_rule_deleted"
        : "block_deleted",
    source: "Admin Panel",
    metadata: {
      reason: existingBlock.reason,
      layer: existingBlock.layer ?? "override",
    },
  });

  const { error } = await auth.supabase
    .from("unavailable_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
