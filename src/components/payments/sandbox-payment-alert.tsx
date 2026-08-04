"use client";

import { FlaskConical } from "lucide-react";
import { usePublicPaymentsConfig } from "@/hooks/use-public-payments-config";
import { cn } from "@/lib/utils";

interface SandboxPaymentAlertProps {
  className?: string;
}

/**
 * Subtle informational notice for the booking payment step in sandbox mode.
 * Matches the warm environment banner palette (not a warning).
 */
export function SandboxPaymentAlert({ className }: SandboxPaymentAlertProps) {
  const { showSandbox } = usePublicPaymentsConfig();

  if (!showSandbox) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#F3D37A] bg-[#FFF8E5] px-4 py-3 sm:px-5",
        className
      )}
      role="status"
    >
      <div className="flex gap-2.5">
        <FlaskConical
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6B00]"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 space-y-0.5">
          <p className="font-sans text-sm font-semibold tracking-tight text-[#9A6B00]">
            Sandbox Environment
          </p>
          <p className="font-sans text-xs font-normal leading-relaxed text-[var(--brand-text-muted)]">
            You&apos;re testing the clinic&apos;s online payment system.
            Payments are processed through PayMongo Test Mode and no real
            charges will be made.
          </p>
        </div>
      </div>
    </div>
  );
}
