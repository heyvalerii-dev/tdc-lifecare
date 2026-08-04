import { cn } from "@/lib/utils";

interface BookingBackLinkProps {
  onClick: () => void;
  className?: string;
}

export function BookingBackLink({ onClick, className }: BookingBackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 font-sans text-[15px] font-medium text-[var(--brand-purple)]/75 transition-colors hover:text-[var(--brand-purple)]",
        className
      )}
    >
      <span aria-hidden>←</span>
      Back
    </button>
  );
}
