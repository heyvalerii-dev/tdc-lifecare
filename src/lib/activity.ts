import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, parseISO } from "date-fns";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { formatClinicDate, formatClinicTime, getClinicToday } from "@/lib/datetime";
import type {
  ActivityActorType,
  ActivityEntityType,
  EntityActivityWithActor,
} from "@/types/database";

/** How an action originated (separate from who performed it). */
export type ActivitySource =
  | "Manual Booking"
  | "Online Booking"
  | "Client Portal"
  | "Admin Panel"
  | "Recurring Availability Engine"
  | "PayMongo"
  | "System";

export type AppointmentActivityAction =
  | "appointment_created"
  | "appointment_booked_online"
  | "appointment_manual_booking"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_completed"
  | "appointment_no_show"
  | "psychologist_changed"
  | "service_changed"
  | "payment_method_changed"
  | "payment_confirmed"
  | "payment_refunded"
  | "checkout_created"
  | "payment_expired"
  | "staff_note_added"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted";

export type ClientActivityAction =
  | "client_created"
  | "profile_updated"
  | "assigned_psychologist_changed"
  | "status_changed"
  | "staff_note_added"
  | "photo_changed";

export type BlockActivityAction =
  | "block_created"
  | "block_edited"
  | "block_deleted"
  | "recurring_rule_created"
  | "recurring_rule_updated"
  | "recurring_rule_deleted"
  | "override_created";

export type ActivityAction =
  | AppointmentActivityAction
  | ClientActivityAction
  | BlockActivityAction
  | (string & {});

export interface LogActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  actorId?: string | null;
  actorType: ActivityActorType;
  action: ActivityAction;
  source?: ActivitySource | string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TimelineActivityItem {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  description: string;
  source: string | null;
  createdAt: string;
  actor: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    actorType: ActivityActorType;
  };
  /** Optional change lines for metadata display. */
  changes: { label?: string; from: string; to: string }[];
  metadata: Record<string, unknown>;
}

export interface TimelineActivityGroup {
  key: string;
  label: string;
  items: TimelineActivityItem[];
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  appointment_created: "Created appointment",
  appointment_booked_online: "Booked appointment online",
  appointment_manual_booking: "Created appointment manually",
  appointment_rescheduled: "Rescheduled appointment",
  appointment_cancelled: "Cancelled appointment",
  appointment_completed: "Marked appointment as Completed",
  appointment_no_show: "Marked appointment as No Show",
  psychologist_changed: "Changed psychologist",
  service_changed: "Changed service",
  payment_method_changed: "Changed payment method",
  payment_confirmed: "Confirmed payment",
  payment_refunded: "Refunded payment",
  checkout_created: "Started PayMongo checkout",
  payment_expired: "Payment hold expired",
  staff_note_added: "Added a staff note",
  comment_added: "Added a comment",
  comment_updated: "Updated a comment",
  comment_deleted: "Deleted a comment",
  client_created: "Created client",
  profile_updated: "Updated profile",
  assigned_psychologist_changed: "Changed assigned psychologist",
  status_changed: "Changed status",
  photo_changed: "Changed profile photo",
  block_created: "Created block",
  block_edited: "Edited block",
  block_deleted: "Deleted block",
  recurring_rule_created: "Created recurring block",
  recurring_rule_updated: "Updated recurring block",
  recurring_rule_deleted: "Deleted recurring block",
  override_created: "Created one-time override",
};

export function activityDescription(
  action: string,
  metadata?: Record<string, unknown> | null
): string {
  if (typeof metadata?.description === "string" && metadata.description.trim()) {
    return metadata.description.trim();
  }
  return ACTION_DESCRIPTIONS[action] ?? action.replace(/_/g, " ");
}

