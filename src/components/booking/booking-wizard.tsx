"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseISO, addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { BookingAuthStep } from "@/components/booking/booking-auth-step";
import { BookingBackLink } from "@/components/booking/booking-back-link";
import { BookingScheduleCalendar } from "@/components/booking/booking-schedule-calendar";
import { BookingScheduleSummary } from "@/components/booking/booking-schedule-summary";
import { BookingClinicClosedNotice } from "@/components/booking/booking-clinic-closed-notice";
import { BookingStepIntro } from "@/components/booking/booking-progress";
import { BookingConfirmation } from "@/components/booking/booking-confirmation";
import { BookingPaymentQr } from "@/components/booking/booking-payment-qr";
import { BookingReserveSummary } from "@/components/booking/booking-reserve-summary";
import { PaymentStatusPanel } from "@/components/booking/payment-status-panel";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { PsychologistCard } from "@/components/home/psychologist-card";
import { useCheckoutPayment } from "@/hooks/use-checkout-payment";
import { getPsychologistDisplay } from "@/lib/psychologist-display";
import { type } from "@/lib/typography";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { saveBookingDraft, loadBookingDraft, clearBookingDraft } from "@/lib/booking-draft";
import {
  bookingResumeUnavailableMessage,
  decideBookingResume,
} from "@/lib/booking-resume";
import { CHECKOUT_START_ERROR, fetchPaymentStatus } from "@/lib/payments/client";
import { fetchAvailableSlots, isAbortError } from "@/lib/fetch-available-slots";
import {
  DEFAULT_CLINIC_WORKING_DAYS,
  isClinicWorkingDate,
} from "@/lib/clinic-working-days";
import { resolvePsychologistId } from "@/lib/psychologist-slugs";
import { createClient } from "@/lib/supabase/client";
import type { Psychologist, Service, Questionnaire, QuestionField } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

interface BookingWizardProps {
  psychologists: (Psychologist & { services: Service[] })[];
  questionnaire: Questionnaire | null;
  preselectedPsychologistId?: string | null;
  bypassRules?: boolean;
  workingDays?: number[];
}

const AUTO_ADVANCE_MS = 175;
const CONSENT_FIELD_ID = "consent";

// Internal steps: 0 psychologist, 1 service, 2 schedule, 3 auth, 4 intake, 5 payment, 6 confirmation
function getProgressIndex(step: number): number {
  if (step <= 0) return 0;
  if (step === 1) return 1;
  if (step === 2) return 2;
  if (step === 3) return 3;
  if (step === 4) return 4;
  if (step === 5) return 5;
  return 6;
}

function migrateDraftStep(draftStep: number, draft: { selectedSlot: string | null }): number {
  if (draftStep === 2) return 3;
  if (draftStep === 1 && draft.selectedSlot) return 2;
  if (draftStep >= 3) return draftStep;
  return draftStep;
}

function groupSlotsByPeriod(slots: { start: string; label: string }[]) {
  const morning: typeof slots = [];
  const afternoon: typeof slots = [];
  for (const slot of slots) {
    const hour = parseInt(formatInTimeZone(parseISO(slot.start), CLINIC_TIMEZONE, "H"), 10);
    if (hour < 12) morning.push(slot);
    else afternoon.push(slot);
  }
  return { morning, afternoon };
}

const bookingActionBtn = "w-full sm:w-auto sm:min-w-[10rem]";

function BookingActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
      {children}
    </div>
  );
}

