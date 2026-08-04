"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ban,
  Bell,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Pencil,
  UserX,
} from "lucide-react";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailLabelClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

interface AppointmentDetailActionsProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  rescheduleHref: string;
  showMarkPayment: boolean;
  showMarkCompleted: boolean;
  showNoShow: boolean;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  loading,
  disabled,
  destructive,
  href,
  tier = "secondary",
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  href?: string;
  tier?: "primary" | "secondary" | "disabled";
}) {
  const className = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
    tier === "primary" &&
      "font-medium text-[var(--brand-text)] hover:bg-[var(--brand-purple-light)]/55",
    tier === "secondary" &&
      "font-medium text-[var(--brand-text-muted)] hover:bg-[var(--brand-purple-light)]/35 hover:text-[var(--brand-text)]",
    tier === "disabled" && "cursor-not-allowed font-medium text-[var(--brand-text-muted)]/55",
    destructive &&
      "font-medium text-red-600 hover:bg-red-50 disabled:hover:bg-transparent",
    loading && "cursor-wait",
    disabled && tier !== "disabled" && "cursor-not-allowed opacity-50"
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="flex-1">{loading ? "Working…" : label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || loading || tier === "disabled"}
    >
      {content}
    </button>
  );
}

export function AppointmentDetailActions({
  appointmentId,
  currentStatus,
  rescheduleHref,
  showMarkPayment,
  showMarkCompleted,
  showNoShow,
}: AppointmentDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const isTerminal = ["completed", "cancelled", "no_show", "expired"].includes(
    currentStatus
  );

  async function updateStatus(status: AppointmentStatus) {
    const type =
      status === "completed"
        ? "complete"
        : status === "cancelled"
          ? "cancel"
          : status === "no_show"
            ? "no_show"
            : null;
    if (!type) return;

    setLoading(status);
    try {
      const res = await fetch(
        `/api/admin/appointments/${appointmentId}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn't update"
        );
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function markPaymentReceived() {
    setLoading("payment");
    try {
      const res = await fetch(
        `/api/admin/appointments/${appointmentId}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "mark_payment_received" }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn't update payment"
        );
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Actions</h2>
      </div>
      <div className={cn(detailCardBodyClass, "space-y-4")}>
        <div className="space-y-0.5">
          <ActionButton
            icon={Pencil}
            label="Edit Appointment"
            href={rescheduleHref}
            disabled={isTerminal}
            tier="primary"
          />
          <ActionButton
            icon={CalendarClock}
            label="Reschedule"
            href={rescheduleHref}
            disabled={isTerminal}
            tier="primary"
          />
        </div>

        <div className="space-y-0.5 border-t border-[var(--brand-purple)]/[0.06] pt-4">
          {showMarkPayment && (
            <ActionButton
              icon={CreditCard}
              label="Mark Payment Received"
              onClick={markPaymentReceived}
              loading={loading === "payment"}
              tier="secondary"
            />
          )}
          {showMarkCompleted && (
            <ActionButton
              icon={CheckCircle2}
              label="Mark Completed"
              onClick={() => updateStatus("completed")}
              loading={loading === "completed"}
              tier="secondary"
            />
          )}
          {showNoShow && (
            <ActionButton
              icon={UserX}
              label="Mark No Show"
              onClick={() => updateStatus("no_show")}
              loading={loading === "no_show"}
              tier="secondary"
            />
          )}
          <ActionButton icon={Bell} label="Send Reminder" tier="disabled" disabled />
        </div>

        {!isTerminal && (
          <div className="space-y-2 border-t border-[var(--brand-purple)]/[0.06] pt-4">
            <p className={detailLabelClass}>Danger Zone</p>
            <ActionButton
              icon={Ban}
              label="Cancel Appointment"
              onClick={() => updateStatus("cancelled")}
              loading={loading === "cancelled"}
              destructive
            />
          </div>
        )}
      </div>
    </section>
  );
}
