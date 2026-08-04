"use client";

import { Fragment, useMemo } from "react";
import { CalendarAppointmentEvent } from "@/components/admin/appointments/calendar-appointment-event";
import { CalendarBlockedTimeEvent } from "@/components/admin/appointments/calendar-blocked-time-event";
import { CalendarEmptySlot } from "@/components/admin/appointments/calendar-empty-slot";
import {
  CalendarGridRow,
  CalendarHourLabel,
} from "@/components/admin/appointments/calendar-grid-layout";
import {
  getAppointmentsForColumn,
  getBlocksForColumn,
  getCalendarGridSlots,
  getCalendarRangeForSchedule,
  getCalendarTimeGridStyle,
  getGridEndMinutes,
  getGridStartMinutes,
  getPsychologistIdentityColorById,
  isGridSlotBookable,
  toClinicDateString,
} from "@/lib/admin-calendar";
import {
  clipBlockToClinicDate,
  type ResolvedUnavailableBlock,
} from "@/lib/calendar-blocks";
import { MOBILE_SLOT_HEIGHT_PX } from "@/lib/scheduling-grid";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  UnavailableBlock,
} from "@/types/database";

const GUTTER_COLUMN_WIDTH = "2.875rem";

interface CalendarMobileScheduleProps {
  day: Date;
  psychologist: Psychologist;
  psychologists: Psychologist[];
  appointments: AppointmentWithRelations[];
  blocks: ResolvedUnavailableBlock[];
  sourceById: Map<string, UnavailableBlock>;
  availability: AvailabilityBlock[];
  clinicToday: string;
}

export function CalendarMobileSchedule({
  day,
  psychologist,
  psychologists,
  appointments,
  blocks,
  sourceById,
  availability,
  clinicToday,
}: CalendarMobileScheduleProps) {
  const dateStr = toClinicDateString(day);
  const isToday = dateStr === clinicToday;
  const accentColor = getPsychologistIdentityColorById(
    psychologist.id,
    psychologists
  );

  const psychIds = useMemo(
    () => new Set(psychologists.map((p) => p.id)),
    [psychologists]
  );

  const gridRange = useMemo(
    () =>
      getCalendarRangeForSchedule(availability, appointments, psychIds),
    [availability, appointments, psychIds]
  );

  const gridSlots = useMemo(
    () => getCalendarGridSlots(gridRange),
    [gridRange]
  );
  const gridStartMinutes = getGridStartMinutes(gridRange);
  const gridEndMinutes = getGridEndMinutes(gridRange);
  const columnTemplate = `${GUTTER_COLUMN_WIDTH} minmax(0, 1fr)`;
  const timeGridStyle = getCalendarTimeGridStyle(
    columnTemplate,
    gridRange,
    MOBILE_SLOT_HEIGHT_PX
  );

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

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--brand-purple)]/[0.06] bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
      {/*
        Top padding gives the first hour label room to sit on the 9:00 line
        without being clipped by the card's overflow-hidden.
      */}
      <div className="relative pt-3">
        <div className="grid" style={timeGridStyle}>
          {gridSlots.map((slot) => (
            <Fragment key={slot.index}>
              <CalendarGridRow
                minute={slot.minute}
                className="overflow-visible bg-[#FCFBFF] px-1"
              >
                {slot.minute === 0 && (
                  <CalendarHourLabel hour={slot.hour} compact />
                )}
              </CalendarGridRow>

              <CalendarGridRow
                minute={slot.minute}
                className={cn(
                  "border-l border-[var(--brand-purple)]/[0.04]",
                  isToday && "bg-[var(--brand-purple-light)]/[0.03]"
                )}
              >
                {isGridSlotBookable(
                  appointments,
                  availability,
                  psychologist.id,
                  dateStr,
                  slot.hour,
                  slot.minute,
                  blocks
                ) ? (
                  <CalendarEmptySlot
                    psychologistId={psychologist.id}
                    psychologistName={psychologist.name}
                    dateStr={dateStr}
                    hour={slot.hour}
                    minute={slot.minute}
                  />
                ) : null}
              </CalendarGridRow>
            </Fragment>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 top-3 grid"
          style={timeGridStyle}
        >
          <div
            className="relative min-w-0"
            style={{ gridColumn: 2, gridRow: "1 / -1" }}
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
                  psychologistName={psychologist.name}
                  gridStartMinutes={gridStartMinutes}
                  gridEndMinutes={gridEndMinutes}
                  slotHeightPx={MOBILE_SLOT_HEIGHT_PX}
                  variant="mobile"
                />
              );
            })}
            {columnAppointments.map((appointment) => (
              <CalendarAppointmentEvent
                key={appointment.id}
                appointment={appointment}
                dateStr={dateStr}
                accentColor={accentColor}
                gridStartMinutes={gridStartMinutes}
                gridEndMinutes={gridEndMinutes}
                slotHeightPx={MOBILE_SLOT_HEIGHT_PX}
                variant="mobile"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
