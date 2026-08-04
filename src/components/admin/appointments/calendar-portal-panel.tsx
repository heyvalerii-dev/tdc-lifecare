import { cn } from "@/lib/utils";

interface CalendarPortalPanelProps {
  accentColor: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Shared floating panel shell for scheduler hover cards. */
export function CalendarPortalPanel({
  accentColor,
  children,
  className,
  bodyClassName,
}: CalendarPortalPanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--brand-purple)]/[0.08] bg-white shadow-[0_4px_20px_rgba(93,80,122,0.10)]",
        className
      )}
    >
      <div className="flex gap-3 p-3">
        <div
          className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
        <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
