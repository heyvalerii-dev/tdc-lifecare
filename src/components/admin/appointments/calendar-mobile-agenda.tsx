"use client";

import { useMemo, useState } from "react";
import { differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import { CalendarPlus, Clock3, HeartHandshake, Lock, Moon, Plus, Ban, CalendarDays, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import { AdminCardEditButton } from "@/components/admin/admin-card-edit-button";
import { useCalendarDrawer } from "@/components/admin/manual-booking/manual-booking-context";
import {
  getAppointmentsForColumn,
  getBlocksForColumn,
  hasPsychologistAvailabilityForDate,
  toClinicDateString,
} from "@/lib/admin-calendar";
import {
  blockDisplayTitle,
  clipBlockToClinicDate,
  getMultiDaySegmentKind,
  type ResolvedUnavailableBlock,
} from "@/lib/calendar-blocks";
import { CLINIC_TIMEZONE, UNAVAILABLE_REASON_LABELS } from "@/lib/constants";
import {
  clinicDateToUtc,
  formatClinicTime,
  getDayOfWeekInClinic,
} from "@/lib/datetime";
import {
  isClinicWorkingDate,
  thisClinicClosedOnDayMessage,
} from "@/lib/clinic-working-days";
import { buildDayContextPreset } from "@/lib/manual-booking";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn, formatDuration } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  UnavailableBlock,
} from "@/types/database";

interface CalendarMobileAgendaProps {
  day: Date;
  psychologist: Psychologist;
  appointments: AppointmentWithRelations[];
  blocks: ResolvedUnavailableBlock[];
  sourceById: Map<string, UnavailableBlock>;
  /** Clinic operating weekdays (0=Sun … 6=Sat). */
  workingDays: number[];
  availability?: AvailabilityBlock[];
}

type AgendaAppointmentItem = {
  kind: "appointment";
  id: string;
  startMs: number;
  appointment: AppointmentWithRelations;
};

type AgendaBlockItem = {
  kind: "block";
  id: string;
  startMs: number;
  allDay: boolean;
  title: string;
  displayStartAt: string;
  displayEndAt: string;
  source: UnavailableBlock;
};

type AgendaTimedItem = AgendaAppointmentItem | AgendaBlockItem;

function isAllDayBlock(
  source: UnavailableBlock,
  displayStartAt: string,
  displayEndAt: string,
  dateStr: string
): boolean {
  if (source.all_day) return true;
  const segmentKind = getMultiDaySegmentKind(
    source.start_at,
    source.end_at,
    dateStr
  );
  if (segmentKind === "middle") return true;

  const startLocal = formatInTimeZone(
    displayStartAt,
    CLINIC_TIMEZONE,
    "HH:mm"
  );
  const endLocal = formatInTimeZone(displayEndAt, CLINIC_TIMEZONE, "HH:mm");
  return (
    startLocal === "00:00" && (endLocal === "00:00" || endLocal === "23:59")
  );
}

