import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-[var(--brand-purple-light)] text-[var(--brand-text-muted)]",
  no_show: "bg-red-100 text-red-800",
  expired: "bg-[var(--brand-purple-light)] text-[var(--brand-text-muted)]",
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  waived: "bg-purple-100 text-purple-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
};

interface BadgeProps {
  status: string;
  label: string;
  className?: string;
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusColors[status] ?? "bg-[var(--brand-purple-light)] text-[var(--brand-text-muted)]",
        className
      )}
    >
      {label}
    </span>
  );
}
