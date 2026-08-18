import Link from "next/link";
import { Check } from "lucide-react";
import {
  patientCardClass,
} from "@/components/appointments/patient-styles";
import {
  homeRadiusButton,
  homeTactilePrimary,
} from "@/components/home/home-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

/** Public confirmation after a shareable-link payment. No appointment details. */
export function ShareablePaymentSuccess() {
  return (
    <div className="flex w-full justify-center md:justify-end">
      <div
        className={cn(
          patientCardClass,
          "w-full max-w-[26rem] px-6 py-9 text-center sm:px-10 sm:py-11"
        )}
      >
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-success-light)] sm:h-14 sm:w-14"
          aria-hidden
        >
          <Check
            className="h-6 w-6 text-[var(--brand-success)] sm:h-7 sm:w-7"
            strokeWidth={2.25}
          />
        </span>

        <h1 className={cn(type.pageTitle, "mt-5")}>Thank you!</h1>

        <p
          className={cn(
            type.bodyMuted,
            "mx-auto mt-2.5 max-w-sm text-[15px] leading-relaxed sm:text-base"
          )}
        >
          Your payment has been received by TDC LifeCare Psychological Center.
        </p>

        <Link
          href="/"
          className={cn(
            homeTactilePrimary,
            homeRadiusButton,
            type.button,
            "mt-7 inline-flex min-h-11 items-center justify-center px-6 py-3",
            "bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple-dark)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)] focus-visible:ring-offset-2"
          )}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export function ShareablePaymentUnavailable({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto w-full max-w-lg py-8 text-center sm:py-12">
      <h1 className={type.pageTitle}>{title}</h1>
      <p
        className={cn(
          type.bodyMuted,
          "mx-auto mt-3 max-w-md text-base sm:text-lg"
        )}
      >
        {message}
      </p>
      <Link
        href="/"
        className={cn(
          homeTactilePrimary,
          homeRadiusButton,
          type.button,
          "mt-10 inline-flex min-h-11 items-center justify-center px-6 py-3",
          "bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple-dark)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)] focus-visible:ring-offset-2"
        )}
      >
        Back to Home
      </Link>
    </div>
  );
}
