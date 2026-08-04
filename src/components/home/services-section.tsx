import {
  Brain,
  ClipboardList,
  Clock,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import {
  homeContainer,
  homeIconStroke,
  homeServiceItemMobile,
  homeServiceRow,
} from "./home-styles";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const services: { title: string; duration: string; icon: LucideIcon }[] = [
  { title: "Individual Counseling", duration: "60 minutes", icon: MessageCircle },
  { title: "Initial Consultation", duration: "45 minutes", icon: ClipboardList },
  { title: "Psychological Assessment", duration: "Half day", icon: Brain },
  { title: "Couples Therapy", duration: "90 minutes", icon: Users },
];

export function ServicesSection() {
  return (
    <section className="relative bg-white px-5 pb-16 pt-20 sm:px-8 sm:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute top-8 right-6 left-6 h-px bg-gradient-to-r from-transparent via-[var(--brand-border)] to-transparent lg:hidden"
        aria-hidden="true"
      />

      <div className={homeContainer}>
        <SectionHeading>Services</SectionHeading>

        {/* Mobile — card list */}
        <ul className="mt-8 flex flex-col gap-3 lg:hidden">
          {services.map(({ icon: Icon, title, duration }) => (
            <li key={title}>
              <div className={homeServiceItemMobile}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-cream)]">
                  <Icon
                    className="h-[18px] w-[18px] text-[var(--brand-purple)]"
                    strokeWidth={homeIconStroke}
                  />
                </div>
                <p className={type.serviceTitleMobile}>{title}</p>
                <p className="flex items-center gap-1.5 text-sm text-[var(--brand-text-muted)]/70">
                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={homeIconStroke} />
                  {duration}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop — horizontal row list */}
        <ul className="mt-10 hidden divide-y divide-[var(--brand-border)] lg:block">
          {services.map(({ icon: Icon, title, duration }) => (
            <li key={title}>
              <div className={homeServiceRow}>
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-cream)] transition-colors duration-[250ms] ease-out",
                    "group-hover:bg-[var(--brand-purple-light)]"
                  )}
                >
                  <Icon
                    className="h-5 w-5 text-[var(--brand-purple)]"
                    strokeWidth={homeIconStroke}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      type.serviceTitle,
                      "transition-colors duration-[250ms] ease-out group-hover:text-[var(--brand-purple)]"
                    )}
                  >
                    {title}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-[var(--brand-text-muted)]/65">
                  {duration}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
