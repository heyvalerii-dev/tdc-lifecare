"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import {
  Brain,
  Calendar,
  Clock,
  Copy,
  Share2,
  Timer,
  User,
} from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { PatientStatusPill } from "@/components/appointments/patient-status-pill";
import { patientCardClass, patientCardInner } from "@/components/appointments/patient-styles";
import { PaymentStatusPanel } from "@/components/booking/payment-status-panel";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { SandboxPaymentAlert } from "@/components/payments/sandbox-payment-alert";
import { Button } from "@/components/ui/button";
import { useCheckoutPayment } from "@/hooks/use-checkout-payment";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { CHECKOUT_START_ERROR } from "@/lib/payments/client";
import { formatClinicDate, formatClinicTime, formatClinicDateTime } from "@/lib/datetime";
import { type } from "@/lib/typography";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/database";
import type { LucideIcon } from "lucide-react";

interface PatientAppointmentDetailProps {
  appointment: AppointmentWithRelations;
  paymentUrl: string;
  showBackLink?: boolean;
}

const sectionTitleClass = cn(
  type.sectionTitle,
  "text-xl sm:text-2xl lg:text-2xl lg:font-semibold"
);

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-purple)]/70"
        strokeWidth={1.75}
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <p className="font-sans text-xs font-medium text-[var(--brand-text-muted)]">{label}</p>
        <p className="font-sans text-base font-medium text-[var(--brand-text)]">{value}</p>
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon
        className="h-4 w-4 shrink-0 text-[var(--brand-purple)]/70"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="font-sans text-base font-normal text-[var(--brand-text-muted)]">
        {children}
      </span>
    </div>
  );
}

