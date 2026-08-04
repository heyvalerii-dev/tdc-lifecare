"use client";

import { Fragment, useMemo } from "react";
import { CalendarAppointmentEvent } from "@/components/admin/appointments/calendar-appointment-event";
import { CalendarBlockedTimeEvent } from "@/components/admin/appointments/calendar-blocked-time-event";
import { CalendarEmptySlot } from "@/components/admin/appointments/calendar-empty-slot";
import { CalendarMobileAgenda } from "@/components/admin/appointments/calendar-mobile-agenda";
import { CalendarMobileSchedule } from "@/components/admin/appointments/calendar-mobile-schedule";
import {
  CalendarGridRow,
  CalendarHourLabel,
} from "@/components/admin/appointments/calendar-grid-layout";
import {
  CALENDAR_PSYCH_HEADER_HEIGHT_CLASS,
  formatDayHeader,
  filterWorkingDays,
  getAppointmentsForColumn,
  getBlocksForColumn,
  getCalendarGridSlots,
  getCalendarRangeForSchedule,
  getCalendarTimeGridStyle,
  getGridEndMinutes,
  getGridStartMinutes,
  getPsychologistShortName,
  getPsychologistIdentityColor,
  getWeekDays,
  isGridSlotBookable,
  mergeCalendarAppointments,
  toClinicDateString,
} from "@/lib/admin-calendar";
import {
  clipBlockToClinicDate,
  resolveUnavailableBlocks,
  type ResolvedUnavailableBlock,
} from "@/lib/calendar-blocks";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { getClinicToday } from "@/lib/datetime";
import { parseClinicDate } from "@/components/ui/single-date-calendar";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  UnavailableBlock,
} from "@/types/database";

interface AppointmentsCalendarViewProps {
  appointments: AppointmentWithRelations[];
  psychologists: Psychologist[];
  blocks?: UnavailableBlock[];
  availability?: AvailabilityBlock[];
  workingDays: number[];
  weekStart: Date;
  visibleDayIndex: number;
  selectedPsychologistId: string;
  /** Clinic date `yyyy-MM-dd` — mobile day source of truth. */
  selectedDateStr?: string;
  /** Mobile day presentation — Agenda is the default. */
  mobileDayLayout?: "agenda" | "grid";
}

const GUTTER_COLUMN_WIDTH = "3.5rem";

function CalendarCornerDateCell() {
  return (
    <div className="border-b border-transparent px-2 py-3.5">
      <span className="invisible text-sm font-medium">—</span>
    </div>
  );
}

function CalendarCornerPsychCell() {
  return (
    <div
      className={cn(
        "border-b border-transparent",
        CALENDAR_PSYCH_HEADER_HEIGHT_CLASS
      )}
    />
  );
}

function DayDateHeader({ day, isToday }: { day: Date; isToday: boolean }) {
  const { weekdayShort, dateLabel } = formatDayHeader(day);

  return (
    <div
      className={cn(
        "border-b border-[var(--brand-purple)]/[0.045] px-2 py-3.5 text-center",
        isToday && "bg-[var(--brand-purple-light)]/[0.10]"
      )}
    >
      <p
        className={cn(
          type.nav,
          "truncate",
          isToday ? "text-[var(--brand-purple)]" : "text-[var(--brand-text)]"
        )}
      >
        <span className="font-semibold">{weekdayShort}</span>
        <span className="font-normal">, {dateLabel}</span>
        {isToday && (
          <span className="ml-2.5 inline-flex align-middle rounded-full bg-[var(--brand-purple)]/[0.08] px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-[var(--brand-purple)]">
            Today
          </span>
        )}
      </p>
    </div>
  );
}

function PsychologistColumnHeader({
  name,
  accentColor,
  isFirstInDay,
}: {
  name: string;
  accentColor: string;
  isFirstInDay: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center border-b border-r border-[var(--brand-purple)]/[0.04] px-2 last:border-r-0",
        isFirstInDay && "border-l border-[var(--brand-purple)]/[0.04]",
        CALENDAR_PSYCH_HEADER_HEIGHT_CLASS
      )}
    >
      <span
        className="inline-flex max-w-full items-center justify-center gap-2"
        title={name}
      >
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <span className="truncate text-xs font-medium leading-none text-[var(--brand-text)]/60">
          {getPsychologistShortName(name)}
        </span>
      </span>
    </div>
  );
}

