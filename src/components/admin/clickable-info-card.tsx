"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  detailLabelClass,
  detailMutedClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ClickableInfoCardProps {
  href: string;
  ariaLabel: string;
  label: string;
  name: string;
  subtitle?: string;
  email?: string | null;
  avatarSrc?: string | null;
  accentColor?: string;
  showAccentDot?: boolean;
  className?: string;
}

/**
 * Navigable person/info block used on admin detail pages
 * (e.g. Client / Psychologist on Appointment Detail).
 */
export function ClickableInfoCard({
  href,
  ariaLabel,
  label,
  name,
  subtitle,
  email,
  avatarSrc,
  accentColor,
  showAccentDot = false,
  className,
}: ClickableInfoCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "group -mx-2 flex items-start gap-3 rounded-xl px-2 py-1.5",
        "cursor-pointer transition-colors duration-150 ease-out",
        "hover:bg-[var(--brand-purple-light)]/35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
        className
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={name} email={email} src={avatarSrc} size="md" />
        {showAccentDot && accentColor && (
          <span
            className="absolute bottom-0.5 right-0.5 size-2.5 rounded-full ring-2 ring-white"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
        <p className={detailLabelClass}>{label}</p>
        <p className={cn(detailValueClass, "font-medium")}>{name}</p>
        {subtitle && <p className={detailMutedClass}>{subtitle}</p>}
      </div>

      <ChevronRight
        className="mt-2 h-4 w-4 shrink-0 text-[var(--brand-text-muted)]/40 transition-colors duration-150 group-hover:text-[var(--brand-purple)]"
        strokeWidth={1.75}
        aria-hidden
      />
    </Link>
  );
}
