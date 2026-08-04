import { differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  Banknote,
  CalendarDays,
  Check,
  Circle,
  Clock,
  CreditCard,
  Timer,
} from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { EntityActivityTimeline } from "@/components/admin/entity-activity-timeline";
import { AppointmentCommentsCard } from "@/components/admin/appointments/appointment-detail/appointment-comments-card";
import { AppointmentDetailActions } from "@/components/admin/appointments/appointment-detail/appointment-detail-actions";
import { AppointmentQuestionnaireCard } from "@/components/admin/appointments/appointment-detail/appointment-questionnaire-card";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailIconClass,
  detailLabelClass,
  detailMetaRowClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailStackGapClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { ClickableInfoCard } from "@/components/admin/clickable-info-card";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import { PaymentStatusPill } from "@/components/appointments/payment-status-pill";
import { TimezoneNotice } from "@/components/layout/timezone-notice";
import {
  APPOINTMENT_STATUS_DOT_COLORS,
  buildManualBookingUrl,
  getPsychologistIdentityColorById,
} from "@/lib/admin-calendar";
import type { AppointmentCommentView } from "@/lib/appointment-comments";
import { CLINIC_TIMEZONE, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicTime,
  getOccupiedUntil,
} from "@/lib/datetime";
import { formatClientSinceDate } from "@/lib/date-utils";
import { adminWideContainer } from "@/lib/admin-layout";
import { getPsychologistDisplay } from "@/lib/psychologist-display";
import { psychologistAdminPath } from "@/lib/psychologist-slugs";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  Payment,
  QuestionnaireResponse,
  UserRole,
} from "@/types/database";

interface AdminAppointmentDetailDashboardProps {
  appointment: AppointmentWithRelations;
  payment: Payment | null;
  questionnaireResponse: QuestionnaireResponse | null;
  /** Resolved client avatar (profile → auth picture → null). */
  clientAvatarSrc?: string | null;
  comments: AppointmentCommentView[];
  currentUserId: string;
  currentUserRole: UserRole;
}

function SummaryMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className={detailMetaRowClass()}>
      <Icon className={detailIconClass} strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className={detailLabelClass}>{label}</p>
        <p className={detailValueClass}>{value}</p>
      </div>
    </div>
  );
}

type TimelineState = "completed" | "current" | "upcoming";

interface TimelineStep {
  id: string;
  label: string;
  state: TimelineState;
  timestamp?: string;
  subtitle?: string;
}

function formatTimelineStamp(iso: string): string {
  return `${formatClinicDate(iso, "MMM d, yyyy")} • ${formatClinicTime(iso)}`;
}

function buildTimelineSteps(
  appointment: AppointmentWithRelations,
  payment: Payment | null,
  questionnaireResponse: QuestionnaireResponse | null
): TimelineStep[] {
  const hasQuestionnaire = !!questionnaireResponse;
  const paymentConfirmed =
    payment?.status === "paid" ||
    payment?.status === "waived" ||
    ["confirmed", "completed"].includes(appointment.status);
  const awaitingPayment =
    appointment.status === "pending_payment" && !paymentConfirmed;
  const sessionCompleted = appointment.status === "completed";
  const serviceName = appointment.service?.name ?? "Therapy Session";

  return [
    {
      id: "booked",
      label: "Appointment Booked",
      state: "completed",
      timestamp: appointment.created_at,
    },
    {
      id: "questionnaire",
      label: "Questionnaire Submitted",
      state: hasQuestionnaire ? "completed" : "upcoming",
      timestamp: questionnaireResponse?.submitted_at,
    },
    {
      id: "payment",
      label: paymentConfirmed
        ? "Payment Received"
        : awaitingPayment
          ? "Awaiting Payment"
          : "Payment Received",
      state: paymentConfirmed
        ? "completed"
        : awaitingPayment
          ? "current"
          : "upcoming",
      timestamp: payment?.paid_at ?? undefined,
    },
    {
      id: "session",
      label: serviceName,
      state: sessionCompleted ? "completed" : "upcoming",
      timestamp: appointment.start_at,
    },
  ];
}

function TimelineIcon({ state }: { state: TimelineState }) {
  if (state === "completed") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0F5F1] text-[#5C7A68] transition-opacity duration-200">
        <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FBF6E8] transition-opacity duration-200">
        <span className="size-2 rounded-full bg-[#D4B84A]" aria-hidden />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--brand-text-muted)]/35 transition-opacity duration-200">
      <Circle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

