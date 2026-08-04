import { adminControlRadius } from "@/lib/admin-controls";
import { cn } from "@/lib/utils";

export const filterTriggerClass = cn(
  "flex h-9 w-full min-w-0 items-center justify-between gap-2 border border-[var(--brand-purple)]/12 bg-[#FCFBFF] px-2.5 text-left text-sm transition-colors duration-150 ease-out hover:border-[var(--brand-purple)]/20 hover:bg-white focus:outline-none focus-visible:border-[var(--brand-purple)]/30 focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/15",
  adminControlRadius
);

export const filterTriggerOpenClass =
  "border-[var(--brand-purple)]/25 bg-white text-[var(--brand-text)]";

export const filterOptionsPanelClass = cn(
  "max-h-72 overflow-auto rounded-xl border border-[var(--brand-purple)]/10 bg-white p-1 shadow-[0_8px_24px_rgba(93,80,122,0.12)] focus:outline-none"
);

export function filterOptionClass(focus: boolean, selected: boolean) {
  return cn(
    "flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150",
    focus && "bg-[var(--brand-purple-light)]/50",
    selected
      ? "font-medium text-[var(--brand-text)]"
      : "text-[var(--brand-text-muted)]"
  );
}

export const filterSearchInputClass = cn(
  "h-8 w-full border border-[var(--brand-purple)]/15 bg-[#FCFBFF] px-2.5 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-text-muted)] focus:border-[var(--brand-purple)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/10",
  adminControlRadius
);
