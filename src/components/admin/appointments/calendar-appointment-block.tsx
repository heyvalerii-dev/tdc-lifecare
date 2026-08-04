"use client";

import { useCallback, useRef, useState } from "react";
import { CalendarAppointmentPreview } from "@/components/admin/appointments/calendar-appointment-preview";
import { useCalendarDrawer } from "@/components/admin/manual-booking/manual-booking-context";
import {
  HOVER_CARD_CLOSE_DELAY_MS,
  useFloatingHoverCard,
} from "@/components/floating";
import {
  CALENDAR_EVENT_RADIUS_CLASS,
  CALENDAR_TRANSITION_CLASS,
  calendarStatusCardStyles,
} from "@/lib/admin-calendar";
import { formatClinicTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";

const PREVIEW_HIDE_DELAY_MS = HOVER_CARD_CLOSE_DELAY_MS;

interface CalendarAppointmentBlockProps {
  appointment: AppointmentWithRelations;
  className?: string;
  style?: React.CSSProperties;
  variant?: "desktop" | "mobile";
}

export function CalendarAppointmentBlock({
  appointment,
  className,
  style,
  variant = "desktop",
}: CalendarAppointmentBlockProps) {
  const { openEditAppointment } = useCalendarDrawer();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { popover, setReference } = useFloatingHoverCard({
    open: previewOpen,
    variant: "calendar-preview",
  });

  const clientName =
    appointment.client?.full_name ?? appointment.client?.email ?? "Client";
  const serviceName = appointment.service?.name ?? "Appointment";
  const timeRange = `${formatClinicTime(appointment.start_at)} – ${formatClinicTime(appointment.end_at)}`;
  const isMobile = variant === "mobile";

  const showPreview = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setPreviewOpen(true);
  }, []);

  const hidePreview = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setPreviewOpen(false);
    }, PREVIEW_HIDE_DELAY_MS);
  }, []);

  return (
    <>
      <button
        type="button"
        ref={setReference}
        onClick={() => {
          setPreviewOpen(false);
          openEditAppointment(appointment);
        }}
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        onFocus={showPreview}
        onBlur={hidePreview}
        style={style}
        className={cn(
          "relative z-10 flex min-w-0 flex-col justify-center overflow-hidden border border-transparent text-left",
          isMobile ? "gap-px px-3 py-2" : "px-3.5 py-1.5",
          CALENDAR_EVENT_RADIUS_CLASS,
          CALENDAR_TRANSITION_CLASS,
          "shadow-[0_1px_2px_rgba(93,80,122,0.04)] hover:-translate-y-px hover:border-[var(--brand-purple)]/[0.12] hover:shadow-[0_3px_8px_rgba(93,80,122,0.09)] hover:cursor-pointer active:scale-[0.995]",
          calendarStatusCardStyles[appointment.status] ??
            "bg-[#F5F4F7] hover:bg-[#EEEDF1]",
          className
        )}
      >
        <p
          className={cn(
            "font-semibold leading-snug text-[var(--brand-text)]",
            isMobile ? "text-sm leading-tight" : "truncate text-xs leading-tight"
          )}
        >
          {clientName}
        </p>
        <p
          className={cn(
            "text-[var(--brand-text-muted)]",
            isMobile
              ? "text-xs leading-tight"
              : "mt-0.5 truncate text-[11px] leading-tight"
          )}
        >
          {serviceName}
        </p>
        {isMobile ? (
          <p className="text-[11px] leading-tight text-[var(--brand-text-muted)]/90">
            {timeRange}
          </p>
        ) : null}
      </button>

      <CalendarAppointmentPreview
        appointment={appointment}
        open={previewOpen}
        popover={popover}
        onPointerEnter={showPreview}
        onPointerLeave={hidePreview}
      />
    </>
  );
}