function ScheduleGrid({
  days,
  psychologists,
  appointments,
  blocks,
  sourceById,
  availability,
  clinicToday,
}: {
  days: Date[];
  psychologists: Psychologist[];
  appointments: AppointmentWithRelations[];
  blocks: ResolvedUnavailableBlock[];
  sourceById: Map<string, UnavailableBlock>;
  availability: AvailabilityBlock[];
  clinicToday: string;
}) {
  const psychIds = useMemo(
    () => new Set(psychologists.map((p) => p.id)),
    [psychologists]
  );

  const gridRange = useMemo(
    () =>
      getCalendarRangeForSchedule(
        availability,
        appointments,
        psychIds
      ),
    [availability, appointments, psychIds]
  );

  const gridSlots = useMemo(
    () => getCalendarGridSlots(gridRange),
    [gridRange]
  );
  const gridStartMinutes = getGridStartMinutes(gridRange);
  const gridEndMinutes = getGridEndMinutes(gridRange);

  const scheduleColumnCount = days.length * psychologists.length;
  const columnTemplate = `${GUTTER_COLUMN_WIDTH} repeat(${scheduleColumnCount}, minmax(0, 1fr))`;
  const timeGridStyle = getCalendarTimeGridStyle(columnTemplate, gridRange);

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--brand-purple)]/10 bg-white px-6 py-12 text-center shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
        <p className={type.smallMuted}>No clinic days scheduled this week.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--brand-purple)]/[0.06] bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
      <div
        className="grid bg-[#FCFBFF]"
        style={{ gridTemplateColumns: columnTemplate }}
      >
        <CalendarCornerDateCell />
        {days.map((day) => {
          const isToday = toClinicDateString(day) === clinicToday;
          return (
            <div
              key={toClinicDateString(day)}
              className={cn(
                "border-l border-[var(--brand-purple)]/[0.04]",
                isToday && "bg-[var(--brand-purple-light)]/[0.05]"
              )}
              style={{ gridColumn: `span ${psychologists.length}` }}
            >
              <DayDateHeader day={day} isToday={isToday} />
            </div>
          );
        })}

        <CalendarCornerPsychCell />
        {days.map((day) => {
          const isToday = toClinicDateString(day) === clinicToday;
          return psychologists.map((psych, psychIndex) => (
            <div
              key={`${toClinicDateString(day)}-${psych.id}-header`}
              className={cn(isToday && "bg-[var(--brand-purple-light)]/[0.06]")}
            >
              <PsychologistColumnHeader
                name={psych.name}
                accentColor={getPsychologistIdentityColor(psychIndex)}
                isFirstInDay={psychIndex === 0}
              />
            </div>
          ));
        })}
      </div>

      <div className="relative">
        <div className="grid" style={timeGridStyle}>
          {gridSlots.map((slot) => (
            <Fragment key={slot.index}>
              <CalendarGridRow minute={slot.minute} className="bg-[#FCFBFF] px-2">
                {slot.minute === 0 && <CalendarHourLabel hour={slot.hour} />}
              </CalendarGridRow>

              {days.map((day) => {
                const dateStr = toClinicDateString(day);
                const isToday = dateStr === clinicToday;

                return psychologists.map((psych, psychIndex) => (
                  <CalendarGridRow
                    key={`${dateStr}-${psych.id}-${slot.index}`}
                    minute={slot.minute}
                    className={cn(
                      "border-r border-[var(--brand-purple)]/[0.04] last:border-r-0",
                      psychIndex === 0 &&
                        "border-l border-[var(--brand-purple)]/[0.04]",
                      isToday && "bg-[var(--brand-purple-light)]/[0.03]"
                    )}
                  >
                    {isGridSlotBookable(
                      appointments,
                      availability,
                      psych.id,
                      dateStr,
                      slot.hour,
                      slot.minute,
                      blocks
                    ) ? (
                      <CalendarEmptySlot
                        psychologistId={psych.id}
                        psychologistName={psych.name}
                        dateStr={dateStr}
                        hour={slot.hour}
                        minute={slot.minute}
                      />
                    ) : null}
                  </CalendarGridRow>
                ));
              })}
            </Fragment>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-0 grid"
          style={timeGridStyle}
        >
          {days.map((day, dayIndex) => {
            const dateStr = toClinicDateString(day);

            return psychologists.map((psych, psychIndex) => {
              const columnAppointments = getAppointmentsForColumn(
                appointments,
                psych.id,
                dateStr
              );
              const columnBlocks = getBlocksForColumn(
                blocks,
                psych.id,
                dateStr
              ) as ResolvedUnavailableBlock[];
              const gridColumn =
                2 + dayIndex * psychologists.length + psychIndex;

              return (
                <div
                  key={`overlay-${dateStr}-${psych.id}`}
                  className="relative min-w-0"
                  style={{ gridColumn, gridRow: "1 / -1" }}
                >
                  {columnBlocks.map((block) => {
                    const clipped = clipBlockToClinicDate(
                      block.start_at,
                      block.end_at,
                      dateStr
                    );
                    if (!clipped) return null;
                    const source =
                      sourceById.get(block.source_id) ??
                      ({
                        ...block,
                        id: block.source_id,
                        created_at: "",
                        updated_at: "",
                      } as UnavailableBlock);
                    return (
                      <CalendarBlockedTimeEvent
                        key={block.id}
                        block={source}
                        displayStartAt={clipped.start_at}
                        displayEndAt={clipped.end_at}
                        dateStr={dateStr}
                        psychologistName={psych.name}
                        gridStartMinutes={gridStartMinutes}
                        gridEndMinutes={gridEndMinutes}
                      />
                    );
                  })}
                  {columnAppointments.map((appointment) => (
                    <CalendarAppointmentEvent
                      key={appointment.id}
                      appointment={appointment}
                      dateStr={dateStr}
                      accentColor={getPsychologistIdentityColor(psychIndex)}
                      gridStartMinutes={gridStartMinutes}
                      gridEndMinutes={gridEndMinutes}
                    />
                  ))}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

export function AppointmentsCalendarView({
  appointments,
  psychologists,
  blocks = [],
  availability = [],
  workingDays,
  weekStart,
  visibleDayIndex,
  selectedPsychologistId,
  selectedDateStr,
  mobileDayLayout = "agenda",
}: AppointmentsCalendarViewProps) {
  const clinicToday = getClinicToday();
  const visibleDays = useMemo(
    () => filterWorkingDays(getWeekDays(weekStart), workingDays),
    [weekStart, workingDays]
  );

  const calendarAppointments = useMemo(() => {
    const weekAppts = mergeCalendarAppointments(
      appointments,
      weekStart,
      workingDays
    );
    if (!selectedDateStr) return weekAppts;

    const ids = new Set(weekAppts.map((appt) => appt.id));
    const extras = appointments.filter((appt) => {
      if (ids.has(appt.id)) return false;
      if (["cancelled", "expired"].includes(appt.status)) return false;
      const date = formatInTimeZone(
        appt.start_at,
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      return date === selectedDateStr;
    });

    return extras.length > 0 ? [...weekAppts, ...extras] : weekAppts;
  }, [appointments, weekStart, workingDays, selectedDateStr]);

  const sortedPsychologists = useMemo(() => {
    const byId = new Map(psychologists.map((p) => [p.id, p]));
    for (const appt of calendarAppointments) {
      const psych = appt.psychologist;
      if (psych && !byId.has(psych.id)) {
        byId.set(psych.id, psych);
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [psychologists, calendarAppointments]);

  const weekDateStrings = useMemo(() => {
    const dates = visibleDays.map(toClinicDateString);
    if (selectedDateStr) dates.push(selectedDateStr);
    if (dates.length === 0) return { from: "", to: "" };
    dates.sort();
    return { from: dates[0]!, to: dates[dates.length - 1]! };
  }, [visibleDays, selectedDateStr]);

  const resolvedBlocks = useMemo(() => {
    if (!weekDateStrings.from || !weekDateStrings.to) return [];
    return resolveUnavailableBlocks(
      blocks,
      weekDateStrings.from,
      weekDateStrings.to
    );
  }, [blocks, weekDateStrings]);

  const sourceById = useMemo(() => {
    const map = new Map<string, UnavailableBlock>();
    for (const b of blocks) map.set(b.id, b);
    return map;
  }, [blocks]);

  const mobileDay = selectedDateStr
    ? parseClinicDate(selectedDateStr)
    : (visibleDays[visibleDayIndex] ?? visibleDays[0]);
  const mobilePsychologist =
    sortedPsychologists.find((p) => p.id === selectedPsychologistId) ??
    sortedPsychologists[0];

  return (
    <>
      <div className="hidden w-full md:block">
        <ScheduleGrid
          days={visibleDays}
          psychologists={sortedPsychologists}
          appointments={calendarAppointments}
          blocks={resolvedBlocks}
          sourceById={sourceById}
          availability={availability}
          clinicToday={clinicToday}
        />
      </div>
      <div className="w-full md:hidden">
        {mobileDay && mobilePsychologist ? (
          mobileDayLayout === "agenda" ? (
            <CalendarMobileAgenda
              day={mobileDay}
              psychologist={mobilePsychologist}
              appointments={calendarAppointments}
              blocks={resolvedBlocks}
              sourceById={sourceById}
              workingDays={workingDays}
              availability={availability}
            />
          ) : (
            <CalendarMobileSchedule
              day={mobileDay}
              psychologist={mobilePsychologist}
              psychologists={sortedPsychologists}
              appointments={calendarAppointments}
              blocks={resolvedBlocks}
              sourceById={sourceById}
              availability={availability}
              clinicToday={clinicToday}
            />
          )
        ) : null}
      </div>
    </>
  );
}