export function CalendarMobileAgenda({
  day,
  psychologist,
  appointments,
  blocks,
  sourceById,
  workingDays,
  availability = [],
}: CalendarMobileAgendaProps) {
  const { openEditAppointment, openBlockTime, openCalendarDrawer } =
    useCalendarDrawer();
  const [addChooserOpen, setAddChooserOpen] = useState(false);
  const dateStr = toClinicDateString(day);
  const clinicOpen = isClinicWorkingDate(dateStr, workingDays);

  const { allDayItems, timedItems } = useMemo(() => {
    const columnAppointments = getAppointmentsForColumn(
      appointments,
      psychologist.id,
      dateStr
    );
    const columnBlocks = getBlocksForColumn(
      blocks,
      psychologist.id,
      dateStr
    ) as ResolvedUnavailableBlock[];

    const allDay: AgendaBlockItem[] = [];
    const timed: AgendaTimedItem[] = [];

    for (const appointment of columnAppointments) {
      timed.push({
        kind: "appointment",
        id: appointment.id,
        startMs: parseISO(appointment.start_at).getTime(),
        appointment,
      });
    }

    for (const block of columnBlocks) {
      const clipped = clipBlockToClinicDate(
        block.start_at,
        block.end_at,
        dateStr
      );
      if (!clipped) continue;

      const source =
        sourceById.get(block.source_id) ??
        ({
          ...block,
          id: block.source_id,
          created_at: "",
          updated_at: "",
        } as UnavailableBlock);

      const title = blockDisplayTitle(
        block.reason,
        block.title,
        UNAVAILABLE_REASON_LABELS
      );

      const item: AgendaBlockItem = {
        kind: "block",
        id: block.id,
        startMs: parseISO(clipped.start_at).getTime(),
        allDay: isAllDayBlock(
          source,
          clipped.start_at,
          clipped.end_at,
          dateStr
        ),
        title,
        displayStartAt: clipped.start_at,
        displayEndAt: clipped.end_at,
        source,
      };

      if (item.allDay) {
        allDay.push(item);
      } else {
        timed.push(item);
      }
    }

    timed.sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
    allDay.sort((a, b) => a.title.localeCompare(b.title));

    return { allDayItems: allDay, timedItems: timed };
  }, [appointments, blocks, dateStr, psychologist.id, sourceById]);

  const isEmpty = allDayItems.length === 0 && timedItems.length === 0;

  const psychAvailable = hasPsychologistAvailabilityForDate(
    availability,
    psychologist.id,
    dateStr
  );

  const emptyState = isEmpty
    ? !clinicOpen
      ? ({
          kind: "closed" as const,
          icon: Moon,
          title: "Clinic Closed",
          description: [
            thisClinicClosedOnDayMessage(
              getDayOfWeekInClinic(clinicDateToUtc(dateStr, "12:00"))
            ),
            "You can still browse this day, but appointments cannot be created.",
          ],
        } as const)
      : !psychAvailable
        ? ({
            kind: "unavailable" as const,
            icon: Ban,
            title: "Unavailable",
            description: [
              "This psychologist is unavailable for the selected day.",
            ],
          } as const)
        : ({
            kind: "empty" as const,
            icon: CalendarDays,
            title: "Nothing scheduled",
            description: [
              "There are no appointments or unavailable blocks for this day.",
              "Tap + Add to create the first appointment.",
            ],
          } as const)
    : null;

  const dayContext = buildDayContextPreset({
    psychologistId: psychologist.id,
    psychologistName: psychologist.name,
    dateStr,
  });

  function handleAddAppointment() {
    if (!clinicOpen) return;
    setAddChooserOpen(false);
    openCalendarDrawer(dayContext);
  }

  function handleAddBlock() {
    if (!clinicOpen) return;
    setAddChooserOpen(false);
    openBlockTime({
      slot: dayContext,
      mode: "one_time",
    });
  }

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-2xl border border-[var(--brand-purple)]/[0.06] bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
        <div className="px-4 pb-24 pt-4">
          {emptyState ? (
            <AgendaEmptyState
              icon={emptyState.icon}
              title={emptyState.title}
              description={emptyState.description}
            />
          ) : (
            <div className="space-y-1">
              {allDayItems.length > 0 ? (
                <section className="pb-2">
                  <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80">
                    All Day
                  </h3>
                  <ul>
                    {allDayItems.map((item, index) => (
                      <li key={item.id}>
                        <AgendaBlockRow
                          item={item}
                          showTime={false}
                          onOpen={() => openBlockTime({ block: item.source })}
                        />
                        {index < allDayItems.length - 1 ||
                        timedItems.length > 0 ? (
                          <div
                            className="my-4 border-t border-[var(--brand-purple)]/[0.08]"
                            aria-hidden
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {timedItems.length > 0 ? (
                <ul>
                  {timedItems.map((item, index) => (
                    <li key={item.id}>
                      {item.kind === "appointment" ? (
                        <AgendaAppointmentRow
                          appointment={item.appointment}
                          onEdit={() => openEditAppointment(item.appointment)}
                        />
                      ) : (
                        <AgendaBlockRow
                          item={item}
                          showTime
                          onOpen={() => openBlockTime({ block: item.source })}
                        />
                      )}
                      {index < timedItems.length - 1 ? (
                        <div
                          className="my-4 border-t border-[var(--brand-purple)]/[0.08]"
                          aria-hidden
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-40 md:hidden">
        <button
          type="button"
          onClick={() => {
            if (clinicOpen) setAddChooserOpen(true);
          }}
          disabled={!clinicOpen}
          aria-label={
            clinicOpen
              ? "Add appointment or block"
              : "Clinic is closed — appointments can't be created"
          }
          className={cn(
            "inline-flex items-center gap-1.5",
            "rounded-full bg-[var(--brand-purple)] px-4 py-3",
            "text-sm font-semibold text-white",
            "shadow-[0_8px_24px_rgba(93,80,122,0.28)]",
            "transition-[transform,background-color,box-shadow,opacity] duration-150",
            clinicOpen &&
              "hover:bg-[var(--brand-purple-dark)] hover:shadow-[0_10px_28px_rgba(93,80,122,0.32)] active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/40 focus-visible:ring-offset-2",
            !clinicOpen &&
              "cursor-not-allowed bg-[var(--brand-purple)]/45 opacity-70 shadow-none"
          )}
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Add
        </button>
      </div>

      <Dialog
        open={addChooserOpen}
        onClose={() => setAddChooserOpen(false)}
        className="relative z-[70]"
      >
        <TransitionChild
          appear
          enter="transition-[opacity,backdrop-filter] duration-[180ms] ease-out"
          enterFrom="opacity-0 backdrop-blur-[0px]"
          enterTo="opacity-100 backdrop-blur-[4px]"
          leave="transition-[opacity,backdrop-filter] duration-[180ms] ease-out"
          leaveFrom="opacity-100 backdrop-blur-[4px]"
          leaveTo="opacity-0 backdrop-blur-[0px]"
        >
          <div
            className="fixed inset-0 bg-[var(--brand-text)]/35"
            aria-hidden
          />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center sm:p-6">
          <TransitionChild
            appear
            enter="transform transition duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            enterFrom="opacity-0 scale-95 translate-y-2 sm:translate-y-0"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transform transition duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-2 sm:translate-y-0"
          >
            <div className="w-full max-w-[440px] will-change-transform">
              <DialogPanel
                className={cn(
                  "w-full rounded-xl bg-white outline-none",
                  "shadow-[0_16px_48px_rgba(93,80,122,0.18)]",
                  "ring-1 ring-[var(--brand-purple)]/[0.08]"
                )}
              >
                <div className="space-y-2 px-6 pt-6 pb-4">
                  <DialogTitle className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)]">
                    What would you like to add?
                  </DialogTitle>
                  <Description className="text-sm leading-relaxed text-[var(--brand-text-muted)]">
                    For {psychologist.name} on{" "}
                    {formatInTimeZone(
                      `${dateStr}T12:00:00`,
                      CLINIC_TIMEZONE,
                      "EEEE, MMM d"
                    )}
                    . You’ll choose the time next.
                  </Description>
                </div>

                <div className="flex flex-col gap-3 px-6 pb-6">
                  <button
                    type="button"
                    onClick={handleAddAppointment}
                    className={cn(
                      adminPrimaryButtonClass,
                      "inline-flex w-full items-center justify-center gap-2"
                    )}
                  >
                    <CalendarPlus
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Appointment
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBlock}
                    className={cn(
                      adminSecondaryButtonClass,
                      "inline-flex w-full items-center justify-center gap-2"
                    )}
                  >
                    <Lock
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    Unavailable Block
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddChooserOpen(false)}
                    className="text-sm text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
                  >
                    Cancel
                  </button>
                </div>
              </DialogPanel>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </div>
  );
}

function AgendaEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: readonly string[];
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-purple-light)]/45">
        <Icon
          className="h-7 w-7 text-[var(--brand-purple)]/80"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
      <h2 className="font-heading text-lg font-semibold tracking-tight text-[var(--brand-text)]">
        {title}
      </h2>
      <div className="mt-2 max-w-sm space-y-2">
        {description.map((line) => (
          <p
            key={line}
            className="text-sm leading-relaxed text-[var(--brand-text-muted)]"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function AgendaAppointmentRow({
  appointment,
  onEdit,
}: {
  appointment: AppointmentWithRelations;
  onEdit: () => void;
}) {
  const clientName =
    appointment.client?.full_name?.trim() ||
    appointment.client?.email ||
    "Client";
  const serviceName = appointment.service?.name ?? "Appointment";
  const durationMinutes =
    appointment.service?.duration_minutes ??
    differenceInMinutes(
      parseISO(appointment.end_at),
      parseISO(appointment.start_at)
    );
  const bufferMinutes = appointment.service?.buffer_minutes ?? 0;
  const serviceSummary = `${serviceName} (${formatDuration(durationMinutes)})`;

  return (
    <div
      className={cn(
        "group relative -mx-2 rounded-lg",
        "transition-colors duration-150",
        "hover:bg-[var(--brand-purple-light)]/25",
        "has-[:focus-visible]:bg-[var(--brand-purple-light)]/25"
      )}
    >
      <Link
        href={`/admin/appointments/${appointment.id}`}
        aria-label={`View appointment for ${clientName}`}
        className={cn(
          "block rounded-lg px-2 py-0.5 pr-10 text-left",
          "transition-colors duration-150",
          "active:bg-[var(--brand-purple-light)]/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25"
        )}
      >
        <p className="text-[13px] font-semibold tabular-nums leading-none text-[var(--brand-text)]">
          {formatClinicTime(appointment.start_at)}
        </p>
        <div className="mt-1.5 min-w-0">
          <p className="truncate text-[15px] font-semibold leading-snug text-[var(--brand-text)]">
            {clientName}
          </p>
          <p
            className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-normal leading-snug text-[var(--brand-text-muted)]"
            title={serviceSummary}
          >
            <HeartHandshake
              className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text-muted)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="truncate">{serviceSummary}</span>
          </p>
          {bufferMinutes > 0 ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-normal leading-snug text-[var(--brand-text-muted)]">
              <Clock3
                className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text-muted)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="truncate">
                +{formatDuration(bufferMinutes)} buffer
              </span>
            </p>
          ) : null}
          <div className="mt-2">
            <AdminAppointmentStatusPill
              status={appointment.status}
              className="px-2.5 py-0.5 text-[11px]"
            />
          </div>
        </div>
      </Link>

      <AdminCardEditButton
        label="Edit appointment"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit();
        }}
        className={cn(
          "absolute right-0.5 top-0 z-10",
          "h-8 w-8 opacity-70",
          "group-hover:opacity-100"
        )}
      />
    </div>
  );
}

function AgendaBlockRow({
  item,
  showTime,
  onOpen,
}: {
  item: AgendaBlockItem;
  showTime: boolean;
  onOpen: () => void;
}) {
  const durationMinutes = differenceInMinutes(
    parseISO(item.displayEndAt),
    parseISO(item.displayStartAt)
  );
  const titleSummary = showTime
    ? `${item.title} (${formatDuration(Math.max(durationMinutes, 0))})`
    : item.title;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-lg text-left transition-colors duration-150",
        "-mx-2 px-2 py-0.5",
        "hover:bg-[var(--brand-purple-light)]/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25"
      )}
    >
      {showTime ? (
        <p className="text-[13px] font-semibold tabular-nums leading-none text-[var(--brand-text)]">
          {formatClinicTime(item.displayStartAt)}
        </p>
      ) : null}
      <div className={cn(showTime ? "mt-1.5 space-y-0.5" : "space-y-0.5")}>
        <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-snug text-[var(--brand-text-muted)]">
          <Lock
            className="h-3.5 w-3.5 shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="min-w-0">{titleSummary}</span>
        </p>
        {showTime ? (
          <p className="text-[13px] leading-snug text-[var(--brand-text-muted)]/85">
            {formatClinicTime(item.displayStartAt)} –{" "}
            {formatClinicTime(item.displayEndAt)}
          </p>
        ) : (
          <p className="text-[13px] leading-snug text-[var(--brand-text-muted)]/85">
            All day
          </p>
        )}
      </div>
    </button>
  );
}
