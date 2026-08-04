"use client";

import { useState } from "react";
import { CalendarPortalPanel } from "@/components/admin/appointments/calendar-portal-panel";
import {
  FloatingHoverCard,
  useFloatingHoverCard,
} from "@/components/floating";
import { formatClinicTime } from "@/lib/datetime";
import { calendarStatusBufferStyles } from "@/lib/admin-calendar";
import { cn } from "@/lib/utils";

interface CalendarAppointmentBufferProps {
  status: string;
  bufferMinutes: number;
  availableAgainAt: Date;
  accentColor: string;
  psychologistName: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CalendarAppointmentBuffer({
  status,
  bufferMinutes,
  availableAgainAt,
  accentColor,
  psychologistName,
  className,
  style,
}: CalendarAppointmentBufferProps) {
  const [hovered, setHovered] = useState(false);
  const availableLabel = formatClinicTime(availableAgainAt);

  const { popover, setReference } = useFloatingHoverCard({
    open: hovered,
    variant: "calendar-buffer",
  });

  return (
    <>
      <div
        ref={setReference}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "shrink-0 cursor-default rounded-b-[11px]",
          calendarStatusBufferStyles[status] ?? "bg-[#F5F4F7]/[0.18]",
          "bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(93,80,122,0.05)_3px,rgba(93,80,122,0.05)_6px)]",
          className
        )}
        style={style}
        aria-label={`Reserved buffer. ${psychologistName} available again at ${availableLabel}`}
      />

      <FloatingHoverCard
        open={hovered}
        popover={popover}
        interactive={false}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <CalendarPortalPanel accentColor={accentColor}>
          <p className="text-xs font-semibold leading-tight text-[var(--brand-text)]">
            Reserved Buffer
          </p>
          <p className="mt-2 text-[11px] leading-snug text-[var(--brand-text-muted)]">
            🕒 {bufferMinutes}-minute buffer
          </p>
          <div className="mt-2 space-y-0.5">
            <p className="text-[11px] leading-snug text-[var(--brand-text-muted)]">
              {psychologistName}
            </p>
            <p className="text-xs font-semibold leading-snug text-[var(--brand-text)]">
              Available again at {availableLabel}
            </p>
          </div>
        </CalendarPortalPanel>
      </FloatingHoverCard>
    </>
  );
}