export function PatientAppointmentDetail({
  appointment,
  paymentUrl,
  showBackLink = true,
}: PatientAppointmentDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnHandledRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [confirmedLocally, setConfirmedLocally] = useState(false);

  const {
    phase: checkoutPhase,
    error: checkoutError,
    isBusy,
    beginCheckout,
    beginPolling,
    markCancelled,
    resetToIdle,
  } = useCheckoutPayment({
    appointmentId: appointment.id,
    returnTo: "pay",
    onConfirmed: () => {
      setConfirmedLocally(true);
      router.replace(`/pay/${appointment.id}`);
      router.refresh();
    },
  });

  useEffect(() => {
    if (returnHandledRef.current) return;

    const success = searchParams.get("success") === "true";
    const cancelled = searchParams.get("cancelled") === "true";

    if (success) {
      returnHandledRef.current = true;
      void beginPolling(appointment.id);
      return;
    }

    if (cancelled) {
      returnHandledRef.current = true;
      markCancelled();
      router.replace(`/pay/${appointment.id}`);
    }
  }, [appointment.id, beginPolling, markCancelled, router, searchParams]);

  const payment = appointment.payment;
  const isPaid =
    confirmedLocally ||
    appointment.status === "confirmed" ||
    payment?.status === "paid" ||
    payment?.status === "waived";
  const isExpired =
    appointment.status === "expired" || payment?.status === "expired";
  const needsPayment =
    appointment.status === "pending_payment" &&
    !isPaid &&
    !isExpired &&
    checkoutPhase !== "checking";
  const displayStatus = confirmedLocally ? "confirmed" : appointment.status;

  const serviceName = appointment.service?.name ?? "Appointment";
  const psychologistName = appointment.psychologist?.name ?? "Psychologist";
  const dateLabel = formatClinicDate(appointment.start_at, "EEEE, MMMM d, yyyy");
  const timeLabel = formatClinicTime(appointment.start_at);
  const priceCents = appointment.service?.price_cents ?? 0;
  const durationLabel = appointment.service
    ? formatDuration(appointment.service.duration_minutes)
    : null;
  const paymentStatusLabel =
    PAYMENT_STATUS_LABELS[payment?.status ?? "pending"] ??
    payment?.status ??
    "Pending";
  const paymentDeadlineLabel = appointment.payment_due_at
    ? formatClinicDateTime(appointment.payment_due_at)
    : null;

  async function handleCopy() {
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: "Appointment Payment",
        text: "Please complete payment for this psychology appointment.",
        url: paymentUrl,
      });
    } else {
      handleCopy();
    }
  }

  async function handlePay() {
    await beginCheckout();
  }

  if (
    checkoutPhase === "checking" ||
    (searchParams.get("success") === "true" && checkoutPhase === "idle" && !isPaid)
  ) {
    return <PageLoadingState />;
  }

  return (
    <div>
      {showBackLink && (
        <Link
          href="/client/dashboard"
          className="inline-flex items-center gap-1 font-sans text-sm font-medium text-[var(--brand-purple)]/75 transition-colors hover:text-[var(--brand-purple)]"
        >
          <span aria-hidden>←</span>
          Back
        </Link>
      )}

      {/* Page header */}
      <div className={cn("space-y-3", showBackLink && "mt-6")}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className={type.pageTitle}>Appointment</h1>
          <PatientStatusPill status={displayStatus} variant="detail" />
        </div>
        <p className={cn("font-sans text-base font-normal text-[var(--brand-text-muted)]", type.prose)}>
          View your appointment details.
        </p>
      </div>

      {/* Group 1 — summary & payment */}
      <div className="mt-8 space-y-4 sm:space-y-5">
        {/* Summary card */}
        <div className={cn(patientCardClass, patientCardInner, "space-y-5 bg-[#FCFAFF]")}>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-[var(--brand-text)] sm:text-[22px]">
            {serviceName}
          </h2>
          <div className="space-y-3">
            <SummaryRow icon={User}>{psychologistName}</SummaryRow>
            <SummaryRow icon={Calendar}>{dateLabel}</SummaryRow>
            <SummaryRow icon={Clock}>{timeLabel} (Philippine Time)</SummaryRow>
            {durationLabel && <SummaryRow icon={Timer}>{durationLabel}</SummaryRow>}
          </div>
        </div>

        {isPaid && (
          <div className={cn(patientCardClass, patientCardInner, "border-[var(--brand-purple)]/15 bg-[#FCFAFF]")}>
            <h2 className={sectionTitleClass}>Payment received</h2>
            <p className="mt-2 font-sans text-base font-normal leading-relaxed text-[var(--brand-text-muted)]">
              Your appointment is confirmed. We look forward to seeing you.
            </p>
          </div>
        )}

        {checkoutPhase === "cancelled" && !isPaid && (
          <PaymentStatusPanel
            variant="cancelled"
            onRetry={() => {
              resetToIdle();
              void handlePay();
            }}
            retryLabel="Pay again"
            retryLoading={isBusy}
          />
        )}

        {checkoutPhase === "timeout" && !isPaid && (
          <PaymentStatusPanel
            variant="timeout"
            message={checkoutError}
            onRetry={() => void beginPolling(appointment.id)}
            retryLabel="Check again"
            retryLoading={isBusy}
          />
        )}

        {checkoutPhase === "error" && !isPaid && (
          <PaymentStatusPanel
            variant="error"
            message={checkoutError ?? CHECKOUT_START_ERROR}
            onRetry={() => {
              resetToIdle();
              void handlePay();
            }}
            retryLabel="Try again"
            retryLoading={isBusy}
          />
        )}

        {isExpired && (
          <AuthAlert message="This payment link has expired." />
        )}

        {needsPayment &&
          checkoutPhase !== "cancelled" &&
          checkoutPhase !== "timeout" &&
          checkoutPhase !== "error" && (
          <div
            className={cn(
              patientCardClass,
              patientCardInner,
              "border-[#F0E6C8] bg-[#FAF8F0]"
            )}
          >
            <h2 className={cn(sectionTitleClass, "text-[#9A7B1A]")}>Payment Required</h2>
            <p className="mt-2 font-sans text-base font-normal leading-relaxed text-[var(--brand-text-muted)]">
              Your appointment is temporarily reserved.
              {paymentDeadlineLabel && (
                <>
                  {" "}
                  Complete payment before{" "}
                  <span className="font-medium text-[var(--brand-text)]">
                    {paymentDeadlineLabel}
                  </span>{" "}
                  to secure your schedule.
                </>
              )}
            </p>
          </div>
        )}

        {needsPayment &&
          checkoutPhase !== "cancelled" &&
          checkoutPhase !== "timeout" &&
          checkoutPhase !== "error" && (
          <div className={cn(patientCardClass, patientCardInner, "space-y-6 text-center sm:text-left")}>
            <div className="space-y-2">
              <p className="font-heading text-5xl font-semibold tracking-tight text-[var(--brand-purple)] sm:text-[3.25rem]">
                {formatCurrency(priceCents)}
              </p>
              <p className="font-sans text-xs font-medium text-[var(--brand-text-muted)]">
                Amount Due
              </p>
            </div>
            <SandboxPaymentAlert />
            <Button
              onClick={handlePay}
              loading={isBusy}
              disabled={isBusy}
              size="lg"
              className="w-full sm:max-w-xs"
            >
              {isBusy ? "Redirecting to PayMongo…" : "Pay with PayMongo"}
            </Button>
            <p className="font-sans text-sm font-normal text-[var(--brand-text-muted)]">
              Complete your payment securely using PayMongo. After payment we&apos;ll
              automatically confirm your appointment.
            </p>
          </div>
        )}
      </div>

      {/* Group 2 — details & sharing */}
      <div className="mt-12 space-y-4 sm:mt-14 sm:space-y-5">
        <div className={cn(patientCardClass, patientCardInner)}>
          <h2 className={sectionTitleClass}>Appointment Details</h2>
          <div className="mt-5 space-y-4">
            <DetailRow icon={User} label="Psychologist" value={psychologistName} />
            <DetailRow icon={Calendar} label="Date" value={dateLabel} />
            <DetailRow icon={Clock} label="Time" value={`${timeLabel} (Philippine Time)`} />
            <DetailRow icon={Brain} label="Service" value={serviceName} />
            <DetailRow icon={Timer} label="Amount" value={formatCurrency(priceCents)} />
            <DetailRow icon={Clock} label="Payment Status" value={paymentStatusLabel} />
            {paymentDeadlineLabel && (
              <DetailRow icon={Clock} label="Payment Deadline" value={paymentDeadlineLabel} />
            )}
            {durationLabel && (
              <DetailRow icon={Timer} label="Duration" value={durationLabel} />
            )}
          </div>
        </div>

        {needsPayment && (
          <div className={cn(patientCardClass, patientCardInner, "space-y-6")}>
            <div className="space-y-2 text-center sm:text-left">
              <h2 className={sectionTitleClass}>Share Payment</h2>
              <p className="font-sans text-base font-normal leading-relaxed text-[var(--brand-text-muted)]">
                If someone else will be paying for your appointment, they can scan this QR code
                or use the payment link below.
              </p>
            </div>

            <div className="flex justify-center py-2">
              <div className="rounded-xl border border-[#E8E2F2] bg-white p-5">
                <QRCode value={paymentUrl} size={180} />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={isBusy}
                className="sm:min-w-[10rem]"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isBusy}
                className="sm:min-w-[10rem]"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
