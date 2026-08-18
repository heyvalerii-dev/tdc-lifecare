import { notFound } from "next/navigation";
import { HomeHeader } from "@/components/home/home-header";
import { homeContainer } from "@/components/home/home-styles";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Loading preview",
  robots: { index: false, follow: false },
};

/** Development-only preview of the reusable page loading state. */
export default function TestLoadingPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--brand-cream)]">
      <HomeHeader bookingFlow />

      <main
        className={cn(
          homeContainer,
          "flex flex-1 flex-col px-5 sm:px-8"
        )}
      >
        <PageLoadingState />
      </main>
    </div>
  );
}
