import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const paymentStatusStyles: Record<string, string> = {
  pending: "bg-[#FAF3DC] text-[#9A7B1A]",
  paid: "bg-[#F0F5F1] text-[#5C7A68]",
  waived: "bg-[var(--brand-purple-light)] text-[var(--brand-purple)]",
  failed: "bg-[#FCF4F5] text-[#8C5C68]",
  refunded: "bg-[var(--brand-border)]/60 text-[var(--brand-text-muted)]",
  expired: "bg-[var(--brand-border)]/60 text-[var(--brand-text-muted)]",
};

interface PaymentStatusPillProps {
  status: string;
  className?: string;
}

export function PaymentStatusPill({ status, className }: PaymentStatusPillProps) {
  const label = PAYMENT_STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-opacity duration-200",
        paymentStatusStyles[status] ??
          "bg-[var(--brand-purple-light)] text-[var(--brand-text-muted)]",
        className
      )}
    >
      {label}
    </span>
  );
}