function AppointmentSummaryCard({
  appointment,
  payment,
  clientAvatarSrc,
}: {
  appointment: AppointmentWithRelations;
  payment: Payment | null;
  clientAvatarSrc?: string | null;
}) {
  const clientName =
    appointment.client?.full_name ?? appointment.client?.email ?? "Client";
  const serviceName = appointment.service?.name ?? "Appointment";
  const psychologistName = appointment.psychologist?.name ?? "—";
  const accentColor =
    APPOINTMENT_STATUS_DOT_COLORS[appointment.status] ?? "#B8B4C0";
  const psychologistAccent = getPsychologistIdentityColorById(
    appointment.psychologist_id,
    appointment.psychologist ? [appointment.psychologist] : []
  );
  const psychologistDisplay = appointment.psychologist
    ? getPsychologistDisplay(
        appointment.psychologist.id,
        appointment.psychologist.name,
        appointment.psychologist.title,
        appointment.psychologist.specialties,
        {
          bio: appointment.psychologist.bio,
          photoUrl: appointment.psychologist.photo_url,
          slug: appointment.psychologist.slug,
        }
      )
    : null;

  const endAt = parseISO(appointment.end_at);
  const durationMinutes =
    appointment.service?.duration_minutes ??
    differenceInMinutes(endAt, parseISO(appointment.start_at));
  const bufferMinutes = appointment.service?.buffer_minutes ?? 0;
  const occupiedUntil = getOccupiedUntil(endAt, bufferMinutes);
  const feeCents = appointment.service?.price_cents ?? payment?.amount_cents ?? 0;
  const paymentMethodLabel = payment?.method
    ? PAYMENT_METHOD_LABELS[payment.method]
    : "—";
  const clientSince = formatClientSinceDate(appointment.client?.created_at);
  const psychologistSpecialties = appointment.psychologist?.specialties?.length
    ? appointment.psychologist.specialties.join(" · ")
    : undefined;

  return (
    <section
      className={cn(
        detailCardClass,
        "max-md:bg-[var(--brand-yellow)]/[0.07] max-md:hover:shadow-[0_8px_28px_rgba(242,208,73,0.12)]"
      )}
    >
      <div className={cn(detailCardBodyClass, "space-y-7")}>
        <div className="flex gap-4">
          <div
            className="mt-1 hidden w-1 shrink-0 self-stretch rounded-full md:block"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-[var(--brand-text)] sm:text-[1.65rem]">
                {serviceName}
              </h2>
              <AdminAppointmentStatusPill status={appointment.status} />
            </div>

            <div className="grid gap-7 sm:grid-cols-2">
              <div className="space-y-5">
                {appointment.client_id && (
                  <ClickableInfoCard
                    href={`/admin/clients/${appointment.client_id}`}
                    ariaLabel="View client profile"
                    label="Client"
                    name={clientName}
                    subtitle={clientSince}
                    email={appointment.client?.email}
                    avatarSrc={clientAvatarSrc}
                  />
                )}
                {appointment.psychologist_id && (
                  <ClickableInfoCard
                    href={psychologistAdminPath(
                      appointment.psychologist?.slug ??
                        appointment.psychologist_id
                    )}
                    ariaLabel="View psychologist profile"
                    label="Psychologist"
                    name={psychologistName}
                    subtitle={psychologistSpecialties}
                    avatarSrc={psychologistDisplay?.photo}
                    accentColor={psychologistAccent}
                    showAccentDot
                  />
                )}
              </div>

              <div className="space-y-7">
                <SummaryMeta
                  icon={CalendarDays}
                  label="Date & Time"
                  value={formatClinicDateTime(appointment.start_at)}
                />
                <SummaryMeta
                  icon={Clock}
                  label="Duration"
                  value={formatDuration(durationMinutes)}
                />
                {bufferMinutes > 0 && (
                  <SummaryMeta
                    icon={Timer}
                    label="Buffer"
                    value={`${bufferMinutes} min until ${formatClinicTime(occupiedUntil)}`}
                  />
                )}
                <SummaryMeta
                  icon={Banknote}
                  label="Fee"
                  value={formatCurrency(feeCents)}
                />
                <SummaryMeta
                  icon={CreditCard}
                  label="Payment Method"
                  value={paymentMethodLabel}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--brand-purple)]/[0.06] pt-5">
          <TimezoneNotice />
        </div>
      </div>
    </section>
  );
}

