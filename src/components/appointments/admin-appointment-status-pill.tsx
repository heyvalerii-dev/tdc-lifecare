import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { APPOINTMENT_STATUS_DOT_COLORS } from "@/lib/admin-calendar";
import { patientStatusStyles } from "@/components/appointments/patient-status-pill";
import { cn } from "@/lib/utils";

const adminStatusLabels: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  expired: "Expired",
};

interface AdminAppointmentStatusPillProps {
  status: string;
  className?: string;
}

export function AdminAppointmentStatusPill({
  status,
  className,
}: AdminAppointmentStatusPillProps) {
  const label =
    adminStatusLabels[status] ?? APPOINTMENT_STATUS_LABELS[status] ?? status;
  const dotColor =
    APPOINTMENT_STATUS_DOT_COLORS[status] ?? "var(--brand-text-muted)";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity duration-200",
        patientStatusStyles[status] ??
          "bg-[var(--brand-purple-light)] text-[var(--brand-text-muted)]",
        className
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      {label}
    </span>
  );
}
