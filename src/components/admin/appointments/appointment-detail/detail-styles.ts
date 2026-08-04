import { cn } from "@/lib/utils";

export const detailCardClass = cn(
  "overflow-hidden rounded-xl border border-[var(--brand-purple)]/[0.08] bg-white",
  "shadow-[0_4px_24px_rgba(93,80,122,0.04)]",
  "transition-all duration-200 ease-out",
  "hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(93,80,122,0.07)]"
);

export const detailCardBodyClass = "p-6";

export const detailCardHeaderClass =
  "border-b border-[var(--brand-purple)]/[0.06] px-6 py-4";

export const detailSectionTitleClass =
  "font-heading text-base font-semibold tracking-tight text-[var(--brand-text)]";

export const detailLabelClass =
  "text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80";

export const detailValueClass = "text-sm leading-snug text-[var(--brand-text)]";

export const detailMutedClass = "text-sm leading-snug text-[var(--brand-text-muted)]";

export const detailIconClass =
  "h-4 w-4 shrink-0 text-[var(--brand-purple)]/65";

export const detailStackGapClass = "space-y-6";

export const detailLinkClass = cn(
  "transition-colors duration-150 ease-out",
  "hover:text-[var(--brand-purple)] hover:underline hover:underline-offset-2"
);

export function detailMetaRowClass(className?: string) {
  return cn("flex items-start gap-3", className);
}
