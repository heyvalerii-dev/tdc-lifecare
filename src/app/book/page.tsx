import { Suspense } from "react";
import { HomeHeader } from "@/components/home/home-header";
import { getBookingPageData, resolvePsychologistId } from "@/lib/booking-data";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { homeContainer } from "@/components/home/home-styles";
import { type } from "@/lib/typography";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    psychologist?: string;
    confirmed?: string;
    resume?: string;
    payment?: string;
    appointment?: string;
  }>;
}) {
  const params = await searchParams;
  const { psychologists, questionnaire } = await getBookingPageData();
  const preselectedPsychologistId = resolvePsychologistId(
    params.psychologist,
    psychologists
  );

  return (
    <div className="min-h-screen bg-[var(--brand-cream)]">
      <HomeHeader bookingFlow />

      <main className={`${homeContainer} px-5 py-12 sm:px-8 sm:py-14`}>
        <Suspense fallback={<p className={type.bodyMuted}>Loading...</p>}>
          <BookingWizard
            psychologists={psychologists}
            questionnaire={questionnaire}
            preselectedPsychologistId={preselectedPsychologistId}
          />
        </Suspense>
      </main>
    </div>
  );
}
