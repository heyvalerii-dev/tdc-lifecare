import Link from "next/link";
import { HomeHeader } from "@/components/home/home-header";
import {
  homeContainer,
  homeRadiusButton,
  homeTactilePrimary,
} from "@/components/home/home-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Page not found | TDC LifeCare",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--brand-cream)]">
      <HomeHeader />

      <main
        className={cn(
          homeContainer,
          "flex flex-1 flex-col items-center justify-center px-5 py-16 sm:px-8 sm:py-20"
        )}
      >
        <div className="w-full max-w-lg text-center">
          <p className="font-heading text-[2.75rem] font-bold leading-none tracking-tight text-[var(--brand-purple)] sm:text-[3.25rem]">
            404
          </p>

          <h1 className={cn(type.pageTitle, "mt-5")}>
            Oops! We can&apos;t find that page.
          </h1>

          <p
            className={cn(
              type.bodyMuted,
              "mx-auto mt-3 max-w-md text-base sm:text-lg"
            )}
          >
            The page you&apos;re looking for may have moved, or the link may be
            incorrect.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/"
              className={cn(
                homeTactilePrimary,
                homeRadiusButton,
                type.button,
                "inline-flex min-h-11 items-center justify-center px-6 py-3",
                "bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple-dark)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)] focus-visible:ring-offset-2"
              )}
            >
              Back to Home
            </Link>

            <Link
              href="/book"
              className={cn(
                type.nav,
                "inline-flex min-h-11 items-center text-[var(--brand-purple)] transition-colors",
                "hover:text-[var(--brand-purple-dark)] hover:underline hover:underline-offset-4",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)] focus-visible:ring-offset-2"
              )}
            >
              Go to Booking
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
