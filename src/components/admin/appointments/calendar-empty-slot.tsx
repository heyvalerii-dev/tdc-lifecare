"use client";

import { CalendarPlus } from "lucide-react";
import { useManualBooking } from "@/components/admin/manual-booking/manual-booking-context";
import { CALENDAR_TRANSITION_CLASS } from "@/lib/admin-calendar";
import { buildSlotPresetFromGrid } from "@/lib/manual-booking";
import { cn } from "@/lib/utils";

interface CalendarEmptySlotProps {
  psychologistId: string;
  psychologistName: string;
  dateStr: string;
  hour: number;
  minute?: number;
  className?: string;
}

export function CalendarEmptySlot({
  psychologistId,
  psychologistName,
  dateStr,
  hour,
  minute = 0,
  className,
}: CalendarEmptySlotProps) {
  const { openQuickCreate } = useManualBooking();

  return (
    <button
      type="button"
      title="Book appointment"
      aria-label="Book appointment"
      onClick={() =>
        openQuickCreate(
          buildSlotPresetFromGrid({
            psychologistId,
            psychologistName,
            dateStr,
            hour,
            minute,
          })
        )
      }
      className={cn(
        "group absolute inset-0 flex items-center justify-center hover:cursor-pointer",
        CALENDAR_TRANSITION_CLASS,
        className
      )}
    >
      <CalendarPlus
        className={cn(
          "h-3.5 w-3.5 text-[#C9A84C] opacity-0 scale-95",
          CALENDAR_TRANSITION_CLASS,
          "group-hover:scale-100 group-hover:opacity-55"
        )}
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}
