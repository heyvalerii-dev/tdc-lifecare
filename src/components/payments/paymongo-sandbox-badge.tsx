"use client";

import { FlaskConical } from "lucide-react";
import { usePublicPaymentsConfig } from "@/hooks/use-public-payments-config";
import { cn } from "@/lib/utils";

interface PayMongoSandboxBannerProps {
  className?: string;
}

/**
 * Full-width environment notice for PayMongo test mode.
 * Soft warm cream surface — informational, not a warning or alert.
 * Visually attached to the header chrome (covers the header bottom edge).
 * Renders nothing when live keys or PayMongo is disabled.
 */
export function PayMongoSandboxBanner({ className }: PayMongoSandboxBannerProps) {
  const { showSandbox } = usePublicPaymentsConfig();

  if (!showSandbox) return null;

  return (
    <div
      className={cn(
        // -mt-px tucks under the header edge. Do not raise z-index above the
        // sticky header (z-50) — that would cover header dropdowns/menus.
        "relative -mt-px w-full border-b border-[#F3D37A] bg-[#FFF8E5]",
        className
      )}
      role="status"
      aria-label="Sandbox Environment. Payments are processed using PayMongo Test Mode. No real charges will be made."
    >
      <div className="mx-auto flex items-center gap-2.5 px-5 py-2.5 sm:gap-3 sm:px-8 sm:py-3">
        <FlaskConical
          className="h-3.5 w-3.5 shrink-0 text-[#9A6B00]"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 flex-1 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-2.5">
          <p className="font-sans text-sm font-semibold leading-snug tracking-tight text-[#9A6B00]">
            Sandbox Environment
          </p>
          <p className="mt-0.5 font-sans text-xs font-normal leading-snug text-[var(--brand-text-muted)] sm:mt-0">
            Payments are processed using PayMongo Test Mode. No real charges
            will be made.
          </p>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use PayMongoSandboxBanner — kept as an alias for existing imports. */
export const PayMongoSandboxBadge = PayMongoSandboxBanner;
