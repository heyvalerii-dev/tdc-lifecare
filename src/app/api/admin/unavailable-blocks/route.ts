import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  UnavailableReason,
} from "@/types/database";

const REASON_VALUES = new Set([
  "lunch_break",
  "meeting",
  "holiday",
  "vacation",
  "training",
  "administrative",
  "personal",
  "other",
  "emergency",
  "leave",
  "clinic_closed",
]);

function parseRecurrence(body: Record<string, unknown>): BlockRecurrenceInput {
  const type = (body.recurrence_type as BlockRecurrenceType) || "none";
  const endType =
    (body.recurrence_end_type as BlockRecurrenceEndType) || "never";
  const days = Array.isArray(body.recurrence_days)
    ? (body.recurrence_days as number[]).filter((d) => d >= 0 && d <= 6)
    : [];
  const interval = Math.max(1, Number(body.recurrence_interval) || 1);
  const endDate =
    typeof body.recurrence_end_date === "string" && body.recurrence_end_date
      ? body.recurrence_end_date
      : null;
  const count =
    body.recurrence_count != null &&
    Number.isFinite(Number(body.recurrence_count))
      ? Math.max(1, Number(body.recurrence_count))
      : null;

  return { type, interval, days, endType, endDate, count };
}

/**
 * Conflicts:
 * - appointments always conflict
 * - overrides conflict with other overrides
 * - rules conflict with other rules
 * - overrides do NOT conflict with rules (they suppress them)
 */
