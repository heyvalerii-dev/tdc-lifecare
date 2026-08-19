import { notFound } from "next/navigation";
import { HomeHeader } from "@/components/home/home-header";
import { ClinicClosedLayoutPreview } from "@/app/test/clinic-closed/clinic-closed-layout-preview";
import { homeContainer } from "@/components/home/home-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Clinic closed preview",
  robots: { index: false, follow: false },
};

/** Development-only preview of the booking closed-day info box. */
export default function TestClinicClosedPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--brand-cream)]">
      <HomeHeader bookingFlow />

      <main className={cn(homeContainer, "flex flex-1 flex-col px-5 py-12 sm:px-8 sm:py-14")}>
        <div className="mx-auto mb-8 w-full max-w-2xl space-y-2">
          <p className={type.progressStep}>Preview</p>
          <h1 className={type.sectionTitle}>Clinic closed notice</h1>
          <p className={cn(type.bodyMuted, "text-base")}>
            Default clinic days are Tuesday–Saturday. Switch dates to confirm the
            calendar keeps a stable height.
          </p>
        </div>

        <ClinicClosedLayoutPreview />
      </main>
    </div>
  );
}
