import { notFound } from "next/navigation";
import { HomeHeader } from "@/components/home/home-header";
import { BookingClinicClosedNotice } from "@/components/booking/booking-clinic-closed-notice";
import { BookingScheduleCalendar } from "@/components/booking/booking-schedule-calendar";
import { homeContainer } from "@/components/home/home-styles";
import { type } from "@/lib/typography";
import { DEFAULT_CLINIC_WORKING_DAYS } from "@/lib/clinic-working-days";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Clinic closed preview",
  robots: { index: false, follow: false },
};

const PREVIEW_AVAILABLE_DATES = [
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
  "2026-07-24",
  "2026-07-25",
];

/** Development-only preview of the booking closed-day info box. */
export default function TestClinicClosedPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--brand-cream)]">
      <HomeHeader bookingFlow />

      <main className={cn(homeContainer, "flex flex-1 flex-col px-5 py-12 sm:px-8 sm:py-14")}>
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <div className="space-y-2">
            <p className={type.progressStep}>Preview</p>
            <h1 className={type.sectionTitle}>Clinic closed notice</h1>
            <p className={cn(type.bodyMuted, "text-base")}>
              Default clinic days are Tuesday–Saturday. Sundays and Mondays are closed.
            </p>
          </div>

          <div className="space-y-3">
            <BookingScheduleCalendar
              availableDates={PREVIEW_AVAILABLE_DATES}
              selectedDate="2026-07-21"
              onSelectDate={() => undefined}
            />
            <BookingClinicClosedNotice
              selectedDate="2026-07-20"
              workingDays={[...DEFAULT_CLINIC_WORKING_DAYS]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
