"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { getPsychologistShortName } from "@/lib/admin-calendar";
import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  QuestionnaireResponse,
} from "@/types/database";

export const CLIENT_DETAIL_PREVIEW_COUNT = 5;

export interface ClientQuestionnaireRow extends QuestionnaireResponse {
  questionnaire?: { title?: string | null } | null;
  appointment?: { id: string; start_at: string } | null;
}

export interface ClientTimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  detail?: string;
}

const rowHoverClass =
  "group -mx-2 rounded-xl px-2 transition-colors duration-150 ease-out hover:bg-[var(--brand-purple-light)]/35";

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
    <div className="border-t border-[var(--brand-purple)]/[0.06] pt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-purple)]",
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

export function AppointmentHistoryCard({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? appointments
    : appointments.slice(0, CLIENT_DETAIL_PREVIEW_COUNT);
  const remaining = Math.max(0, appointments.length - CLIENT_DETAIL_PREVIEW_COUNT);

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Appointment History</h2>
      </div>
      <div className={cn(detailCardBodyClass, "space-y-4")}>
        {appointments.length === 0 ? (
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple-light)]/35">
              <CalendarDays
                className="h-5 w-5 text-[var(--brand-purple)]/70"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div className="space-y-1.5">
              <p className={cn(detailValueClass, "font-medium")}>
                No appointments yet
              </p>
              <p className={detailMutedClass}>
                Booked sessions for this client will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((appointment) => (
                <li key={appointment.id}>
                  <Link
                    href={`/admin/appointments/${appointment.id}`}
                    className={cn(
                      "flex cursor-pointer flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                      rowHoverClass
                    )}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className={cn(detailValueClass, "font-medium")}>
                        {appointment.service?.name ?? "Appointment"}
                      </p>
                      <p className={detailMutedClass}>
                        {formatClinicDateTime(appointment.start_at)}
                      </p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {appointment.psychologist?.name
                          ? getPsychologistShortName(appointment.psychologist.name)
                          : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <AdminAppointmentStatusPill status={appointment.status} />
                      <NavArrow />
                    </div>
                  </Link>
                </li>
              ))}
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

export function QuestionnairesCard({
  responses,
}: {
  responses: ClientQuestionnaireRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? responses
    : responses.slice(0, CLIENT_DETAIL_PREVIEW_COUNT);
  const remaining = Math.max(0, responses.length - CLIENT_DETAIL_PREVIEW_COUNT);

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Questionnaires</h2>
      </div>
      <div className={cn(detailCardBodyClass, "space-y-4")}>
        {responses.length === 0 ? (
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple-light)]/35">
              <ClipboardList
                className="h-5 w-5 text-[var(--brand-purple)]/70"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <div className="space-y-1.5">
              <p className={cn(detailValueClass, "font-medium")}>
                No questionnaires yet
              </p>
              <p className={detailMutedClass}>
                Intake forms submitted with bookings will show up here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((response) => {
                const href = response.appointment_id
                  ? `/admin/appointments/${response.appointment_id}`
                  : null;

                const content = (
                  <>
                    <div className="min-w-0 space-y-1.5">
                      <p className={cn(detailValueClass, "font-medium")}>
                        {response.questionnaire?.title ?? "Questionnaire"}
                      </p>
                      <p className={detailMutedClass}>
                        Submitted{" "}
                        {formatClinicDate(response.submitted_at, "MMM d, yyyy")} •{" "}
                        {formatClinicTime(response.submitted_at)}
                      </p>
                      {response.appointment?.id && (
                        <p className="text-sm text-[var(--brand-text-muted)]">
                          Linked appointment{" "}
                          {formatClinicDate(
                            response.appointment.start_at,
                            "MMM d, yyyy"
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center">
                      {href ? <NavArrow /> : null}
                    </div>
                  </>
                );

                return (
                  <li key={response.id}>
                    {href ? (
                      <Link
                        href={href}
                        className={cn(
                          "flex cursor-pointer flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between",
                          rowHoverClass
                        )}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                        {content}
                      </div>
                    )}
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

export function TimelineCard({ events }: { events: ClientTimelineEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? events
    : events.slice(0, CLIENT_DETAIL_PREVIEW_COUNT);
  const remaining = Math.max(0, events.length - CLIENT_DETAIL_PREVIEW_COUNT);

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Timeline</h2>
      </div>
      <div className={cn(detailCardBodyClass, "space-y-4")}>
        {events.length === 0 ? (
          <p className={detailMutedClass}>No activity yet.</p>
        ) : (
          <>
            <ol className="space-y-0">
              {visible.map((event, index) => (
                <li key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[var(--brand-purple)]/35" />
                    {index < visible.length - 1 && (
                      <span
                        className="my-1.5 min-h-6 w-px flex-1 bg-[var(--brand-purple)]/[0.08]"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      "min-w-0 flex-1",
                      index < visible.length - 1 ? "pb-5" : "pb-0.5"
                    )}
                  >
                    <p className="text-sm font-medium text-[var(--brand-text)]">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      {formatClinicDate(event.timestamp, "MMM d, yyyy")} •{" "}
                      {formatClinicTime(event.timestamp)}
                    </p>
                    {event.detail && (
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
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
