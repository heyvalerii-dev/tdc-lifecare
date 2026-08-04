import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/** Shared surface for admin mobile list rows. */
export const adminListMobileCardClass = cn(
  "block rounded-2xl border border-[var(--brand-purple)]/[0.08] bg-white p-4",
  "shadow-[0_2px_12px_rgba(93,80,122,0.04)]",
  "transition-colors duration-150 ease-out",
  "active:bg-[var(--brand-purple-light)]/25",
  "hover:bg-[var(--brand-purple-light)]/15"
);

/** Polished mobile list cards (Calendar-style). */
export const adminListMobileCardPolishedClass = "p-5";

/** Icon column + value grid used below status pills. */
export const adminListMobileDetailsGridClass =
  "grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2";

/** Primary label — full width, no truncation (names > badges). */
export function AdminListMobileCardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-base font-semibold leading-snug text-[var(--brand-text)]",
        className
      )}
    >
      {children}
    </p>
  );
}

/** Secondary status row below the title. */
export function AdminListMobileCardStatus({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-1.5", className)}>{children}</div>;
}

/** Compact inline metadata (date • amount • badge). */
export function AdminListMobileMetaRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--brand-text-muted)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminListMobileMetaSeparator() {
  return (
    <span className="text-[var(--brand-text-muted)]/60" aria-hidden>
      •
    </span>
  );
}

export function AdminListMobileField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-[var(--brand-text)]">{children}</div>
    </div>
  );
}

interface AdminListMobileCardProps {
  href?: string;
  children: ReactNode;
  className?: string;
  /** Optional aria label when the title isn’t obvious from children. */
  "aria-label"?: string;
  /** When false, omit the trailing chevron (e.g. inline with title). Default true. */
  showChevron?: boolean;
}

export function AdminListMobileCardChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn(
        "h-5 w-5 shrink-0 text-[var(--brand-text-muted)]/70",
        className
      )}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

export function AdminListMobileCardHeader({
  title,
  className,
}: {
  title: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-2", className)}>
      <AdminListMobileCardTitle className="min-w-0 flex-1">
        {title}
      </AdminListMobileCardTitle>
      <AdminListMobileCardChevron />
    </div>
  );
}

export function AdminListMobileCardPillRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(adminListMobileDetailsGridClass, "mt-1.5", className)}>
      <div className="col-span-2 w-fit">{children}</div>
    </div>
  );
}

export function AdminListMobileDetailsRows({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(adminListMobileDetailsGridClass, "mt-5 gap-y-2", className)}
    >
      {children}
    </div>
  );
}

export function AdminListMobileInfoRow({
  icon: Icon,
  children,
  iconStyle,
  textClassName,
}: {
  icon: LucideIcon;
  children: ReactNode;
  iconStyle?: CSSProperties;
  textClassName?: string;
}) {
  return (
    <>
      <Icon
        className="h-4 w-4 shrink-0 self-center text-[var(--brand-text-muted)]"
        style={iconStyle}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className={cn("min-w-0 text-sm", textClassName)}>{children}</span>
    </>
  );
}

export function AdminListMobileCardBody({
  avatar,
  children,
}: {
  avatar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {avatar}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Fully tappable mobile list row with trailing chevron.
 * Use below the `lg` breakpoint; pair with `hidden lg:block` tables.
 */
export function AdminListMobileCard({
  href,
  children,
  className,
  "aria-label": ariaLabel,
  showChevron = true,
}: AdminListMobileCardProps) {
  const content = showChevron ? (
    <div className="flex items-stretch gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center self-center">
        <AdminListMobileCardChevron />
      </div>
    </div>
  ) : (
    children
  );

  if (!href) {
    return (
      <div
        aria-label={ariaLabel}
        className={cn(adminListMobileCardClass, "cursor-default", className)}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(adminListMobileCardClass, className)}
    >
      {content}
    </Link>
  );
}

export function AdminListMobileCardStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 lg:hidden", className)}>{children}</div>
  );
}
