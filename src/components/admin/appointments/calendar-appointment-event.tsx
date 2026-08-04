import { differenceInMinutes, parseISO } from "date-fns";
import { CalendarAppointmentBlock } from "@/components/admin/appointments/calendar-appointment-block";
import { CalendarAppointmentBuffer } from "@/components/admin/appointments/calendar-appointment-buffer";
import { getAppointmentGridPosition } from "@/lib/admin-calendar";
import { getOccupiedUntil } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";

interface CalendarAppointmentEventProps {
  appointment: AppointmentWithRelations;
  dateStr: string;
  accentColor: string;
  gridStartMinutes?: number;
  gridEndMinutes?: number;
  slotHeightPx?: number;
  variant?: "desktop" | "mobile";
}

export function CalendarAppointmentEvent({
  appointment,
  dateStr,
  accentColor,
  gridStartMinutes,
  gridEndMinutes,
  slotHeightPx,
  variant = "desktop",
}: CalendarAppointmentEventProps) {
  const startAt = parseISO(appointment.start_at);
  const endAt = parseISO(appointment.end_at);
  const durationMinutes =
    appointment.service?.duration_minutes ?? differenceInMinutes(endAt, startAt);
  const bufferMinutes = appointment.service?.buffer_minutes ?? 0;

  const position = getAppointmentGridPosition(
    appointment.start_at,
    durationMinutes,
    bufferMinutes,
    dateStr,
    gridStartMinutes,
    gridEndMinutes,
    slotHeightPx
  );
  if (!position) return null;

  const hasBuffer = bufferMinutes > 0 && position.bufferHeightPx > 0;
  const occupiedUntil = getOccupiedUntil(endAt, bufferMinutes);

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex flex-col",
        variant === "mobile" ? "inset-x-1.5" : "inset-x-1"
      )}
      style={{
        top: position.topPx,
        height: position.sessionHeightPx + position.bufferHeightPx,
      }}
    >
      <CalendarAppointmentBlock
        appointment={appointment}
        variant={variant}
        className={cn(
          "pointer-events-auto relative inset-auto shrink-0",
          hasBuffer ? "rounded-b-none rounded-t-[11px]" : "rounded-[11px]"
        )}
        style={{ height: position.sessionHeightPx }}
      />
      {hasBuffer && (
        <CalendarAppointmentBuffer
          status={appointment.status}
          bufferMinutes={bufferMinutes}
          availableAgainAt={occupiedUntil}
          accentColor={accentColor}
          psychologistName={appointment.psychologist?.name ?? "Psychologist"}
          className="pointer-events-auto"
          style={{ height: position.bufferHeightPx }}
        />
      )}
    </div>
  );
}
