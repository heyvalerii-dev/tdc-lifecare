"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { AdminEditableCardHeader } from "@/components/admin/admin-editable-card-header";
import { AdminCardAddButton } from "@/components/admin/admin-card-add-button";
import { useCalendarDrawer } from "@/components/admin/manual-booking/manual-booking-context";
import { TimeSlotSelect } from "@/components/admin/time-slot-select";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import { Checkbox } from "@/components/ui/checkbox";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailLabelClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { adminControlInputClass, adminPrimaryButtonClass } from "@/lib/admin-controls";
import { DAY_NAMES, UNAVAILABLE_REASON_ICONS } from "@/lib/constants";
import { psychologistAdminPath } from "@/lib/psychologist-slugs";
import { formatAvailabilityTime } from "@/lib/admin-psychologists-list";
import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  getClinicToday,
} from "@/lib/datetime";
import {
  formatUnavailableBlockSchedule,
  getUpcomingUnavailableOverrides,
  unavailableBlockTitle,
} from "@/lib/unavailable-blocks-display";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Service,
  UnavailableBlock,
} from "@/types/database";

export const PSYCHOLOGIST_DETAIL_PREVIEW_COUNT = 5;

export interface PsychologistTimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  detail?: string;
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function dayShortName(day: number): string {
  return DAY_NAMES_SHORT[day] ?? DAY_NAMES[day]?.slice(0, 3) ?? "";
}

function availabilityDaySummary(
  enabled: boolean,
  start_time: string,
  end_time: string
): string {
  if (!enabled) return "Closed";
  return `${formatAvailabilityTime(start_time)} – ${formatAvailabilityTime(end_time)}`;
}

const rowHoverClass =
  "group -mx-2 rounded-xl px-2 transition-colors duration-150 ease-out hover:bg-[var(--brand-purple-light)]/35";

const rowInteractiveClass = cn(
  rowHoverClass,
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-2"
);

/** Mobile-first card chrome for psychologist profile sections. */
const psychCardHeaderClass = "px-4 py-3.5 sm:px-6 sm:py-4";
const psychCardBodyClass = "p-4 sm:p-6";
const psychCardBodyStackClass = cn(
  detailCardBodyClass,
  psychCardBodyClass,
  "space-y-3.5 sm:space-y-4"
);

function ViewAllToggle({
  expanded,
  remaining,
  onToggle,
}: {
  expanded: boolean;
  remaining: number;
  onToggle: () => void;
}) {
  if (remaining <= 0 && !expanded) return null;

  return (
    <div className="border-t border-[var(--brand-purple)]/[0.06] pt-3.5 sm:pt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[var(--brand-purple)]",
          "transition-colors duration-150 ease-out hover:text-[var(--brand-purple-dark)]"
        )}
      >
        View all
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200 ease-out",
            expanded && "rotate-180"
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </div>
  );
}

