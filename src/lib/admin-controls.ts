/** Shared interactive control styling for admin surfaces. */
export const adminControlRadius = "rounded-xl";

export const adminActionButtonBase =
  "inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-2";

export const adminSecondaryButtonClass = `${adminActionButtonBase} ${adminControlRadius} border border-[var(--brand-purple)]/25 bg-white text-[var(--brand-purple)] hover:bg-[var(--brand-purple-light)]/50`;

export const adminPrimaryButtonClass = `${adminActionButtonBase} ${adminControlRadius} bg-[var(--brand-purple)] text-white hover:bg-[var(--brand-purple-dark)]`;

export const adminIconButtonClass =
  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--brand-purple)]/20 bg-white text-[var(--brand-text-muted)] transition-colors duration-150 ease-out hover:border-[var(--brand-purple)]/40 hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/20 disabled:cursor-not-allowed disabled:opacity-40";

export const adminControlInputClass =
  "h-9 rounded-xl border border-[var(--brand-purple)]/20 bg-white text-sm text-[var(--brand-text)] transition-colors duration-150 ease-out focus:border-[var(--brand-purple)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-purple)]/15";
