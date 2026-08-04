"use client";

import Link from "next/link";
import { differenceInMinutes, parseISO } from "date-fns";
import type { ReactNode } from "react";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import {
  FloatingHoverCard,
  type UseFloatingPopoverReturn,
} from "@/components/floating";
import { Avatar } from "@/components/ui/avatar";
import { APPOINTMENT_STATUS_DOT_COLORS } from "@/lib/admin-calendar";
import {
  blockDisplayTitle,
  countBlockClinicDays,
  formatBlockRecurrenceLabel,
} from "@/lib/calendar-blocks";
import {
  UNAVAILABLE_REASON_ICONS,
  UNAVAILABLE_REASON_LABELS,
} from "@/lib/constants";
import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  getOccupiedUntil,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  UnavailableBlock,
} from "@/types/database";

const BLOCK_ACCENT_COLOR = "#C4BEC9";

type CalendarEventPreviewBase = {
  open: boolean;
  popover: UseFloatingPopoverReturn;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
};

export type CalendarEventPreviewProps =
  | (CalendarEventPreviewBase & {
      mode?: "appointment";
      appointment: AppointmentWithRelations;
      block?: never;
      psychologistName?: never;
      onEditBlock?: never;
    })
  | (CalendarEventPreviewBase & {
      mode: "block";
      block: UnavailableBlock;
      psychologistName: string;
      onEditBlock: () => void;
      appointment?: never;
    });

/** @deprecated Prefer mode-aware CalendarEventPreviewProps */
export type CalendarAppointmentPreviewProps = Extract<
  CalendarEventPreviewProps,
  { mode?: "appointment" }
