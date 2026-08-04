"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";
import { homeContainer, homeIconStroke, homeSectionTint } from "./home-styles";
import { type } from "@/lib/typography";

const faqs = [
  {
    question: "Is counseling confidential?",
    answer: "Yes — fully. What you share stays between you and your psychologist.",
  },
  {
    question: "How long is a session?",
    answer: "Most sessions are 45–60 minutes. Your booking confirmation will show the exact duration.",
  },
  {
    question: "What happens at the first appointment?",
    answer: "A relaxed conversation about what brings you in. No pressure, no judgment — just listening.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={`${homeSectionTint} px-5 py-16 sm:px-8 sm:py-20 lg:py-24`}>
      <div className={`${homeContainer} max-w-3xl`}>
        <SectionHeading>Common questions</SectionHeading>

        <div className="mt-8 space-y-3 lg:mt-10 lg:space-y-1">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className={cn(
                  "overflow-hidden rounded-2xl transition-colors duration-300 ease-out lg:rounded-none",
                  "border-b border-[var(--brand-border)] last:border-b-0 lg:border-b",
                  isOpen && "bg-white/70 lg:bg-transparent"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex min-h-11 w-full items-center justify-between gap-4 px-4 py-5 text-left sm:gap-6 sm:py-6 lg:px-0"
                  aria-expanded={isOpen}
                >
                  <span
                    className={cn(
                      type.faqQuestion,
                      "pr-2 transition-colors duration-300 ease-out lg:pr-0",
                      isOpen
                        ? "text-[var(--brand-text)]"
                        : "text-[var(--brand-text)]/70 lg:text-[var(--brand-text)]"
                    )}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 transition-all duration-500 ease-in-out lg:duration-300",
                      isOpen
                        ? "rotate-180 text-[var(--brand-purple)]"
                        : "text-[var(--brand-text-muted)]"
                    )}
                    strokeWidth={homeIconStroke}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-in-out lg:duration-300 lg:ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p
                      className={cn(
                        type.faqAnswer,
                        "px-4 pb-7 pt-1 transition-opacity duration-500 ease-in-out lg:px-0 lg:pb-7 lg:pt-0 lg:duration-300 lg:ease-out",
                        isOpen ? "opacity-100 delay-100 lg:delay-75" : "opacity-0"
                      )}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
