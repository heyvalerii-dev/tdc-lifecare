"use client";

import { CalendarDays, CalendarPlus, Sparkles } from "lucide-react";
import { useManualBooking } from "@/components/admin/manual-booking/manual-booking-context";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

interface AppointmentsListEmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function AppointmentsListEmptyState({
  hasActiveFilters,
  onClearFilters,
}: AppointmentsListEmptyStateProps) {
  const { openManualBooking } = useManualBooking();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center sm:py-24">
      <div className="relative mb-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--brand-purple-light)]/45">
          <CalendarDays
            className="h-9 w-9 text-[var(--brand-purple)]/80"
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(93,80,122,0.1)]">
          <Sparkles
            className="h-3.5 w-3.5 text-[#C9A84C]"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-[var(--brand-text)] sm:text-2xl">
        No appointments scheduled
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--brand-text-muted)]">
        Try adjusting your filters or create a new appointment.
      </p>

      <div
        className={cn(
          "mt-8 flex flex-wrap items-center justify-center",
          hasActiveFilters ? "gap-2" : "gap-0"
        )}
      >
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className={adminSecondaryButtonClass}
          >
            Clear Filters
          </button>
        )}
        <button
          type="button"
          onClick={() => openManualBooking()}
          className={adminPrimaryButtonClass}
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          New Appointment
        </button>
      </div>
    </div>
  );
}