async function findConflicts(
  supabase: SupabaseClient,
  psychologistId: string,
  layer: BlockLayer,
  occurrences: { start_at: string; end_at: string }[],
  excludeIds: string[] = []
): Promise<string | null> {
  if (occurrences.length === 0) return null;

  const rangeStart = occurrences.reduce(
    (min, o) => (o.start_at < min ? o.start_at : min),
    occurrences[0].start_at
  );
  const rangeEnd = occurrences.reduce(
    (max, o) => (o.end_at > max ? o.end_at : max),
    occurrences[0].end_at
  );

  const [{ data: blocks }, { data: appointments }] = await Promise.all([
    supabase
      .from("unavailable_blocks")
      .select("*")
      .eq("psychologist_id", psychologistId),
    supabase
      .from("appointments")
      .select(SCHEDULING_APPOINTMENT_SELECT)
      .eq("psychologist_id", psychologistId)
      .lt("start_at", rangeEnd)
      .gt("end_at", rangeStart),
  ]);

  const exclude = new Set(excludeIds);
  const allBlocks = ((blocks ?? []) as UnavailableBlock[]).filter(
    (b) => !exclude.has(b.id)
  );

  for (const occ of occurrences) {
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
        return "This block overlaps an existing appointment.";
      }
    }

    if (layer === "override") {
      for (const other of allBlocks) {
        if ((other.layer || "override") !== "override") continue;
        if (
          rangesOverlap(
            occStart,
            occEnd,
            parseISO(other.start_at),
            parseISO(other.end_at)
          )
        ) {
          return "This override overlaps another calendar override.";
        }
      }
    } else {
      // Rule vs other rules (expand other rules into the window)
      const windowStart = formatInTimeZone(
        rangeStart,
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      const windowEnd = formatInTimeZone(
        rangeEnd,
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );

      for (const other of allBlocks) {
        if (other.layer !== "rule") continue;
        const otherOccs = expandRuleToOccurrences(other, windowStart, windowEnd);
        for (const otherOcc of otherOccs) {
          if (
            rangesOverlap(
              occStart,
              occEnd,
              parseISO(otherOcc.start_at),
              parseISO(otherOcc.end_at)
            )
          ) {
            return "This rule overlaps another recurring rule.";
          }
        }
      }
    }
  }

  return null;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const psychologistId = searchParams.get("psychologist_id");

  let query = auth.supabase
    .from("unavailable_blocks")
    .select("*")
    .order("start_at", { ascending: true });

  if (psychologistId) query = query.eq("psychologist_id", psychologistId);
  if (from) query = query.gte("start_at", from);
  if (to) query = query.lte("start_at", to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: (data ?? []) as UnavailableBlock[] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const psychologistId =
    typeof body.psychologist_id === "string" ? body.psychologist_id : "";
  const startDate =
    typeof body.start_date === "string"
      ? body.start_date
      : typeof body.date === "string"
        ? body.date
        : "";
  const endDate =
    typeof body.end_date === "string" ? body.end_date : startDate;
  const allDay = body.all_day === true;
  const startTime =
    typeof body.start_time === "string" ? body.start_time : "";
  const endTime = typeof body.end_time === "string" ? body.end_time : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;
  const suppressesRuleId =
    typeof body.suppresses_rule_id === "string" && body.suppresses_rule_id
      ? body.suppresses_rule_id
      : null;

  const explicitLayer =
    body.layer === "rule" || body.layer === "override"
      ? (body.layer as BlockLayer)
      : body.mode === "recurring"
        ? ("rule" as BlockLayer)
        : body.mode === "one_time"
          ? ("override" as BlockLayer)
          : null;

  if (!psychologistId) {
    return NextResponse.json(
      { error: "Psychologist is required" },
      { status: 400 }
    );
  }
  if (!REASON_VALUES.has(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  if (reason === "other" && !title) {
    return NextResponse.json(
      { error: "Block title is required when reason is Other" },
      { status: 400 }
    );
  }

  let recurrence = parseRecurrence(body);
  const layer = explicitLayer ?? inferLayer(recurrence.type);

  // Normalize: rules never use "none"; overrides always use "none"
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

  let startAt: string;
  let endAt: string;
  let conflictOccurrences: { start_at: string; end_at: string }[];

  if (layer === "override") {
    if (!startDate) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }
    const resolvedEndDate = endDate || startDate;

    if (allDay) {
      startAt = clinicDateToUtc(startDate, "00:00").toISOString();
      // Exclusive end: start of day after end date
      const [y, m, d] = resolvedEndDate.split("-").map(Number);
      const next = new Date(y, m - 1, d + 1);
      const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      endAt = clinicDateToUtc(nextStr, "00:00").toISOString();
    } else {
      if (!startTime || !endTime) {
        return NextResponse.json(
          { error: "Start and end time are required when not all-day" },
          { status: 400 }
        );
      }
      startAt = clinicDateToUtc(startDate, startTime).toISOString();
      endAt = clinicDateToUtc(resolvedEndDate, endTime).toISOString();
    }

    if (parseISO(startAt) >= parseISO(endAt)) {
      return NextResponse.json(
        { error: "End must be after start" },
        { status: 400 }
      );
    }
    conflictOccurrences = [{ start_at: startAt, end_at: endAt }];
  } else {
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Start and end time are required" },
        { status: 400 }
      );
    }
    const anchor = startDate || formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
    const first = expandBlockOccurrences({
      date: anchor,
      startTime,
      endTime,
      recurrence,
    })[0];
    if (!first) {
      return NextResponse.json(
        { error: "Could not build recurring rule" },
        { status: 400 }
      );
    }
    startAt = first.start_at;
    endAt = first.end_at;
    conflictOccurrences = expandBlockOccurrences({
      date: anchor,
      startTime,
      endTime,
      recurrence,
    }).slice(0, 60);
  }

  const conflict = await findConflicts(
    auth.supabase,
    psychologistId,
    layer,
    conflictOccurrences
  );
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 400 });
  }

  const row = {
    psychologist_id: psychologistId,
    start_at: startAt,
    end_at: endAt,
    reason: reason as UnavailableReason,
    title,
    notes,
    layer,
    all_day: layer === "override" ? allDay : false,
    suppresses_rule_id: layer === "override" ? suppressesRuleId : null,
    series_id: layer === "rule" ? randomUUID() : null,
    recurrence_type: recurrence.type,
    recurrence_interval: recurrence.interval,
    recurrence_days: recurrence.days,
    recurrence_end_type: recurrence.endType,
    recurrence_end_date: recurrence.endDate,
    recurrence_count: recurrence.count,
    created_by: auth.user.id,
    updated_by: auth.user.id,
  };

  const { data, error } = await auth.supabase
    .from("unavailable_blocks")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const block = data as UnavailableBlock;
  const isOverrideFromRule = Boolean(suppressesRuleId);
  await logActivity(auth.supabase, {
    entityType: "block",
    entityId: block.id,
    ...adminActor(auth.user.id),
    action:
      layer === "rule"
        ? "recurring_rule_created"
        : isOverrideFromRule
          ? "override_created"
          : "block_created",
    source: "Admin Panel",
    metadata: {
      reason,
      layer,
      allDay: layer === "override" ? allDay : false,
    },
  });

  return NextResponse.json({
    block,
    blocks: [block],
    count: 1,
  });
}
