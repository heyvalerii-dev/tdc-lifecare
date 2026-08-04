import { SectionHeading } from "./section-heading";
import { PsychologistCard } from "./psychologist-card";
import { homeContainer } from "./home-styles";
import type { PsychologistDisplayProfile } from "@/lib/psychologist-display";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface PsychologistsSectionProps {
  psychologists: PsychologistDisplayProfile[];
}

export function PsychologistsSection({
  psychologists,
}: PsychologistsSectionProps) {
  return (
    <section
      id="psychologists"
      className="scroll-mt-20 bg-[var(--brand-cream)] px-5 pb-14 pt-20 sm:px-8 sm:pb-20 sm:pt-24 lg:pt-14"
    >
      <div className={homeContainer}>
        <SectionHeading>Meet our psychologists</SectionHeading>
        <p
          className={cn(
            type.bodyMuted,
            type.prose,
            "mt-3 text-base leading-relaxed lg:mt-4 lg:text-lg lg:leading-[1.7]"
          )}
        >
          Finding a psychologist is personal. Take a moment to learn about each of
          us before booking.
        </p>

        <div className="mt-10 grid gap-8 lg:mt-10 lg:grid-cols-2 lg:gap-8">
          {psychologists.map((psych) => (
            <PsychologistCard key={psych.id} psych={psych} mode="link" />
          ))}
        </div>
      </div>
    </section>
  );
}
