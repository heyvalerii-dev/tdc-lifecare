import { cn } from "@/lib/utils";

/** Reusable typography tokens — Plus Jakarta Sans (headings) + Inter (body) */
export const type = {
  display:
    "font-heading text-[2rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[2.5rem] sm:leading-[1.1] sm:tracking-[-0.03em] lg:text-[60px]",
  /** Homepage — hero eyebrow above the main headline */
  heroEyebrow:
    "font-sans text-base font-medium leading-normal tracking-normal text-[var(--brand-text-muted)] lg:text-lg",
  pageTitle:
    "font-heading text-[32px] font-bold leading-[1.2] tracking-tight text-[var(--brand-text)] sm:text-[36px]",
  sectionTitle:
    "font-heading text-2xl font-semibold leading-[1.3] tracking-tight text-[var(--brand-text)] lg:text-[28px] lg:font-bold lg:leading-[1.25]",
  cardTitle:
    "font-heading text-2xl font-semibold leading-[1.25] tracking-[-0.02em] text-[var(--brand-text)] sm:text-[28px]",
  body: "font-sans text-lg font-normal leading-[1.7] text-[var(--brand-text)]",
  bodyMuted: "font-sans text-lg font-normal leading-[1.7] text-[var(--brand-text-muted)]",
  small: "font-sans text-[15px] font-medium leading-normal text-[var(--brand-text)]",
  smallMuted: "font-sans text-[15px] font-medium leading-normal text-[var(--brand-text-muted)]",
  label: "font-sans text-[15px] font-semibold leading-normal text-[var(--brand-text)]",
  nav: "font-sans text-sm font-medium",
  button: "font-sans text-base font-semibold",
  specialties: "font-sans text-lg font-normal leading-[1.7] text-[var(--brand-text)]/85",
  progressStep: "font-sans text-[15px] font-medium text-[var(--brand-text-muted)]",
  progressLabel: "font-sans text-[15px] font-medium text-[var(--brand-text)]",
  prose: "max-w-[600px]",
  /** Homepage — service row titles */
  serviceTitle:
    "font-heading text-[26px] font-semibold leading-[1.25] tracking-[-0.02em] text-[var(--brand-text)] sm:text-[28px]",
  /** Homepage — mobile service items */
  serviceTitleMobile:
    "font-heading text-xl font-semibold leading-snug tracking-tight text-[var(--brand-text)]",
  /** Homepage — FAQ questions */
  faqQuestion:
    "font-heading text-xl font-semibold leading-[1.35] tracking-tight lg:text-2xl lg:leading-[1.3]",
  /** Homepage — FAQ answers */
  faqAnswer:
    "font-sans text-base font-normal leading-[1.75] text-[var(--brand-text)]/85 lg:text-lg lg:leading-[1.7]",
  /** Homepage — closing CTA headline */
  ctaClosing:
    "font-heading text-[38px] font-semibold leading-[1.15] tracking-tight text-[var(--brand-text)] sm:text-[44px] lg:text-[48px]",
} as const;

export function proseWrap(...classes: (string | undefined)[]) {
  return cn(type.prose, ...classes);
}
