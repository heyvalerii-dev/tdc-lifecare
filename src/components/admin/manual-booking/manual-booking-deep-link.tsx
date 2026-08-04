"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useManualBooking } from "@/components/admin/manual-booking/manual-booking-context";
import { buildSlotPresetFromGrid } from "@/lib/manual-booking";

interface ManualBookingDeepLinkProps {
  psychologistId?: string;
  psychologistName?: string;
  date?: string;
  time?: string;
}

/**
 * Deep-link / legacy `/admin/book` entry — opens the shared Manual Booking
 * drawer with optional slot prefill, then returns to Appointments.
 */
export function ManualBookingDeepLink({
  psychologistId,
  psychologistName,
  date,
  time,
}: ManualBookingDeepLinkProps) {
  const router = useRouter();
  const { openManualBooking } = useManualBooking();

  useEffect(() => {
    if (psychologistId && date && time) {
      const [hourPart, minutePart] = time.split(":");
      const hour = Number(hourPart);
      const minute = Number(minutePart);
      if (Number.isFinite(hour) && Number.isFinite(minute)) {
        openManualBooking(
          buildSlotPresetFromGrid({
            psychologistId,
            psychologistName:
              psychologistName?.trim() || "Selected psychologist",
            dateStr: date,
            hour,
            minute,
          })
        );
      } else {
        openManualBooking();
      }
    } else {
      openManualBooking();
    }

    router.replace("/admin/calendar");
  }, [
    psychologistId,
    psychologistName,
    date,
    time,
    openManualBooking,
    router,
  ]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6">
      <p className="text-sm text-[var(--brand-text-muted)]">
        Opening Manual Booking…
      </p>
    </div>
  );
}
