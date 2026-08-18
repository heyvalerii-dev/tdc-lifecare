import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface PageLoadingStateProps {
  className?: string;
}

/** Centered page loading state — generic, reusable, presentational only. */
export function PageLoadingState({ className }: PageLoadingStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:py-20",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mx-auto h-11 w-11" aria-hidden>
        <span
          className={cn(
            "page-loading-dot page-loading-dot-purple",
            "absolute top-1/2 left-1/2 mt-[-3.5px] ml-[-3.5px] block size-[7px] shrink-0 rounded-full",
            "bg-[var(--brand-purple)] animate-page-loading-orbit"
          )}
        />
        <span
          className={cn(
            "page-loading-dot page-loading-dot-yellow",
            "absolute top-1/2 left-1/2 mt-[-3.5px] ml-[-3.5px] block size-[7px] shrink-0 rounded-full",
            "bg-[var(--brand-yellow)] animate-page-loading-orbit [animation-delay:-0.7s]"
          )}
        />
      </div>

      <p className={cn(type.sectionTitle, "mt-7 text-[var(--brand-purple)]")}>
        Loading…
      </p>
    </div>
  );
}
