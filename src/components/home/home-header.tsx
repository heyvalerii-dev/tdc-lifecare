"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PayMongoSandboxBanner } from "@/components/payments/paymongo-sandbox-badge";
import { BookingCta } from "./booking-cta";
import { clearBookingDraft } from "@/lib/booking-draft";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface HomeHeaderProps {
  bookingFlow?: boolean;
  /** Homepage only — header hidden at top, reveals on scroll */
  immersive?: boolean;
}

export function HomeHeader({ bookingFlow = false, immersive = false }: HomeHeaderProps) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(!immersive);

  useEffect(() => {
    if (!immersive) return;

    const threshold = 50;

    function handleScroll() {
      setRevealed(window.scrollY >= threshold);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [immersive]);

  function handleStartOver() {
    clearBookingDraft();
    router.push("/book");
    router.refresh();
  }

  const navBar = (
    <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-8">
      <BrandLogo href="/" variant="dark" />

      <nav className="flex shrink-0 items-center gap-4">
        {bookingFlow ? (
          <button
            type="button"
            onClick={handleStartOver}
            className={cn(
              type.nav,
              "text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
            )}
          >
            Start over
          </button>
        ) : (
          <>
            <Link
              href="/login"
              className={cn(
                type.nav,
                "inline-flex min-h-11 items-center text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
              )}
            >
              Sign in
            </Link>
            <BookingCta size="compact" className="hidden sm:inline-flex" />
          </>
        )}
      </nav>
    </div>
  );

  if (immersive) {
    return (
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-[250ms] ease-out",
          revealed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0"
        )}
      >
        <header
          className={cn(
            "border-b transition-colors duration-[250ms] ease-out",
            revealed
              ? "border-[var(--brand-border)] bg-white/80 backdrop-blur-[20px]"
              : "border-transparent bg-transparent backdrop-blur-none"
          )}
        >
          {navBar}
        </header>
        <PayMongoSandboxBanner />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--brand-border)] bg-white">
        {navBar}
      </header>
      <PayMongoSandboxBanner />
    </>
  );
}
