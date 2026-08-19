import { Info } from "lucide-react";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CLINIC_WORKING_DAYS,
  clinicClosedBookingSupportText,
} from "@/lib/clinic-working-days";

interface BookingClinicClosedNoticeProps {
  selectedDate: string;
  workingDays?: number[];
  className?: string;
}

export function BookingClinicClosedNotice({
  selectedDate,
  workingDays = [...DEFAULT_CLINIC_WORKING_DAYS],
  className,
}: BookingClinicClosedNoticeProps) {
  const supportText = clinicClosedBookingSupportText(selectedDate, workingDays);

  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border border-[var(--brand-purple)]/12 bg-[var(--brand-purple-light)]/70 px-5 py-4 sm:px-6 sm:py-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-[var(--brand-purple)]"
          aria-hidden
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 space-y-1">
          <p className={cn(type.label, "text-[var(--brand-purple)]")}>
            Clinic closed
          </p>
          <p className={cn(type.smallMuted, "font-normal leading-relaxed")}>
            {supportText}
          </p>
        </div>
      </div>
    </div>
  );
}
