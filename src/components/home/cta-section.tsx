import Image from "next/image";
import { BadgeCheck, Lock, Shield } from "lucide-react";
import { BookingCta } from "./booking-cta";
import { homeContainer, homeIconStroke } from "./home-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const trustSignals = [
  { icon: BadgeCheck, text: "PRC-Licensed" },
  { icon: Shield, text: "Confidential" },
  { icon: Lock, text: "Secure Online Booking" },
];

export function CtaSection() {
  return (
    <section className="relative overflow-hidden">
      <Image
        src="/cta-calm-room.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-[center_52%] blur-[1.5px]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/70 to-white/82"
        aria-hidden="true"
      />

      <div className="relative px-5 py-20 sm:px-8 sm:py-32 lg:py-36">
        <div className={homeContainer}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className={type.ctaClosing}>We&apos;re here when you&apos;re ready.</h2>
            <p
              className={cn(
                type.bodyMuted,
                "mx-auto mt-5 max-w-[16rem] text-lg leading-[1.65] sm:mt-7 sm:max-w-md lg:text-xl"
              )}
            >
              You don&apos;t have to figure everything out alone.
            </p>

            <div className="mt-10 sm:mt-12">
              <BookingCta className="px-10" />
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 sm:mt-8">
              {trustSignals.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-1.5 text-xs tracking-wide text-[var(--brand-text-muted)]/80"
                >
                  <Icon
                    className="h-3.5 w-3.5 opacity-60"
                    strokeWidth={homeIconStroke}
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