function asRecord(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

export function extractActivityChanges(
  metadata: Record<string, unknown> | null | undefined
): { label?: string; from: string; to: string }[] {
  const meta = metadata ?? {};
  const changes: { label?: string; from: string; to: string }[] = [];

  const pairs: { fromKey: string; toKey: string; label?: string }[] = [
    { fromKey: "oldPsychologist", toKey: "newPsychologist", label: "Psychologist" },
    { fromKey: "oldService", toKey: "newService", label: "Service" },
    { fromKey: "oldTime", toKey: "newTime", label: "Time" },
    { fromKey: "oldDate", toKey: "newDate", label: "Date" },
    { fromKey: "oldPaymentMethod", toKey: "newPaymentMethod", label: "Payment" },
    { fromKey: "oldStatus", toKey: "newStatus", label: "Status" },
    { fromKey: "oldValue", toKey: "newValue" },
    { fromKey: "from", toKey: "to" },
  ];

  for (const pair of pairs) {
    const from = str(meta[pair.fromKey]);
    const to = str(meta[pair.toKey]);
    if (from || to) {
      changes.push({
        label: pair.label,
        from: from ?? "—",
        to: to ?? "—",
      });
    }
  }

  if (
    changes.length === 0 &&
    typeof meta.detail === "string" &&
    meta.detail.includes("→")
  ) {
    const [from, to] = meta.detail.split("→").map((s) => s.trim());
    if (from && to) changes.push({ from, to });
  }

  return changes;
}

export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<void> {
  const row = {
    entity_type: input.entityType,
    entity_id: input.entityId,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType,
    action: input.action,
    source: input.source ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await supabase.from("entity_activity").insert(row);
  if (error && process.env.NODE_ENV === "development") {
    console.error("[entity_activity] insert failed:", error);
  }
}

export async function logActivities(
  supabase: SupabaseClient,
  inputs: LogActivityInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  const rows = inputs.map((input) => ({
    entity_type: input.entityType,
    entity_id: input.entityId,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType,
    action: input.action,
    source: input.source ?? null,
    metadata: input.metadata ?? {},
  }));
  const { error } = await supabase.from("entity_activity").insert(rows);
  if (error && process.env.NODE_ENV === "development") {
    console.error("[entity_activity] bulk insert failed:", error);
  }
}

export async function fetchEntityActivity(
  supabase: SupabaseClient,
  entityType: ActivityEntityType,
  entityId: string,
  limit = 100
): Promise<EntityActivityWithActor[]> {
  const { data, error } = await supabase
    .from("entity_activity")
    .select(
      `
      *,
      actor:profiles!actor_id(
        id,
        full_name,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EntityActivityWithActor[];
}

function actorDisplayName(
  row: EntityActivityWithActor
): string {
  if (row.actor_type === "system") return "System";
  if (row.actor_type === "client" && !row.actor) return "Client";
  const profile = row.actor;
  if (!profile) {
    if (row.actor_type === "admin") return "Admin";
    if (row.actor_type === "psychologist") return "Psychologist";
    return "Someone";
  }
  return (
    profile.full_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    profile.email ||
    "Someone"
  );
}

export function toTimelineActivityItem(
  row: EntityActivityWithActor
): TimelineActivityItem {
  const metadata = asRecord(row.metadata);
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    description: activityDescription(row.action, metadata),
    source: row.source,
    createdAt: row.created_at,
    actor: {
      id: row.actor_id,
      name: actorDisplayName(row),
      avatarUrl: row.actor?.avatar_url ?? null,
      actorType: row.actor_type,
    },
    changes: extractActivityChanges(metadata),
    metadata,
  };
}

function groupLabelForDate(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  const yesterday = formatInTimeZone(
    addDays(parseISO(`${today}T12:00:00`), -1),
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );
  if (dateStr === yesterday) return "Yesterday";
  return formatClinicDate(`${dateStr}T12:00:00`);
}

/** Newest-first groups by clinic calendar date. */
export function groupTimelineActivity(
  items: TimelineActivityItem[]
): TimelineActivityGroup[] {
  const today = getClinicToday();
  const map = new Map<string, TimelineActivityItem[]>();

  for (const item of items) {
    const dateStr = formatInTimeZone(
      item.createdAt,
      CLINIC_TIMEZONE,
      "yyyy-MM-dd"
    );
    const list = map.get(dateStr) ?? [];
    list.push(item);
    map.set(dateStr, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupItems]) => ({
      key,
      label: groupLabelForDate(key, today),
      items: groupItems,
    }));
}

export function formatActivityTime(iso: string): string {
  return formatClinicTime(iso);
}

/** Narrow helper for FK-safe actor when the admin user is known. */
export function adminActor(
  userId: string
): Pick<LogActivityInput, "actorId" | "actorType"> {
  return { actorId: userId, actorType: "admin" };
}

export function systemActor(): Pick<LogActivityInput, "actorId" | "actorType"> {
  return { actorId: null, actorType: "system" };
}
