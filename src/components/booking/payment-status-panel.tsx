"use client";

import { Button } from "@/components/ui/button";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface PaymentStatusPanelProps {
  variant: "checking" | "cancelled" | "timeout" | "error";
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  retryLoading?: boolean;
  className?: string;
}

export function PaymentStatusPanel({
  variant,
  message,
  onRetry,
  retryLabel = "Try again",
  retryLoading = false,
  className,
}: PaymentStatusPanelProps) {
  if (variant === "checking") {
    return <PageLoadingState className={className} />;
  }

  const title =
    variant === "cancelled"
      ? "Payment cancelled"
      : variant === "timeout"
        ? "Still confirming payment"
        : "Couldn't start payment";

  const body =
    message ??
    (variant === "cancelled"
      ? "No charge was made. You can try again whenever you're ready."
      : variant === "timeout"
        ? "We're still waiting for confirmation. You can wait a moment and try again, or return later from your appointment page."
        : "Couldn't start payment. Please try again.");

  return (
    <div
      className={cn(
        "space-y-5 rounded-xl border border-[var(--brand-purple)]/10 bg-white px-6 py-8 text-center",
        className
      )}
      role="alert"
    >
      <div className="space-y-2">
        <p className="font-heading text-lg font-semibold text-[var(--brand-text)]">
          {title}
        </p>
        <p className={cn(type.smallMuted, "mx-auto max-w-sm text-sm leading-relaxed")}>
          {body}
        </p>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} loading={retryLoading} className="min-w-[10rem]">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