>;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${remainder}m`;
}

function PreviewDetail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80">
        {label}
      </span>
      <div className="text-[11px] leading-snug text-[var(--brand-text)]">
        {value}
      </div>
    </div>
  );
}

function BlockReasonIcon({ reason }: { reason: string }) {
  const icon = UNAVAILABLE_REASON_ICONS[reason] ?? "🔒";
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        "bg-[#F3F1F5] text-sm leading-none",
        "ring-1 ring-[#D8D4DE]/80"
      )}
      aria-hidden
    >
      {icon}
    </div>
  );
}

function AppointmentPreviewBody({
  appointment,
}: {
  appointment: AppointmentWithRelations;
}) {
  const clientName =
    appointment.client?.full_name ?? appointment.client?.email ?? "Client";
  const serviceName = appointment.service?.name ?? "Appointment";
  const psychologistName = appointment.psychologist?.name ?? "—";

  const startAt = parseISO(appointment.start_at);
  const endAt = parseISO(appointment.end_at);
  const durationMinutes =
    appointment.service?.duration_minutes ??
    differenceInMinutes(endAt, startAt);
  const bufferMinutes = appointment.service?.buffer_minutes ?? 0;
  const occupiedUntil = getOccupiedUntil(endAt, bufferMinutes);

  const accentColor =
    APPOINTMENT_STATUS_DOT_COLORS[appointment.status] ?? "#B8B4C0";

  return (
    <>
      <div className="flex gap-3 p-3">
        <div
          className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2.5">
            <Avatar
              name={clientName}
              email={appointment.client?.email}
              src={appointment.client?.avatar_url}
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-[var(--brand-text)]">
                {clientName}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-[var(--brand-text-muted)]">
                {serviceName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <PreviewDetail label="Psychologist" value={psychologistName} />
            <PreviewDetail
              label="Date & Time"
              value={formatClinicDateTime(appointment.start_at)}
            />
            <PreviewDetail
              label="Duration"
              value={formatDuration(durationMinutes)}
            />
            {bufferMinutes > 0 && (
              <p className="text-[11px] leading-snug text-[var(--brand-text-muted)]">
                🕒 {bufferMinutes}-minute buffer until{" "}
                {formatClinicTime(occupiedUntil)}
              </p>
            )}
          </div>

          <AdminAppointmentStatusPill status={appointment.status} />
        </div>
      </div>

      <div className="border-t border-[var(--brand-purple)]/[0.06] px-3 py-2.5">
        <Link
          href={`/admin/appointments/${appointment.id}`}
          className="text-xs font-medium text-[var(--brand-purple)] transition-colors duration-150 ease-out hover:text-[var(--brand-purple-dark)]"
        >
          Open Appointment →
        </Link>
      </div>
    </>
  );
}

function BlockPreviewBody({
  block,
  psychologistName,
  onEditBlock,
}: {
  block: UnavailableBlock;
  psychologistName: string;
  onEditBlock: () => void;
}) {
  const title = blockDisplayTitle(
    block.reason,
    block.title,
    UNAVAILABLE_REASON_LABELS
  );
  const startAt = parseISO(block.start_at);
  const endAt = parseISO(block.end_at);
  const durationMinutes = Math.max(1, differenceInMinutes(endAt, startAt));
  const dayCount = countBlockClinicDays(block.start_at, block.end_at);
  const isMultiDay = dayCount > 1;
  const recurrence = formatBlockRecurrenceLabel(block);

  const startDateLabel = formatClinicDate(block.start_at);
  const endDateLabel = formatClinicDate(
    new Date(parseISO(block.end_at).getTime() - 1).toISOString()
  );
  const dateRangeLabel =
    isMultiDay || block.all_day
      ? isMultiDay
        ? `${startDateLabel} – ${endDateLabel}`
        : startDateLabel
      : startDateLabel;
  const timeLabel =
    block.all_day || isMultiDay
      ? null
      : `${formatClinicTime(block.start_at)} – ${formatClinicTime(block.end_at)}`;

  const durationLabel = isMultiDay
    ? `${dayCount} day${dayCount === 1 ? "" : "s"}`
    : block.all_day
      ? "All day"
      : formatDuration(durationMinutes);

  return (
    <>
      <div className="flex gap-3 p-3">
        <div
          className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: BLOCK_ACCENT_COLOR }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2.5">
            <BlockReasonIcon reason={block.reason} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-[var(--brand-text)]">
                {title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-[var(--brand-text-muted)]">
                {dateRangeLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <PreviewDetail label="Duration" value={durationLabel} />
            {timeLabel ? (
              <PreviewDetail label="Time" value={timeLabel} />
            ) : null}
            <PreviewDetail label="Psychologist" value={psychologistName} />
            {recurrence ? (
              <PreviewDetail label="Schedule" value={recurrence} />
            ) : null}
            {block.notes?.trim() ? (
              <PreviewDetail label="Notes" value={block.notes.trim()} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--brand-purple)]/[0.06] px-3 py-2.5">
        <button
          type="button"
          onClick={onEditBlock}
          className="text-xs font-medium text-[var(--brand-purple)] transition-colors duration-150 ease-out hover:text-[var(--brand-purple-dark)]"
        >
          Open Block →
        </button>
      </div>
    </>
  );
}

/**
 * Shared calendar hover card for appointments and blocked time.
 * Same shell, spacing, shadow, and animation — content differs by mode.
 */
export function CalendarEventPreview(props: CalendarEventPreviewProps) {
  const { open, popover, onPointerEnter, onPointerLeave } = props;

  return (
    <FloatingHoverCard
      open={open}
      popover={popover}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="overflow-hidden rounded-xl border border-[var(--brand-purple)]/[0.08] bg-white shadow-[0_4px_20px_rgba(93,80,122,0.10)]">
        {props.mode === "block" ? (
          <BlockPreviewBody
            block={props.block}
            psychologistName={props.psychologistName}
            onEditBlock={props.onEditBlock}
          />
        ) : (
          <AppointmentPreviewBody appointment={props.appointment} />
        )}
      </div>
    </FloatingHoverCard>
  );
}

/** Appointment-mode alias — same component, appointment defaults. */
export function CalendarAppointmentPreview(
  props: CalendarAppointmentPreviewProps
) {
  return <CalendarEventPreview {...props} mode="appointment" />;
}
