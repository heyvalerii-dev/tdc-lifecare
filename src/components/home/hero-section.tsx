import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookingCta } from "./booking-cta";
import { TrustStrip } from "./trust-strip";
import { HeroIllustration } from "./hero-illustration";
import { HeroMobileWatermark } from "./hero-mobile-watermark";
import { homeContainer } from "./home-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="px-5 pb-16 pt-10 sm:px-8 sm:pt-14 sm:pb-14 lg:pb-8">
      <div className={homeContainer}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:gap-16">
          <div className="relative isolate max-w-[19rem] sm:max-w-2xl lg:max-w-none">
            <HeroMobileWatermark />
            <div className="relative z-[1]">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3.5 w-0.5 shrink-0 rounded-full bg-[var(--brand-yellow)] lg:h-4"
                  aria-hidden="true"
                />
                <p className={type.heroEyebrow}>TDC LifeCare – Psychological Center</p>
              </div>

              <h1 className={cn(type.display, "mt-5 text-[var(--brand-text)] lg:mt-6")}>
                Professional psychological support, made easier.
              </h1>

              <p className="mt-4 font-sans text-base leading-relaxed text-[var(--brand-text-muted)] lg:hidden">
                Confidential support for you, your child, or your family.
              </p>
              <p className={cn(type.bodyMuted, type.prose, "mt-5 hidden lg:block")}>
                A calm, confidential space to get the help you need — for yourself,
                your child, or your family.
              </p>

              <div className="mt-7 flex flex-col items-start gap-4 lg:mt-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-3">
                <BookingCta className="w-full px-10 sm:w-auto lg:w-auto" />
                <Link
                  href="#psychologists"
                  className={cn(
                    type.nav,
                    "inline-flex min-h-11 items-center gap-1.5 text-[var(--brand-text-muted)] transition-colors duration-[250ms] ease-out hover:text-[var(--brand-purple)]"
                  )}
                >
                  Meet our psychologists
                  <ArrowRight
                    className="h-4 w-4 opacity-50"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Link>
              </div>

              <TrustStrip className="mt-9 lg:mt-9" />
            </div>
          </div>

          <div className="hidden justify-center lg:flex lg:justify-end">
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}
