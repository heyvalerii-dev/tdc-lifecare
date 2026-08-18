import { Suspense } from "react";
import { HomeHeader } from "@/components/home/home-header";
import { getBookingPageData, resolvePsychologistId } from "@/lib/booking-data";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { homeContainer } from "@/components/home/home-styles";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { cn } from "@/lib/utils";

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

  const returningFromPayment = Boolean(params.confirmed);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--brand-cream)]">
      <HomeHeader bookingFlow />

      <main
        className={cn(
          homeContainer,
          "flex flex-1 flex-col px-5 sm:px-8",
          returningFromPayment ? "py-0" : "py-12 sm:py-14"
        )}
      >
        <Suspense fallback={<PageLoadingState />}>
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
