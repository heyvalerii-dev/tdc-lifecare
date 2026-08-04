import {
  CalendarCheck,
  ClipboardList,
  HeartHandshake,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { homeContainer, homeIconStroke, homeStepCard } from "./home-styles";
import { cn } from "@/lib/utils";

const steps: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: UserRound,
    title: "Choose your psychologist",
    detail: "Explore our psychologists and choose who you'd like to work with.",
  },
  {
    icon: CalendarCheck,
    title: "Choose a service & appointment",
    detail: "Select a service, then choose an available date and time.",
  },
  {
    icon: ClipboardList,
    title: "Complete your intake",
    detail: "Fill out a short, secure intake form from home.",
  },
  {
    icon: HeartHandshake,
    title: "Attend your session",
    detail: "You're all set. We'll take it from there.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white px-5 pb-20 pt-12 sm:px-8 sm:py-16 lg:py-16">
      <div className={homeContainer}>
        <SectionHeading>Getting started</SectionHeading>

        {/* Mobile — vertical timeline */}
        <ol className="relative mt-10 lg:hidden">
          {steps.map(({ icon: Icon, title, detail }, index) => (
            <li
              key={title}
              className="relative flex gap-5 pb-10 last:pb-0"
            >
              {index < steps.length - 1 && (
                <div
                  className="absolute top-9 left-4 h-[calc(100%-2.25rem)] w-px bg-[var(--brand-border)]"
                  aria-hidden="true"
                />
              )}

              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--brand-purple)]/20 bg-white text-xs font-semibold text-[var(--brand-purple)]">
                {index + 1}
              </div>

              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <Icon
                    className="h-4 w-4 text-[var(--brand-purple)]"
                    strokeWidth={homeIconStroke}
                  />
                  <h3 className="text-[15px] font-medium leading-snug text-[var(--brand-text)]">
                    {title}
                  </h3>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--brand-text-muted)]">
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop — milestone cards with subtle connector */}
        <div className="relative mt-10 hidden lg:block">
          <div
            className="pointer-events-none absolute top-[2.75rem] right-[6%] left-[6%] h-px bg-[#E8E6ED]"
            aria-hidden="true"
          />
          <ol className="relative z-10 grid grid-cols-4 gap-5">
            {steps.map(({ icon: Icon, title, detail }, index) => (
              <li
                key={title}
                className={cn(homeStepCard, "group flex h-full flex-col")}
              >
                <Icon
                  className="h-7 w-7 text-[var(--brand-purple)] transition-transform duration-[250ms] ease-out group-hover:scale-105"
                  strokeWidth={homeIconStroke}
                />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#F2C94C]">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-sm font-medium text-[var(--brand-text)]">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--brand-text-muted)]">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-xs text-[var(--brand-text-muted)] lg:mt-10 lg:text-center">
          Appointments are confirmed after payment.
        </p>
      </div>
    </section>
  );
}
