"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Brain, Check } from "lucide-react";
import { homeRadiusCard, homeRadiusButton, homeCardHover } from "./home-styles";
import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";
import type { PsychologistDisplayProfile } from "@/lib/psychologist-display";

interface PsychologistCardProps {
  psych: PsychologistDisplayProfile;
  mode?: "link" | "select";
  selected?: boolean;
  onSelect?: () => void;
}

const outlineCtaClasses = cn(
  type.button,
  homeRadiusButton,
  "min-h-11 items-center justify-center gap-1.5 border border-[var(--brand-purple)]/15 px-4 py-2.5 text-[var(--brand-purple)] shadow-[0_1px_2px_rgba(45,38,64,0.04)] transition-all duration-[250ms] ease-out",
  "hover:-translate-y-0.5 hover:border-[var(--brand-purple)]/45 hover:text-[var(--brand-purple-dark)] hover:shadow-[0_4px_12px_rgba(45,38,64,0.08)]"
);

const selectedCtaClasses = cn(
  type.button,
  homeRadiusButton,
  "inline-flex min-h-11 cursor-default items-center justify-center gap-1.5 bg-[var(--brand-purple)] px-4 py-2.5 text-white shadow-[0_1px_2px_rgba(45,38,64,0.06)]"
);

export function PsychologistCard({
  psych,
  mode = "link",
  selected = false,
  onSelect,
}: PsychologistCardProps) {
  const isSelect = mode === "select";

  const cardClasses = cn(
    homeRadiusCard,
    "border bg-white transition-all duration-[225ms] ease-out",
    isSelect && "flex h-full cursor-pointer flex-col",
    isSelect && selected
      ? "border-[var(--brand-purple)] shadow-[0_8px_24px_rgba(93,80,122,0.1)] -translate-y-0.5"
      : isSelect
        ? "border-[var(--brand-border)] shadow-[0_1px_2px_rgba(45,38,64,0.04)]"
        : cn(
            "group relative border-[var(--brand-border)] shadow-[0_1px_2px_rgba(45,38,64,0.04)]",
            homeCardHover
          )
  );

  const specialtiesBlock = (
    <div>
      <p
        className={cn(
          type.label,
          "flex items-center justify-center gap-1.5 lg:justify-start"
        )}
      >
        <Brain className="h-4 w-4 opacity-70" strokeWidth={1.5} aria-hidden="true" />
        Specializes in
      </p>
      <p className={cn(type.specialties, "mt-3")}>{psych.focusAreas.join(" · ")}</p>
    </div>
  );

  function renderCta(mobile: boolean) {
    const widthClass = mobile ? "w-full" : "w-fit";

    if (!isSelect) {
      return (
        <Link
          href={`/book?psychologist=${psych.slug}`}
          className={cn(outlineCtaClasses, "group/btn inline-flex", widthClass)}
          onClick={(e) => e.stopPropagation()}
        >
          Book with {psych.firstName}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 ease-out group-hover/btn:translate-x-[3px] lg:h-3.5 lg:w-3.5"
            strokeWidth={1.5}
          />
        </Link>
      );
    }

    if (selected) {
      return (
        <span className={cn(selectedCtaClasses, widthClass)} aria-disabled="true">
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Selected
        </span>
      );
    }

    return (
      <span className={cn(outlineCtaClasses, "inline-flex", widthClass)}>
        Select psychologist
        <ArrowRight className="h-4 w-4 lg:h-3.5 lg:w-3.5" strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }

  const ctaFooter = (mobile: boolean) => (
    <div className={cn("mt-5 w-full border-t border-[var(--brand-border)] pt-5", !mobile && "lg:w-auto")}>
      {renderCta(mobile)}
    </div>
  );

  return (
    <article
      className={cardClasses}
      onClick={isSelect ? onSelect : undefined}
      onKeyDown={
        isSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      role={isSelect ? "button" : undefined}
      tabIndex={isSelect ? 0 : undefined}
      aria-pressed={isSelect ? selected : undefined}
    >
      {/* Mobile — centered composition (shared by homepage & booking) */}
      <div className="flex flex-col items-center px-6 py-8 text-center lg:hidden">
        <div className="relative h-[112px] w-[112px] overflow-hidden rounded-full border-2 border-white shadow-[0_2px_12px_rgba(45,38,64,0.1)]">
          <Image
            src={psych.photo}
            alt={psych.name}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>

        <h3 className={cn(type.cardTitle, "mt-6")}>{psych.name}</h3>
        <p className={cn(type.smallMuted, "mt-2")}>{psych.credentials}</p>
        <p className={cn(type.bodyMuted, "mt-5")}>{psych.intro}</p>

        <div className="mt-6 w-full">{specialtiesBlock}</div>

        {ctaFooter(true)}
      </div>

      {/* Desktop — horizontal composition (shared by homepage & booking) */}
      <div className="relative hidden p-6 sm:p-8 lg:block">
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
          <div className="relative h-[88px] w-[88px] overflow-hidden rounded-full border-2 border-white shadow-[0_2px_10px_rgba(45,38,64,0.1)] sm:h-24 sm:w-24">
            <Image
              src={psych.photo}
              alt={psych.name}
              fill
              sizes="(max-width: 640px) 88px, 96px"
              className={cn(
                "object-cover",
                !isSelect && "transition-transform duration-300 group-hover:scale-[1.016]"
              )}
            />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col pr-[7.5rem] sm:pr-[8.5rem]">
          <h3 className={type.cardTitle}>{psych.name}</h3>
          <p className={cn(type.smallMuted, "mt-2")}>{psych.credentials}</p>
          <p className={cn(type.bodyMuted, "mt-5")}>{psych.intro}</p>

          <div className="mt-6 flex-1">{specialtiesBlock}</div>

          {ctaFooter(false)}
        </div>
      </div>
    </article>
  );
}