function NavArrow() {
  return (
    <ArrowRight
      className="h-4 w-4 shrink-0 text-[var(--brand-text-muted)]/45 transition-colors duration-150 group-hover:text-[var(--brand-purple)]"
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

async function parseApiError(
  res: Response,
  fallback: string,
  context: string
): Promise<never> {
  const data = await res.json().catch(() => ({}));
  const message =
    typeof data.error === "string" ? data.error : `${fallback} (${res.status})`;

  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}] Request failed:`, res.status, data);
  }

  throw new Error(message);
}

export function UpcomingAppointmentsCard({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? appointments
    : appointments.slice(0, PSYCHOLOGIST_DETAIL_PREVIEW_COUNT);
  const remaining = Math.max(
    0,
    appointments.length - PSYCHOLOGIST_DETAIL_PREVIEW_COUNT
  );

  return (
    <section className={detailCardClass}>
      <div className={cn(detailCardHeaderClass, psychCardHeaderClass)}>
        <h2 className={detailSectionTitleClass}>Upcoming Appointments</h2>
      </div>
      <div className={psychCardBodyStackClass}>
        {appointments.length === 0 ? (
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple-light)]/35 sm:h-10 sm:w-10">
              <CalendarDays
                className="h-4 w-4 text-[var(--brand-purple)]/70 sm:h-5 sm:w-5"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <p className={cn(detailValueClass, "font-medium")}>
                No upcoming appointments
              </p>
              <p className={cn(detailMutedClass, "leading-relaxed")}>
                Confirmed and pending sessions will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((appointment) => {
                const clientName =
                  appointment.client?.full_name?.trim() ||
                  appointment.client?.email ||
                  "Client";

                return (
                  <li key={appointment.id}>
                    <Link
                      href={`/admin/appointments/${appointment.id}`}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-3.5",
                        rowHoverClass
                      )}
                    >
                      <div className="min-w-0 space-y-1 sm:space-y-1.5">
                        <p className={cn(detailValueClass, "font-medium")}>
                          {clientName}
                        </p>
                        <p className={cn(detailMutedClass, "leading-snug")}>
                          {formatClinicDateTime(appointment.start_at)}
                        </p>
                        <p className="text-[13px] leading-snug text-[var(--brand-text-muted)] sm:text-sm">
                          {appointment.service?.name ?? "Appointment"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
                        <AdminAppointmentStatusPill status={appointment.status} />
                        <NavArrow />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ViewAllToggle
              expanded={expanded}
              remaining={remaining}
              onToggle={() => setExpanded((v) => !v)}
            />
          </>
        )}
      </div>
    </section>
  );
}

export function PsychologistTimelineCard({
  events,
}: {
  events: PsychologistTimelineEvent[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? events
    : events.slice(0, PSYCHOLOGIST_DETAIL_PREVIEW_COUNT);
  const remaining = Math.max(0, events.length - PSYCHOLOGIST_DETAIL_PREVIEW_COUNT);

  return (
    <section className={detailCardClass}>
      <div className={cn(detailCardHeaderClass, psychCardHeaderClass)}>
        <h2 className={detailSectionTitleClass}>Timeline</h2>
      </div>
      <div className={psychCardBodyStackClass}>
        {events.length === 0 ? (
          <p className={detailMutedClass}>No activity yet.</p>
        ) : (
          <>
            <ol className="space-y-0">
              {visible.map((event, index) => (
                <li key={event.id} className="flex gap-2.5 sm:gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--brand-purple)]/35 sm:size-2.5" />
                    {index < visible.length - 1 && (
                      <span
                        className="my-1.5 min-h-5 w-px flex-1 bg-[var(--brand-purple)]/[0.08] sm:min-h-6"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      "min-w-0 flex-1",
                      index < visible.length - 1 ? "pb-4 sm:pb-5" : "pb-0.5"
                    )}
                  >
                    <p className="text-sm font-medium leading-snug text-[var(--brand-text)]">
                      {event.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--brand-text-muted)] sm:text-xs">
                      {formatClinicDate(event.timestamp, "MMM d, yyyy")} •{" "}
                      {formatClinicTime(event.timestamp)}
                    </p>
                    {event.detail && (
                      <p className="mt-1 text-[11px] leading-snug text-[var(--brand-text-muted)] sm:text-xs">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <ViewAllToggle
              expanded={expanded}
              remaining={remaining}
              onToggle={() => setExpanded((v) => !v)}
            />
          </>
        )}
      </div>
    </section>
  );
}

type DayDraft = {
  enabled: boolean;
  start_time: string;
  end_time: string;
};

type AvailabilityFormValues = {
  days: Record<string, DayDraft>;
};

function blocksToFormValues(blocks: AvailabilityBlock[]): AvailabilityFormValues {
  const days: Record<string, DayDraft> = {};
  for (const day of WEEK_ORDER) {
    const block = blocks.find((b) => b.day_of_week === day && b.is_active);
    days[String(day)] = block
      ? {
          enabled: true,
          start_time: block.start_time.slice(0, 5),
          end_time: block.end_time.slice(0, 5),
        }
      : { enabled: false, start_time: "09:00", end_time: "17:00" };
  }
  return { days };
}

function availabilityEquals(
  a: AvailabilityFormValues,
  b: AvailabilityFormValues
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function AvailabilityCard({
  psychologistId,
  blocks,
}: {
  psychologistId: string;
  blocks: AvailabilityBlock[];
}) {
  const [editing, setEditing] = useState(false);

  const initialValues = useMemo(
    () => blocksToFormValues(blocks),
    [blocks]
  );

  const saveAvailability = useCallback(
    async (values: AvailabilityFormValues) => {
      const payload = WEEK_ORDER.filter(
        (day) => values.days[String(day)]?.enabled
      ).map((day) => {
        const dayValue = values.days[String(day)]!;
        return {
          day_of_week: day,
          start_time: dayValue.start_time,
          end_time: dayValue.end_time,
          is_active: true,
        };
      });

      const res = await fetch(
        `/api/admin/psychologists/${psychologistId}/availability`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: payload }),
        }
      );

      if (!res.ok) {
        await parseApiError(res, "Couldn't save availability", "saveAvailability");
      }
    },
    [psychologistId]
  );

  const { values, setValues, status, flush } = useAdminAutosave({
    initialValues,
    enabled: editing,
    onSave: saveAvailability,
    equals: availabilityEquals,
  });

  async function closeEditing() {
    await flush();
    setEditing(false);
  }

  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (editing) {
      setExpandedDays(
        new Set(WEEK_ORDER.filter((day) => values.days[String(day)]?.enabled))
      );
    } else {
      setExpandedDays(new Set());
    }
  }, [editing]);

  function toggleDayExpanded(day: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function setDayEnabled(day: number, enabled: boolean) {
    const dayKey = String(day);
    setValues((prev) => ({
      days: {
        ...prev.days,
        [dayKey]: { ...prev.days[dayKey]!, enabled },
      },
    }));
    if (enabled) {
      setExpandedDays((prev) => new Set(prev).add(day));
    }
  }

  return (
    <section className={detailCardClass}>
      <AdminEditableCardHeader
        title="Availability"
        editing={editing}
        status={status}
        onEdit={() => setEditing(true)}
        onClose={closeEditing}
        editLabel="Edit availability"
        closeLabel="Close availability editor"
        className={psychCardHeaderClass}
      />
      <div className={psychCardBodyStackClass}>
        {/* Mobile — read mode */}
        {!editing && (
          <ul className="space-y-0.5 md:hidden">
            {WEEK_ORDER.map((day) => {
              const block = blocks.find(
                (b) => b.day_of_week === day && b.is_active
              );
              return (
                <li
                  key={day}
                  className="grid grid-cols-[2.75rem_1fr] items-baseline gap-x-3 py-1.5"
                >
                  <span
                    className={cn(
                      detailValueClass,
                      "font-medium",
                      !block && detailMutedClass
                    )}
                  >
                    {dayShortName(day)}
                  </span>
                  {block ? (
                    <span
                      className={cn(detailValueClass, "tabular-nums tracking-tight")}
                    >
                      {formatAvailabilityTime(block.start_time)} –{" "}
                      {formatAvailabilityTime(block.end_time)}
                    </span>
                  ) : (
                    <span className={detailMutedClass}>Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Mobile — edit mode (collapsible day sections) */}
        {editing && (
          <div className="space-y-2 md:hidden">
            {WEEK_ORDER.map((day) => {
              const dayKey = String(day);
              const dayDraft = values.days[dayKey]!;
              const expanded = expandedDays.has(day);

              return (
                <div
                  key={day}
                  className="overflow-hidden rounded-xl border border-[var(--brand-purple)]/[0.08] bg-[var(--brand-cream)]/30"
                >
                  <button
                    type="button"
                    onClick={() => toggleDayExpanded(day)}
                    aria-expanded={expanded}
                    className={cn(
                      "flex w-full min-h-11 items-center justify-between gap-3 px-3 py-2.5 text-left",
                      "transition-colors duration-150 hover:bg-[var(--brand-purple-light)]/25",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-inset"
                    )}
                  >
                    <span className={cn(detailValueClass, "shrink-0 font-medium")}>
                      {DAY_NAMES[day]}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm tabular-nums",
                          dayDraft.enabled
                            ? "text-[var(--brand-text-muted)]"
                            : detailMutedClass
                        )}
                      >
                        {availabilityDaySummary(
                          dayDraft.enabled,
                          dayDraft.start_time,
                          dayDraft.end_time
                        )}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-[var(--brand-text-muted)] transition-transform duration-200",
                          expanded && "rotate-180"
                        )}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </span>
                  </button>

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-out",
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-3 border-t border-[var(--brand-purple)]/[0.06] px-3 py-3">
                        <Checkbox
                          checked={dayDraft.enabled}
                          onChange={(checked) => setDayEnabled(day, checked)}
                          label="Enabled"
                          ariaLabel={`${DAY_NAMES[day]} available`}
                        />
                        {dayDraft.enabled ? (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <p className={detailLabelClass}>Start time</p>
                              <TimeSlotSelect
                                value={dayDraft.start_time}
                                onChange={(start_time) =>
                                  setValues((prev) => ({
                                    days: {
                                      ...prev.days,
                                      [dayKey]: {
                                        ...prev.days[dayKey]!,
                                        start_time,
                                      },
                                    },
                                  }))
                                }
                                ariaLabel={`${DAY_NAMES[day]} start time`}
                                className="w-full min-w-0"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <p className={detailLabelClass}>End time</p>
                              <TimeSlotSelect
                                value={dayDraft.end_time}
                                onChange={(end_time) =>
                                  setValues((prev) => ({
                                    days: {
                                      ...prev.days,
                                      [dayKey]: {
                                        ...prev.days[dayKey]!,
                                        end_time,
                                      },
                                    },
                                  }))
                                }
                                ariaLabel={`${DAY_NAMES[day]} end time`}
                                className="w-full min-w-0"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop — unchanged table layout */}
        <ul className="hidden space-y-1 md:block">
          {WEEK_ORDER.map((day) => {
            const dayKey = String(day);
            const dayDraft = values.days[dayKey]!;
            const block = blocks.find(
              (b) => b.day_of_week === day && b.is_active
            );

            return (
              <li
                key={day}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-1 py-2",
                  editing && "hover:bg-[var(--brand-purple-light)]/20"
                )}
              >
                <div className="flex w-[8.5rem] shrink-0 items-center gap-2.5 sm:w-36">
                  {editing ? (
                    <Checkbox
                      checked={dayDraft.enabled}
                      onChange={(checked) =>
                        setValues((prev) => ({
                          days: {
                            ...prev.days,
                            [dayKey]: { ...prev.days[dayKey]!, enabled: checked },
                          },
                        }))
                      }
                      ariaLabel={`${DAY_NAMES[day]} available`}
                    />
                  ) : (
                    <Checkbox
                      checked={Boolean(block)}
                      onChange={() => undefined}
                      disabled
                      ariaLabel={`${DAY_NAMES[day]} available`}
                      className="pointer-events-none"
                    />
                  )}
                  <p
                    className={cn(
                      detailValueClass,
                      "min-w-0 font-medium",
                      !block && !editing && "text-[var(--brand-text-muted)]"
                    )}
                  >
                    {DAY_NAMES[day]}
                  </p>
                </div>

                {editing ? (
                  dayDraft.enabled ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <TimeSlotSelect
                        value={dayDraft.start_time}
                        onChange={(start_time) =>
                          setValues((prev) => ({
                            days: {
                              ...prev.days,
                              [dayKey]: { ...prev.days[dayKey]!, start_time },
                            },
                          }))
                        }
                        ariaLabel={`${DAY_NAMES[day]} start time`}
                      />
                      <span className="text-sm text-[var(--brand-text-muted)]">
                        —
                      </span>
                      <TimeSlotSelect
                        value={dayDraft.end_time}
                        onChange={(end_time) =>
                          setValues((prev) => ({
                            days: {
                              ...prev.days,
                              [dayKey]: { ...prev.days[dayKey]!, end_time },
                            },
                          }))
                        }
                        ariaLabel={`${DAY_NAMES[day]} end time`}
                      />
                    </div>
                  ) : null
                ) : block ? (
                  <p className={cn(detailMutedClass, "min-w-0 flex-1")}>
                    {formatAvailabilityTime(block.start_time)} —{" "}
                    {formatAvailabilityTime(block.end_time)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function UnavailableBlocksCard({
  psychologistId,
  psychologistSlug,
  psychologistName,
  blocks,
}: {
  psychologistId: string;
  psychologistSlug: string;
  psychologistName: string;
  blocks: UnavailableBlock[];
}) {
  const { openBlockTime } = useCalendarDrawer();

  const upcoming = useMemo(
    () => getUpcomingUnavailableOverrides(blocks),
    [blocks]
  );
  const preview = upcoming.slice(0, PSYCHOLOGIST_DETAIL_PREVIEW_COUNT);
  const hasMore = upcoming.length > PSYCHOLOGIST_DETAIL_PREVIEW_COUNT;

  function openAddBlock() {
    openBlockTime({
      mode: "one_time",
      slot: {
        psychologistId,
        psychologistName,
        selectedDate: getClinicToday(),
        selectedStartTime: "09:00",
        selectedEndTime: "17:00",
      },
    });
  }

  function openEditBlock(block: UnavailableBlock) {
    openBlockTime({ block });
  }

  return (
    <section className={detailCardClass}>
      <div
        className={cn(
          detailCardHeaderClass,
          psychCardHeaderClass,
          "flex items-center justify-between gap-3"
        )}
      >
        <h2 className={detailSectionTitleClass}>Unavailable Blocks</h2>
        <AdminCardAddButton onClick={openAddBlock} label="Add block" />
      </div>
      <div className={psychCardBodyStackClass}>
        {upcoming.length === 0 ? (
          <div className="space-y-3.5 sm:space-y-4">
            <p className={detailMutedClass}>No upcoming unavailable blocks.</p>
            <button
              type="button"
              onClick={openAddBlock}
              className={cn(
                adminPrimaryButtonClass,
                "w-full px-4 py-2.5 text-sm sm:w-auto sm:py-2"
              )}
            >
              Add Block
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {preview.map((block) => {
                const icon =
                  UNAVAILABLE_REASON_ICONS[block.reason] ?? "🔒";
                const title = unavailableBlockTitle(block);
                const schedule = formatUnavailableBlockSchedule(block);

                return (
                  <li key={block.id}>
                    <button
                      type="button"
                      onClick={() => openEditBlock(block)}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-2.5 py-3 text-left sm:gap-3 sm:py-3.5",
                        rowInteractiveClass
                      )}
                    >
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple-light)]/35 text-base leading-none sm:h-9 sm:w-9 sm:text-lg"
                        aria-hidden
                      >
                        {icon}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                        <p className={cn(detailValueClass, "font-medium")}>
                          {title}
                        </p>
                        <p className={cn(detailMutedClass, "leading-snug")}>
                          {schedule}
                        </p>
                      </div>
                      <NavArrow />
                    </button>
                  </li>
                );
              })}
            </ul>
            {hasMore ? (
              <div className="border-t border-[var(--brand-purple)]/[0.06] pt-3.5 sm:pt-4">
                <Link
                  href={psychologistAdminPath(
                    psychologistSlug,
                    "/unavailable-blocks"
                  )}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[var(--brand-purple)]",
                    "transition-colors duration-150 ease-out hover:text-[var(--brand-purple-dark)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-2 rounded-md"
                  )}
                >
                  View All
                  <ArrowRight
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

type ServiceRowValue = {
  enabled: boolean;
  buffer_minutes: number;
};

type ServicesFormValues = {
  services: Record<string, ServiceRowValue>;
};

function toServicesFormValues(
  allServices: Service[],
  enabledServiceIds: string[]
): ServicesFormValues {
  return {
    services: Object.fromEntries(
      allServices.map((service) => [
        service.id,
        {
          enabled: enabledServiceIds.includes(service.id),
          buffer_minutes: service.buffer_minutes,
        },
      ])
    ),
  };
}

function servicesEquals(a: ServicesFormValues, b: ServicesFormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ServicesCard({
  psychologistId,
  allServices,
  enabledServiceIds,
}: {
  psychologistId: string;
  allServices: Service[];
  enabledServiceIds: string[];
}) {
  const [editing, setEditing] = useState(false);

  const initialValues = useMemo(
    () => toServicesFormValues(allServices, enabledServiceIds),
    [allServices, enabledServiceIds]
  );

  const saveServices = useCallback(
    async (values: ServicesFormValues) => {
      const payload = allServices.map((service) => ({
        service_id: service.id,
        enabled: values.services[service.id]?.enabled ?? false,
        buffer_minutes: values.services[service.id]?.buffer_minutes ?? 0,
      }));

      const res = await fetch(
        `/api/admin/psychologists/${psychologistId}/service-settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ services: payload }),
        }
      );

      if (!res.ok) {
        await parseApiError(res, "Couldn't save services", "saveServices");
      }
    },
    [allServices, psychologistId]
  );

  const { values, setValues, status, flush } = useAdminAutosave({
    initialValues,
    enabled: editing,
    onSave: saveServices,
    equals: servicesEquals,
  });

  async function closeEditing() {
    await flush();
    setEditing(false);
  }

  const enabledServices = allServices.filter((service) =>
    enabledServiceIds.includes(service.id)
  );

  return (
    <section className={detailCardClass}>
      <AdminEditableCardHeader
        title="Services"
        editing={editing}
        status={status}
        onEdit={() => setEditing(true)}
        onClose={closeEditing}
        editLabel="Edit services"
        closeLabel="Close services editor"
        className={psychCardHeaderClass}
      />
      <div className={psychCardBodyStackClass}>
        {editing ? (
          <ul className="space-y-6 sm:space-y-7">
            {allServices.map((service) => {
              const row = values.services[service.id] ?? {
                enabled: false,
                buffer_minutes: service.buffer_minutes,
              };

              return (
                <li key={service.id}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={row.enabled}
                      onChange={(checked) =>
                        setValues((prev) => ({
                          services: {
                            ...prev.services,
                            [service.id]: {
                              ...prev.services[service.id]!,
                              enabled: checked,
                            },
                          },
                        }))
                      }
                      ariaLabel={`Enable ${service.name}`}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className={cn(detailValueClass, "font-medium")}>
                        {service.name}
                      </p>
                      <p
                        className={cn(
                          detailMutedClass,
                          "text-[13px] leading-snug"
                        )}
                      >
                        {formatCurrency(service.price_cents)} ·{" "}
                        {formatDuration(service.duration_minutes)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-8">
                    <p className={detailLabelClass}>Buffer after session</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={240}
                        step={5}
                        disabled={!row.enabled}
                        value={row.buffer_minutes}
                        onChange={(e) =>
                          setValues((prev) => ({
                            services: {
                              ...prev.services,
                              [service.id]: {
                                ...prev.services[service.id]!,
                                buffer_minutes: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className={cn(
                          adminControlInputClass,
                          "w-20 px-2",
                          !row.enabled && "opacity-50"
                        )}
                        aria-label={`${service.name} buffer minutes`}
                      />
                      <span className="text-sm text-[var(--brand-text-muted)]">
                        min
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : enabledServices.length === 0 ? (
          <p className={detailMutedClass}>No services enabled yet.</p>
        ) : (
          <ul className="space-y-5 sm:space-y-7">
            {enabledServices.map((service) => (
              <li key={service.id} className="space-y-0.5">
                <p className={cn(detailValueClass, "font-medium")}>
                  {service.name}
                </p>
                <p
                  className={cn(detailMutedClass, "text-[13px] leading-snug")}
                >
                  {formatCurrency(service.price_cents)} ·{" "}
                  {formatDuration(service.duration_minutes)} ·{" "}
                  {service.buffer_minutes} min buffer
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