function PaymentSummaryCard({
  appointment,
  payment,
}: {
  appointment: AppointmentWithRelations;
  payment: Payment | null;
}) {
  const feeCents = appointment.service?.price_cents ?? payment?.amount_cents ?? 0;
  const paymentMethodLabel = payment?.method
    ? PAYMENT_METHOD_LABELS[payment.method]
    : "—";

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Payment</h2>
      </div>
      <div className={cn(detailCardBodyClass, "space-y-5")}>
        <div className="space-y-3">
          <p className="text-[1.65rem] font-bold leading-none tracking-tight text-[var(--brand-text)]">
            {formatCurrency(feeCents)}
          </p>
          <div className="space-y-1.5">
            {payment ? (
              <PaymentStatusPill status={payment.status} />
            ) : (
              <span className={detailMutedClass}>No payment record</span>
            )}
            <p className="text-sm font-medium text-[var(--brand-text-muted)]">
              {paymentMethodLabel}
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-[var(--brand-purple)]/[0.06] pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className={detailLabelClass}>Transaction ID</span>
            <span className="text-sm text-[var(--brand-text-muted)]">—</span>
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-[var(--brand-purple)]/10 px-4 py-2.5 text-sm font-medium text-[var(--brand-text-muted)] opacity-60 transition-all duration-150 ease-out"
          >
            Download Receipt
          </button>
        </div>
      </div>
    </section>
  );
}

function TimelineCard({
  appointment,
  payment,
  questionnaireResponse,
}: {
  appointment: AppointmentWithRelations;
  payment: Payment | null;
  questionnaireResponse: QuestionnaireResponse | null;
}) {
  const steps = buildTimelineSteps(appointment, payment, questionnaireResponse);

  return (
    <section className={detailCardClass}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Timeline</h2>
      </div>
      <div className={detailCardBodyClass}>
        <ol className="space-y-0">
          {steps.map((step, index) => (
            <li key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <TimelineIcon state={step.state} />
                {index < steps.length - 1 && (
                  <span
                    className="my-1.5 min-h-6 w-px flex-1 bg-[var(--brand-purple)]/[0.08]"
                    aria-hidden
                  />
                )}
              </div>
              <div
                className={cn(
                  "min-w-0 flex-1",
                  index < steps.length - 1 ? "pb-5" : "pb-0.5"
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    step.state === "upcoming"
                      ? "text-[var(--brand-text-muted)]"
                      : "text-[var(--brand-text)]"
                  )}
                >
                  {step.label}
                </p>
                {step.timestamp && step.state !== "upcoming" && (
                  <p className="mt-1 text-xs leading-snug text-[var(--brand-text-muted)]">
                    {formatTimelineStamp(step.timestamp)}
                  </p>
                )}
                {step.timestamp && step.state === "upcoming" && step.id === "session" && (
                  <p className="mt-1 text-xs leading-snug text-[var(--brand-text-muted)]">
                    {formatTimelineStamp(step.timestamp)}
                  </p>
                )}
                {step.subtitle && (
                  <p className="mt-1 text-xs leading-snug text-[var(--brand-text-muted)]">
                    {step.subtitle}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function AdminAppointmentDetailDashboard({
  appointment,
  payment,
  questionnaireResponse,
  clientAvatarSrc,
  comments,
  currentUserId,
  currentUserRole,
}: AdminAppointmentDetailDashboardProps) {
  const dateStr = formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd");
  const hour = Number(formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "H"));
  const minute = Number(formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "m"));
  const rescheduleHref = buildManualBookingUrl(
    appointment.psychologist_id,
    dateStr,
    hour,
    minute
  );

  const showMarkPayment =
    appointment.status === "pending_payment" &&
    (!payment || payment.status === "pending");
  const showMarkCompleted = appointment.status === "confirmed";
  const showNoShow = appointment.status === "confirmed";

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <div className="mb-8 space-y-4">
        <AdminBackLink fallbackHref="/admin/calendar" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80">
            Appointment
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[var(--brand-text)] sm:text-3xl">
            {appointment.service?.name ?? "Appointment"}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
        <div className={detailStackGapClass}>
          <AppointmentSummaryCard
            appointment={appointment}
            payment={payment}
            clientAvatarSrc={clientAvatarSrc}
          />
          <AppointmentQuestionnaireCard questionnaireResponse={questionnaireResponse} />
          <AppointmentCommentsCard
            appointmentId={appointment.id}
            initialComments={comments}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
          <EntityActivityTimeline
            entityType="appointment"
            entityId={appointment.id}
          />
        </div>

        <aside className={detailStackGapClass}>
          <AppointmentDetailActions
            appointmentId={appointment.id}
            currentStatus={appointment.status}
            rescheduleHref={rescheduleHref}
            showMarkPayment={showMarkPayment}
            showMarkCompleted={showMarkCompleted}
            showNoShow={showNoShow}
          />
          <PaymentSummaryCard appointment={appointment} payment={payment} />
          <TimelineCard
            appointment={appointment}
            payment={payment}
            questionnaireResponse={questionnaireResponse}
          />
        </aside>
      </div>
    </div>
  );
}