export function BookingWizard({
  psychologists,
  questionnaire,
  preselectedPsychologistId = null,
  bypassRules = false,
  workingDays = [...DEFAULT_CLINIC_WORKING_DAYS],
}: BookingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [psychologistId, setPsychologistId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [slots, setSlots] = useState<{ start: string; label: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsLoadedDate, setSlotsLoadedDate] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [endAt, setEndAt] = useState<string | null>(null);
  const [pendingPaymentCheckId, setPendingPaymentCheckId] = useState<string | null>(
    null
  );

  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const scrollToSlotsAfterLoadRef = useRef(false);
  const bootstrappedRef = useRef(false);
  const slotsAbortRef = useRef<AbortController | null>(null);
  const selectedDateRef = useRef<string | null>(null);
  selectedDateRef.current = selectedDate;
  const [highlightTimeSlots, setHighlightTimeSlots] = useState(false);
  const [pendingCancelledReturn, setPendingCancelledReturn] = useState(false);
  const [navigatingToAppointment, setNavigatingToAppointment] = useState(false);

  const {
    phase: checkoutPhase,
    error: checkoutError,
    isBusy: paymentBusy,
    beginCheckout,
    beginPolling,
    markCancelled,
    resetToIdle,
  } = useCheckoutPayment({
    appointmentId,
    returnTo: "book",
    onConfirmed: (confirmedAppointmentId) => {
      clearBookingDraft();
      setNavigatingToAppointment(true);
      router.replace(`/client/appointments/${confirmedAppointmentId}`);
    },
  });

  const psychologist = psychologists.find((p) => p.id === psychologistId);
  const service = psychologist?.services.find((s) => s.id === serviceId);
  const progressStep = step >= 6 ? 7 : getProgressIndex(step) + 1;
  const consentField = questionnaire?.questions.find((q) => q.id === CONSENT_FIELD_ID);
  const hasConsent = consentField ? responses[CONSENT_FIELD_ID] === true : true;

  const persistDraft = useCallback(
    (overrides: Partial<Parameters<typeof saveBookingDraft>[0]> = {}) => {
      saveBookingDraft({
        psychologistId,
        serviceId,
        selectedDate,
        selectedSlot,
        responses,
        step,
        appointmentId: appointmentId ?? undefined,
        ...overrides,
      });
    },
    [psychologistId, serviceId, selectedDate, selectedSlot, responses, step, appointmentId]
  );

  useEffect(() => {
    if (bootstrappedRef.current) return;

    async function init() {
      bootstrappedRef.current = true;
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      const confirmedId = searchParams.get("confirmed");
      if (confirmedId) {
        const res = await fetch(`/api/appointments/${confirmedId}`);
        if (res.ok) {
          const appt = await res.json();
          setPsychologistId(appt.psychologist_id);
          setServiceId(appt.service_id);
          setSelectedSlot(appt.start_at);
          setEndAt(appt.end_at);
          setAppointmentId(appt.id);
          setStep(5);
          setPendingPaymentCheckId(confirmedId);
          setInitialized(true);
          return;
        }
      }

      const paymentCancelled = searchParams.get("payment") === "cancelled";
      const cancelledAppointmentId = searchParams.get("appointment");
      if (paymentCancelled && cancelledAppointmentId) {
        const res = await fetch(`/api/appointments/${cancelledAppointmentId}`);
        if (res.ok) {
          const appt = await res.json();
          setPsychologistId(appt.psychologist_id);
          setServiceId(appt.service_id);
          setSelectedSlot(appt.start_at);
          setEndAt(appt.end_at);
          setAppointmentId(appt.id);
          setStep(5);
          setPendingCancelledReturn(true);
          setInitialized(true);
          return;
        }
      }

      const psychologistParam = searchParams.get("psychologist");
      const serviceParam = searchParams.get("service");
      if (psychologistParam && serviceParam) {
        const psychId = resolvePsychologistId(
          psychologistParam,
          psychologists
        );
        const psych = psychologists.find((p) => p.id === psychId);
        const svc = psych?.services.find((s) => s.id === serviceParam);
        if (psych && svc) {
          setPsychologistId(psychId);
          setServiceId(serviceParam);
          setStep(2);
          clearBookingDraft();
          setInitialized(true);
          return;
        }
      }

      const resume = searchParams.get("resume") === "1";
      const draft = loadBookingDraft();

      if (resume && draft) {
        if (draft.appointmentId) {
          try {
            const snapshot = await fetchPaymentStatus(draft.appointmentId);
            const action = decideBookingResume(snapshot);

            if (action.type === "redirect_to_appointment") {
              clearBookingDraft();
              setNavigatingToAppointment(true);
              setInitialized(true);
              router.replace(`/client/appointments/${draft.appointmentId}`);
              return;
            }

            if (action.type === "unavailable") {
              clearBookingDraft();
              setError(bookingResumeUnavailableMessage(action.reason));
              setInitialized(true);
              return;
            }
          } catch {
            clearBookingDraft();
            setError("Couldn't load your booking. Please try again.");
            setInitialized(true);
            return;
          }
        }

        setPsychologistId(draft.psychologistId);
        setServiceId(draft.serviceId);
        setSelectedDate(draft.selectedDate);
        setSelectedSlot(draft.selectedSlot);
        setResponses(draft.responses ?? {});
        setAppointmentId(draft.appointmentId ?? null);
        setStep(
          draft.appointmentId ? 5 : migrateDraftStep(draft.step, draft)
        );
      } else if (preselectedPsychologistId && psychologists.some((p) => p.id === preselectedPsychologistId)) {
        setPsychologistId(preselectedPsychologistId);
        setStep(1);
      }

      setInitialized(true);
    }

    void init();
  }, [preselectedPsychologistId, psychologists, searchParams, supabase.auth]);

  useEffect(() => {
    if (!initialized || navigatingToAppointment) return;
    persistDraft();
  }, [initialized, persistDraft, navigatingToAppointment]);

  useEffect(() => {
    if (!pendingPaymentCheckId) return;
    void beginPolling(pendingPaymentCheckId);
    setPendingPaymentCheckId(null);
  }, [pendingPaymentCheckId, beginPolling]);

  useEffect(() => {
    if (!pendingCancelledReturn) return;
    markCancelled();
    setPendingCancelledReturn(false);
    router.replace("/book");
  }, [pendingCancelledReturn, markCancelled, router]);

  useEffect(() => {
    if (step === 3 && isAuthenticated) {
      setStep(4);
    }
  }, [step, isAuthenticated]);

  async function loadAvailableDates(psychId: string, svcId: string) {
    setLoadingDates(true);
    setAvailableDates([]);
    const params = new URLSearchParams({
      psychologist_id: psychId,
      service_id: svcId,
      ...(bypassRules ? { bypass: "true" } : {}),
    });
    const res = await fetch(`/api/dates?${params}`);
    const dates = await res.json();
    setAvailableDates(Array.isArray(dates) ? dates : []);
    setLoadingDates(false);
  }

  useEffect(() => {
    if (psychologistId && serviceId && step >= 2) {
      loadAvailableDates(psychologistId, serviceId);
    }
  }, [psychologistId, serviceId, step, bypassRules]);

  const loadSlots = useCallback(
    async (date: string) => {
      if (!psychologistId || !serviceId) return;

      slotsAbortRef.current?.abort();
      const controller = new AbortController();
      slotsAbortRef.current = controller;

      setLoadingSlots(true);
      setSlotsError(null);

      try {
        const result = await fetchAvailableSlots({
          psychologistId,
          serviceId,
          date,
          bypassRules,
          signal: controller.signal,
        });
        if (controller.signal.aborted || date !== selectedDateRef.current) return;
        setSlots(result);
        setSlotsLoadedDate(date);
        setSlotsError(null);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        if (date !== selectedDateRef.current) return;
        setSlots([]);
        setSlotsLoadedDate(date);
        setSlotsError("Couldn't load available times. Please try again.");
      } finally {
        if (!controller.signal.aborted && date === selectedDateRef.current) {
          setLoadingSlots(false);
        }
      }
    },
    [psychologistId, serviceId, bypassRules]
  );

  useEffect(() => {
    return () => {
      slotsAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (step !== 2 || !selectedDate || !psychologistId || !serviceId) return;
    if (slotsLoadedDate === selectedDate) return;
    void loadSlots(selectedDate);
  }, [step, selectedDate, psychologistId, serviceId, slotsLoadedDate, loadSlots]);

  function handleDateSelect(date: string) {
    scrollToSlotsAfterLoadRef.current = true;
    if (date !== selectedDate) {
      setSelectedSlot(null);
      setSlots([]);
      setSlotsError(null);
      setSlotsLoadedDate(null);
    }
    setSelectedDate(date);
  }

  function handleRetrySlots() {
    if (!selectedDate) return;
    setSlotsLoadedDate(null);
  }

  useEffect(() => {
    if (!scrollToSlotsAfterLoadRef.current || loadingSlots || !selectedDate) return;

    scrollToSlotsAfterLoadRef.current = false;

    const scrollTimer = window.setTimeout(() => {
      timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightTimeSlots(true);
    }, 50);

    const highlightTimer = window.setTimeout(() => setHighlightTimeSlots(false), 700);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [loadingSlots, selectedDate, slots]);

  async function handleCreateBooking() {
    if (!psychologistId || !serviceId || !selectedSlot) return;

    if (consentField && !hasConsent) {
      setConsentError(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psychologist_id: psychologistId,
          service_id: serviceId,
          start_at: selectedSlot,
          questionnaire_responses: questionnaire ? responses : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed");

      setAppointmentId(data.appointment_id);
      setEndAt(addMinutes(parseISO(selectedSlot), service!.duration_minutes).toISOString());
      persistDraft({ appointmentId: data.appointment_id, step: 5 });
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!appointmentId || !service || !selectedSlot || paymentBusy) return;

    setError(null);
    if (!endAt) {
      setEndAt(
        addMinutes(parseISO(selectedSlot), service.duration_minutes).toISOString()
      );
    }
    await beginCheckout();
  }

  function handleAuthenticated() {
    setIsAuthenticated(true);
    router.refresh();
    setStep(4);
  }

  function handlePsychologistSelect(id: string) {
    setPsychologistId(id);
    setServiceId(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);
    setSlotsLoadedDate(null);

    if (step === 0) {
      window.setTimeout(() => setStep(1), AUTO_ADVANCE_MS);
    }
  }

  function handleServiceSelect(id: string) {
    setServiceId(id);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);
    setSlotsLoadedDate(null);

    if (step === 1) {
      window.setTimeout(() => setStep(2), AUTO_ADVANCE_MS);
    }
  }

  function handleContinueFromSchedule() {
    persistDraft({ step: 3 });
    if (isAuthenticated) {
      setStep(4);
    } else {
      setStep(3);
    }
  }

  function isConsentField(field: QuestionField) {
    return field.id === CONSENT_FIELD_ID;
  }

  function renderQuestionField(field: QuestionField) {
    const value = responses[field.id];
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as string) ?? ""}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
          />
        );
      case "select":
        return (
          <Select
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as string) ?? ""}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            options={[
              { value: "", label: "Select..." },
              ...(field.options?.map((o) => ({ value: o, label: o })) ?? []),
            ]}
          />
        );
      case "checkbox":
        if (isConsentField(field)) return null;
        return (
          <label key={field.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setResponses({ ...responses, [field.id]: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-[var(--brand-purple)]/20 text-[var(--brand-purple)]"
            />
            <span className="text-sm text-[var(--brand-text)]">{field.label}</span>
          </label>
        );
      default:
        return (
          <Input
            key={field.id}
            id={field.id}
            label={field.label}
            value={(value as string) ?? ""}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
          />
        );
    }
  }

  function renderConsentField(field: QuestionField) {
    return (
      <div key={field.id} className="space-y-2 rounded-xl border border-[var(--brand-border)] bg-white px-4 py-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(e) => {
              setResponses({ ...responses, [field.id]: e.target.checked });
              if (e.target.checked) setConsentError(false);
            }}
            onBlur={(e) => {
              if (!(e.target as HTMLInputElement).checked) setConsentError(true);
            }}
            className="mt-1 h-4 w-4 rounded border-[var(--brand-purple)]/20 text-[var(--brand-purple)]"
          />
          <span className="text-sm leading-relaxed text-[var(--brand-text)]">{field.label}</span>
        </label>
        {consentError && !hasConsent && (
          <p className="pl-7 text-sm text-red-600">
            Please confirm to continue with your booking.
          </p>
        )}
      </div>
    );
  }

  function canProceed(): boolean {
    switch (step) {
      case 2:
        return !!selectedSlot;
      case 4:
        return hasConsent;
      case 5:
        return !!appointmentId;
      default:
        return true;
    }
  }

  function renderSlotGroup(label: string, groupSlots: { start: string; label: string }[]) {
    if (groupSlots.length === 0) return null;
    return (
      <div className="space-y-3.5">
        <p className="text-sm font-medium text-[var(--brand-text-muted)]">{label}</p>
        <div className="grid grid-cols-3 gap-x-2.5 gap-y-3 sm:grid-cols-4">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => setSelectedSlot(slot.start)}
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-[10px] border px-3 text-sm font-medium",
                  "transition-[background-color,border-color,color,box-shadow,transform] duration-[175ms] ease-out",
                  isSelected
                    ? "-translate-y-px scale-[1.01] border-[var(--brand-purple)] bg-[var(--brand-purple)] text-white shadow-[0_2px_10px_rgba(93,80,122,0.24)]"
                    : "border-[var(--brand-border)] bg-white text-[var(--brand-text)] hover:border-[var(--brand-purple)]/30 hover:bg-[var(--brand-purple-light)]/70 active:scale-[0.99]"
                )}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (!initialized) {
    return <PageLoadingState />;
  }

  if (
    navigatingToAppointment ||
    checkoutPhase === "checking" ||
    (searchParams.get("confirmed") && checkoutPhase === "idle" && step === 5)
  ) {
    return <PageLoadingState />;
  }

  const { morning, afternoon } = groupSlotsByPeriod(slots);
  const dateIsClosed = Boolean(
    selectedDate && !isClinicWorkingDate(selectedDate, workingDays)
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      {error && <Alert variant="error">{error}</Alert>}

      {step === 0 && (
        <div className="space-y-8">
          <BookingStepIntro
            title="Choose your psychologist"
            description="Select the psychologist you'd like to work with."
            currentStep={progressStep}
          />
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {psychologists.map((p) => {
              const display = getPsychologistDisplay(
                p.id,
                p.name,
                p.title,
                p.specialties,
                { bio: p.bio, photoUrl: p.photo_url, slug: p.slug }
              );
              return (
                <PsychologistCard
                  key={p.id}
                  psych={display}
                  mode="select"
                  selected={psychologistId === p.id}
                  onSelect={() => handlePsychologistSelect(p.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && psychologist && (
        <div className="space-y-8">
          <BookingStepIntro
            title="Choose a service"
            description={`Select a service with ${psychologist.name}.`}
            currentStep={progressStep}
          />
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {psychologist.services.map((s) => (
              <Card
                key={s.id}
                className={cn(
                  "cursor-pointer transition-all duration-[225ms] ease-out",
                  serviceId === s.id
                    ? "border-[var(--brand-purple)] shadow-[0_8px_24px_rgba(93,80,122,0.1)] ring-1 ring-[var(--brand-purple)]/20"
                    : "hover:border-[var(--brand-purple)]/25"
                )}
                onClick={() => handleServiceSelect(s.id)}
              >
                <CardContent className="py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-heading text-xl font-semibold leading-snug tracking-tight text-[var(--brand-text)]">
                        {s.name}
                      </p>
                      {s.description && <p className={type.bodyMuted}>{s.description}</p>}
                      <p className={type.smallMuted}>{formatDuration(s.duration_minutes)}</p>
                    </div>
                    <p className={cn(type.small, "shrink-0 text-[var(--brand-purple)]")}>
                      {formatCurrency(s.price_cents)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 2 && psychologist && service && (
        <div className="flex flex-col gap-8">
          <BookingStepIntro
            title="Choose a date & time"
            description="Pick an available appointment slot."
            currentStep={progressStep}
          />
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
            <BookingScheduleSummary psychologist={psychologist} service={service} />

            <div className="flex w-full shrink-0 flex-col gap-3">
              <BookingScheduleCalendar
                availableDates={availableDates}
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                loading={loadingDates}
              />
              {dateIsClosed && selectedDate && (
                <BookingClinicClosedNotice
                  selectedDate={selectedDate}
                  workingDays={workingDays}
                />
              )}
            </div>

            {selectedDate && !dateIsClosed && (
              <div
                ref={timeSlotsRef}
                className={cn(
                  "scroll-mt-8 space-y-6 rounded-xl",
                  highlightTimeSlots && "booking-times-highlight"
                )}
              >
                {loadingSlots ? (
                  <p className={cn(type.bodyMuted, "text-center sm:text-left")}>
                    Loading available times...
                  </p>
                ) : slotsError ? (
                  <div className="space-y-3 text-center sm:text-left">
                    <p className={type.bodyMuted}>{slotsError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetrySlots}
                    >
                      Try again
                    </Button>
                  </div>
                ) : slots.length === 0 ? (
                  <p className={cn(type.bodyMuted, "text-center sm:text-left")}>
                    No available times for this date. Try another day.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {renderSlotGroup("Morning", morning)}
                    {renderSlotGroup("Afternoon", afternoon)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && psychologist && service && selectedSlot && (
        <div className="space-y-8">
          <BookingStepIntro
            title="Almost done"
            description="Sign in to reserve your appointment and continue with your intake."
            currentStep={progressStep}
          />
          <div className="mx-auto max-w-2xl space-y-8">
            <BookingReserveSummary
              psychologist={psychologist}
              service={service}
              selectedSlot={selectedSlot}
            />
            <BookingAuthStep onAuthenticated={handleAuthenticated} />
          </div>
        </div>
      )}

      {step === 4 && psychologist && service && selectedSlot && (
        <div className="space-y-8">
          <BookingStepIntro
            title="Help us get to know you (optional)"
            description="These questions help your psychologist prepare for your appointment. You may answer as much or as little as you'd like."
            currentStep={progressStep}
          />
          <div className="mx-auto max-w-2xl">
            {questionnaire && (
              <div className="space-y-6">
                {questionnaire.title && (
                  <h3 className={type.sectionTitle}>{questionnaire.title}</h3>
                )}
                {questionnaire.description && (
                  <p className={cn(type.bodyMuted, type.prose)}>{questionnaire.description}</p>
                )}
                <div className="space-y-5">
                  {questionnaire.questions
                    .filter((q) => !isConsentField(q))
                    .map(renderQuestionField)}
                </div>
                {consentField && renderConsentField(consentField)}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 5 && psychologist && service && selectedSlot && (
        <div className="space-y-8">
          <BookingStepIntro
            title="Payment"
            description="Complete your payment securely using PayMongo. After payment we'll automatically confirm your appointment."
            currentStep={progressStep}
          />
          <div className="mx-auto max-w-2xl space-y-8">
            {checkoutPhase === "cancelled" ? (
              <PaymentStatusPanel
                variant="cancelled"
                onRetry={() => {
                  resetToIdle();
                  void handlePay();
                }}
                retryLabel="Pay again"
                retryLoading={paymentBusy}
              />
            ) : checkoutPhase === "timeout" ? (
              <PaymentStatusPanel
                variant="timeout"
                message={checkoutError}
                onRetry={() => {
                  if (!appointmentId) return;
                  void beginPolling(appointmentId);
                }}
                retryLabel="Check again"
                retryLoading={paymentBusy}
              />
            ) : checkoutPhase === "error" ? (
              <PaymentStatusPanel
                variant="error"
                message={checkoutError ?? CHECKOUT_START_ERROR}
                onRetry={() => {
                  resetToIdle();
                  void handlePay();
                }}
                retryLabel="Try again"
                retryLoading={paymentBusy}
              />
            ) : (
              <>
                <BookingReserveSummary
                  psychologist={psychologist}
                  service={service}
                  selectedSlot={selectedSlot}
                  variant="white"
                />
                {appointmentId && (
                  <BookingPaymentQr
                    appointmentId={appointmentId}
                    amountCents={service.price_cents}
                  />
                )}
                <p className={cn(type.smallMuted, "text-sm leading-relaxed")}>
                  You&apos;ll be redirected to PayMongo&apos;s secure checkout. When you return,
                  we&apos;ll confirm your appointment once payment is received.
                </p>
                {(error || checkoutError) && checkoutPhase === "idle" && (
                  <Alert variant="error">
                    {error ?? checkoutError}
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {step === 6 && psychologist && service && selectedSlot && appointmentId && endAt && (
        <div className="mx-auto max-w-2xl">
          <BookingConfirmation
            psychologist={psychologist}
            service={service}
            selectedSlot={selectedSlot}
            endAt={endAt}
            appointmentId={appointmentId}
          />
        </div>
      )}

      {step < 6 && step !== 0 && (
        <BookingActionBar>
          <BookingBackLink
            onClick={() => setStep(step - 1)}
            className={cn(paymentBusy && "pointer-events-none opacity-40")}
          />
          {step === 2 && (
            <Button
              onClick={handleContinueFromSchedule}
              disabled={!canProceed()}
              className={bookingActionBtn}
            >
              Continue
            </Button>
          )}
          {step === 4 && (
            <Button
              onClick={handleCreateBooking}
              loading={loading}
              disabled={!canProceed() || loading}
              className={bookingActionBtn}
            >
              Continue to Payment
            </Button>
          )}
          {step === 5 &&
            checkoutPhase !== "cancelled" &&
            checkoutPhase !== "timeout" &&
            checkoutPhase !== "error" && (
              <Button
                onClick={handlePay}
                loading={paymentBusy}
                disabled={paymentBusy || !appointmentId}
                className={bookingActionBtn}
              >
                {paymentBusy ? "Redirecting to PayMongo…" : "Pay securely"}
              </Button>
          )}
        </BookingActionBar>
      )}
    </div>
  );
}
