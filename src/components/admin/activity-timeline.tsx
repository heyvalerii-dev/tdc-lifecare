"use client";

import { useMemo } from "react";
import { ArrowDown } from "lucide-react";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailMutedClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { Avatar } from "@/components/ui/avatar";
import {
  formatActivityTime,
  groupTimelineActivity,
  type TimelineActivityItem,
} from "@/lib/activity";
import { cn } from "@/lib/utils";

export interface ActivityTimelineProps {
  items: TimelineActivityItem[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Compact mode for drawers (no detail card chrome). */
  variant?: "card" | "plain";
  loading?: boolean;
  className?: string;
}

function ActivityChange({
  change,
}: {
  change: { label?: string; from: string; to: string };
}) {
  return (
    <div className="mt-1.5 space-y-0.5 text-xs leading-snug text-[var(--brand-text-muted)]">
      {change.label ? (
        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/70">
          {change.label}
        </p>
      ) : null}
      <p className="text-[var(--brand-text)]/80">{change.from}</p>
      <p className="flex items-center gap-1 text-[var(--brand-text-muted)]/70">
        <ArrowDown className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">changed to</span>
      </p>
      <p className="text-[var(--brand-text)]/80">{change.to}</p>
    </div>
  );
}

function ActivityEvent({ item }: { item: TimelineActivityItem }) {
  return (
    <div className="flex gap-3">
      <Avatar
        name={item.actor.name}
        src={item.actor.avatarUrl}
        size="xs"
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--brand-text)]">
          {item.actor.name}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-[var(--brand-text)]">
          {item.description}
        </p>
        {item.changes.map((change, index) => (
          <ActivityChange
            key={`${item.id}-change-${index}`}
            change={change}
          />
        ))}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <time
            dateTime={item.createdAt}
            className="text-xs text-[var(--brand-text-muted)]"
          >
            {formatActivityTime(item.createdAt)}
          </time>
          {item.source ? (
            <>
              <span className="text-[var(--brand-text-muted)]/40" aria-hidden>
                ·
              </span>
              <span className="text-xs text-[var(--brand-text-muted)]/80">
                {item.source}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({
  items,
  title = "Activity",
  emptyTitle = "No activity yet",
  emptyDescription = "Meaningful updates will appear here.",
  variant = "card",
  loading = false,
  className,
}: ActivityTimelineProps) {
  const groups = useMemo(() => groupTimelineActivity(items), [items]);

  const body = (
    <div className={cn(variant === "card" ? detailCardBodyClass : null, "space-y-5")}>
      {loading ? (
        <p className={detailMutedClass}>Loading activity…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--brand-purple)]/15 bg-[var(--brand-purple-light)]/15 px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--brand-text)]">
            {emptyTitle}
          </p>
          <p className={cn(detailMutedClass, "mt-1")}>{emptyDescription}</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--brand-purple)]/45"
                aria-hidden
              />
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--brand-text-muted)]">
                {group.label}
              </h3>
            </div>
            <ul className="space-y-0">
              {group.items.map((item, index) => (
                <li key={item.id}>
                  {index > 0 ? (
                    <div
                      className="my-3 border-t border-[var(--brand-purple)]/[0.08]"
                      aria-hidden
                    />
                  ) : null}
                  <ActivityEvent item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );

  if (variant === "plain") {
    return (
      <section className={cn("space-y-3", className)}>
        <h3 className={detailSectionTitleClass}>{title}</h3>
        {body}
      </section>
    );
  }

  return (
    <section className={cn(detailCardClass, className)}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>{title}</h2>
      </div>
      {body}
    </section>
  );
}
