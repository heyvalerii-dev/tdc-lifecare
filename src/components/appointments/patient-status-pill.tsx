import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const patientStatusStyles: Record<string, string> = {
  pending_payment: "bg-[#FAF3DC] text-[#9A7B1A]",
  confirmed: "bg-[var(--brand-purple-light)] text-[var(--brand-purple)]",
  completed: "bg-[#F0F5F1] text-[#5C7A68]",
  cancelled: "bg-[var(--brand-border)]/60 text-[var(--brand-text-muted)]",
  no_show: "bg-[var(--brand-border)]/60 text-[var(--brand-text-muted)]",
  expired: "bg-[var(--brand-border)]/60 text-[var(--brand-text-muted)]",
};

const dashboardStatusLabels: Record<string, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  expired: "Expired",
};

const detailStatusLabels: Record<string, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  expired: "Expired",
};

interface PatientStatusPillProps {
  status: string;
  variant?: "dashboard" | "detail";
  className?: string;
}

export function PatientStatusPill({
  status,
  variant = "dashboard",
  className,
}: PatientStatusPillProps) {
  const labels = variant === "detail" ? detailStatusLabels : dashboardStatusLabels;
  const label = labels[status] ?? APPOINTMENT_STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        patientStatusStyles[status] ??
          "bg-[var(--brand-purple-light)] text-[var(--brand-text-muted)]",
        className
      )}
    >
      {label}
    </span>
  );
}
