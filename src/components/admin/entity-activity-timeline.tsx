"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import {
  toTimelineActivityItem,
  type TimelineActivityItem,
} from "@/lib/activity";
import type { ActivityEntityType, EntityActivityWithActor } from "@/types/database";

export interface EntityActivityTimelineProps {
  entityType: ActivityEntityType;
  entityId: string | null | undefined;
  variant?: "card" | "plain";
  title?: string;
  className?: string;
  /** Bump to refetch after a save. */
  refreshKey?: number | string;
}

export function EntityActivityTimeline({
  entityType,
  entityId,
  variant = "card",
  title = "Activity",
  className,
  refreshKey = 0,
}: EntityActivityTimelineProps) {
  const [items, setItems] = useState<TimelineActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/activity?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn't load activity"
        );
      }
      const rows = (data.activity ?? []) as EntityActivityWithActor[];
      setItems(rows.map(toTimelineActivityItem));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (!entityId) return null;

  return (
    <ActivityTimeline
      items={items}
      loading={loading}
      variant={variant}
      title={title}
      className={className}
    />
  );
}
