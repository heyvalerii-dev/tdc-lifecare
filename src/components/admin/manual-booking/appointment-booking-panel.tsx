"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  HeartHandshake,
} from "lucide-react";
import {
  detailLabelClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import type { AppointmentDrawerMode } from "@/components/admin/manual-booking/manual-booking-context";
import { useCalendarDrawer } from "@/components/admin/manual-booking/manual-booking-context";
import { EntityActivityTimeline } from "@/components/admin/entity-activity-timeline";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import {
  adminControlInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-controls";
import { clinicClosedDateMessage, CLINIC_CLOSED_CREATE_FORM_MESSAGE } from "@/lib/clinic-working-days";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { clinicDateToUtc, getClinicToday } from "@/lib/datetime";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  formatBookingDateLabel,
  formatBookingTimeLabel,
  MANUAL_BOOKING_TIME_OPTIONS,
  type ManualBookingSlotPreset,
} from "@/lib/manual-booking";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  Profile,
  Psychologist,
  Service,
} from "@/types/database";

type PsychologistWithServices = Psychologist & { services: Service[] };
type ClientOption = Pick<Profile, "id" | "full_name" | "email">;

export interface AppointmentBookingPanelProps {
  open: boolean;
  mode: AppointmentDrawerMode;
  slot: ManualBookingSlotPreset | null;
  editingAppointment: AppointmentWithRelations | null;
  onClose: () => void;
  onFooterChange: (footer: ReactNode) => void;
}

interface FormState {
  clientId: string;
  psychologistId: string;
  serviceId: string;
  paymentMethod: string;
  notes: string;
  date: string;
  startTime: string;
}

const EMPTY_FORM: FormState = {
  clientId: "",
  psychologistId: "",
  serviceId: "",
  paymentMethod: "cash",
  notes: "",
  date: "",
  startTime: "",
};

const SLOT_BOOKED_MESSAGE = "This time slot is already booked.";

function isSlotConflictReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return (
    reason === SLOT_BOOKED_MESSAGE ||
    reason === "This time slot is unavailable." ||
    reason === "This time overlaps blocked time on the calendar." ||
    reason === "Outside of psychologist availability." ||
    reason === "This time slot is in the past."
  );
}

function footerConflictMessage(reason: string): string {
  if (reason === SLOT_BOOKED_MESSAGE) return SLOT_BOOKED_MESSAGE;
  if (reason === "This time slot is unavailable.") {
    return "This time overlaps blocked time on the calendar.";
  }
  return reason;
}

function formFromAppointment(appointment: AppointmentWithRelations): FormState {
  return {
    clientId: appointment.client_id,
    psychologistId: appointment.psychologist_id,
    serviceId: appointment.service_id,
    paymentMethod: appointment.payment?.method ?? "cash",
    notes: appointment.notes ?? "",
    date: formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd"),
    startTime: formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "HH:mm"),
  };
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={detailLabelClass}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? <p className="text-sm text-[#8C5C68]">{error}</p> : null}
    </label>
  );
}

export function AppointmentBookingPanel({
  open,
  mode,
  slot,
  editingAppointment,
  onClose,
  onFooterChange,
}: AppointmentBookingPanelProps) {
  const router = useRouter();
  const { workingDays } = useCalendarDrawer();
  const isEdit = mode === "edit" && Boolean(editingAppointment);
  const lockedSlot = mode === "quick" && Boolean(slot);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [psychologists, setPsychologists] = useState<PsychologistWithServices[]>(
    []
  );
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [slotUnavailable, setSlotUnavailable] = useState(false);
  const [slotBlockReason, setSlotBlockReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  useEffect(() => {
    if (!open) return;

    setError(null);
    setFieldErrors({});
    setSaving(false);
    setSlotUnavailable(false);
    setSlotBlockReason(null);
    setCheckingSlot(false);

    if (isEdit && editingAppointment) {
      setForm(formFromAppointment(editingAppointment));
    } else if (lockedSlot && slot) {
      setForm({
        ...EMPTY_FORM,
        psychologistId: slot.psychologistId,
        date: slot.selectedDate,
        startTime: slot.selectedStartTime ?? "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        date: getClinicToday(),
      });
    }
  }, [open, mode, slot, editingAppointment, isEdit, lockedSlot]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingOptions(true);

    void (async () => {
      try {
        const res = await fetch("/api/admin/manual-booking-options");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Couldn't load booking options"
          );
        }
        if (cancelled) return;

        const nextPsychologists = (data.psychologists ??
          []) as PsychologistWithServices[];
        const nextClients = (data.clients ?? []) as ClientOption[];
        setPsychologists(nextPsychologists);
        setClients(nextClients);

        if (!isEdit) {
          setForm((prev) => {
            const psychId = prev.psychologistId || slot?.psychologistId || "";
            const psych = nextPsychologists.find((p) => p.id === psychId);
            const firstService = psych?.services[0];
            if (!firstService || prev.serviceId) return prev;
            return { ...prev, serviceId: firstService.id };
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load booking options"
          );
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, slot?.psychologistId, isEdit]);

  // Validate the chosen start — exclude the appointment being edited.
  useEffect(() => {
    if (!open) return;
    if (
      !form.psychologistId ||
      !form.serviceId ||
      !form.date ||
      !form.startTime
    ) {
      setSlotUnavailable(false);
      setSlotBlockReason(null);
      setCheckingSlot(false);
      return;
    }

    let cancelled = false;
    setCheckingSlot(true);

    const startAt = clinicDateToUtc(form.date, form.startTime).toISOString();
    const params = new URLSearchParams({
      psychologist_id: form.psychologistId,
      service_id: form.serviceId,
      start_at: startAt,
    });
    if (editingAppointment?.id) {
      params.set("exclude_appointment_id", editingAppointment.id);
    }

    void (async () => {
      try {
        const res = await fetch(`/api/admin/validate-slot?${params}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setSlotUnavailable(false);
          setSlotBlockReason(null);
          return;
        }

        if (data.valid === false) {
          const reason =
            typeof data.reason === "string" ? data.reason : "Slot unavailable";
          setSlotUnavailable(true);
          setSlotBlockReason(reason);
          if (isSlotConflictReason(reason)) setError(null);
        } else {
          setSlotUnavailable(false);
          setSlotBlockReason(null);
        }
      } catch {
        if (!cancelled) {
          setSlotUnavailable(false);
          setSlotBlockReason(null);
        }
      } finally {
        if (!cancelled) setCheckingSlot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    form.psychologistId,
    form.serviceId,
    form.date,
    form.startTime,
    editingAppointment?.id,
  ]);

  const psychologist = useMemo(
    () => psychologists.find((p) => p.id === form.psychologistId) ?? null,
    [psychologists, form.psychologistId]
  );

  const psychologistName =
    (lockedSlot && slot?.psychologistName) ||
    editingAppointment?.psychologist?.name ||
    psychologist?.name ||
    "Psychologist";

  const hasRequiredFields = Boolean(
    form.clientId &&
      form.psychologistId &&
      form.serviceId &&
      form.date &&
      form.startTime
  );

  const clinicClosedError = form.date
    ? clinicClosedDateMessage(form.date, workingDays)
      ? CLINIC_CLOSED_CREATE_FORM_MESSAGE
      : null
    : null;

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const dateFieldError = fieldErrors.date ?? clinicClosedError ?? undefined;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.clientId) next.clientId = "Required";
    if (!form.psychologistId) next.psychologistId = "Required";
    if (!form.serviceId) next.serviceId = "Required";
    if (!form.date) {
      next.date = "Required";
    } else if (clinicClosedDateMessage(form.date, workingDays)) {
      next.date = CLINIC_CLOSED_CREATE_FORM_MESSAGE;
    }
    if (!form.startTime) next.startTime = "Required";
    setFieldErrors(next);
    return Object.keys(next).length === 0 && !slotUnavailable;
  }

  async function handleSave() {
    if (saving || slotUnavailable || clinicClosedError) return;
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const startAt = clinicDateToUtc(form.date, form.startTime).toISOString();

      if (isEdit && editingAppointment) {
        const res = await fetch(
          `/api/admin/appointments/${editingAppointment.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: form.clientId,
              psychologist_id: form.psychologistId,
              service_id: form.serviceId,
              start_at: startAt,
              payment_method: form.paymentMethod,
              notes: form.notes.trim() || null,
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof data.error === "string" ? data.error : "Couldn't save";
          if (isSlotConflictReason(message)) {
            setSlotUnavailable(true);
            setSlotBlockReason(message);
            return;
          }
          throw new Error(message);
        }
        onClose();
        router.refresh();
        return;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: form.clientId,
          psychologist_id: form.psychologistId,
          service_id: form.serviceId,
          start_at: startAt,
          is_admin_booking: true,
          payment_method: form.paymentMethod,
          notes: form.notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data.error === "string" ? data.error : "Booking failed";
        if (message === SLOT_BOOKED_MESSAGE || isSlotConflictReason(message)) {
          setSlotUnavailable(true);
          setSlotBlockReason(message);
          return;
        }
        throw new Error(message);
      }

      onClose();
      router.push(`/admin/appointments/${data.appointment_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    hasRequiredFields &&
    !hasFieldErrors &&
    !clinicClosedError &&
    !slotUnavailable &&
    !loadingOptions &&
    !checkingSlot;

  const primaryLabel = isEdit
    ? saving
      ? "Saving…"
      : "Save Changes"
    : saving
      ? "Creating…"
      : "Create Appointment";

  useEffect(() => {
    if (!open) {
      onFooterChange(null);
      return;
    }

    onFooterChange(
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          {slotUnavailable && slotBlockReason ? (
            <p
              role="alert"
              className="flex items-start gap-2 text-sm leading-snug text-[#8C5C68]"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[#8C5C68]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span>{footerConflictMessage(slotBlockReason)}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSubmit || saving}
          aria-disabled={!canSubmit || saving}
          className={cn(
            adminPrimaryButtonClass,
            "w-full shrink-0 sm:w-auto",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--brand-purple)]"
          )}
        >
          {primaryLabel}
        </button>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional footer sync
  }, [
    open,
    onFooterChange,
    slotUnavailable,
    slotBlockReason,
    canSubmit,
    saving,
    primaryLabel,
    form,
    isEdit,
  ]);

  if (!open) return null;

  const scheduleDate = lockedSlot && slot ? slot.selectedDate : form.date;
  const hasLockedTime = Boolean(lockedSlot && slot?.selectedStartTime);
  const scheduleTime = hasLockedTime
    ? slot!.selectedStartTime!
    : form.startTime;

  return (
    <div className="space-y-8">
      {lockedSlot && slot ? (
        <section className="space-y-4">
          <h3 className={detailSectionTitleClass}>Schedule</h3>
          <div className="space-y-3 rounded-xl border border-[var(--brand-purple)]/[0.08] bg-[var(--brand-purple-light)]/25 px-4 py-4">
            <div className="flex items-start gap-3">
              <CalendarDays
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-purple)]/70"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-sm font-medium text-[var(--brand-text)]">
                {formatBookingDateLabel(scheduleDate)}
              </p>
            </div>
            {hasLockedTime ? (
              <div className="flex items-start gap-3">
                <Clock
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-purple)]/70"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <p className="text-sm font-medium text-[var(--brand-text)]">
                  {formatBookingTimeLabel(scheduleTime)}
                </p>
              </div>
            ) : (
              <Field label="Start Time" required error={fieldErrors.startTime}>
                <Select
                  aria-label="Start Time"
                  value={form.startTime}
                  onValueChange={(next) => updateField("startTime", next)}
                  placeholder="Select time"
                  options={MANUAL_BOOKING_TIME_OPTIONS}
                  disabled={saving || loadingOptions}
                />
              </Field>
            )}
            <div className="flex items-start gap-3">
              <HeartHandshake
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-purple)]/70"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-sm font-medium text-[var(--brand-text)]">
                {psychologistName}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <h3 className={detailSectionTitleClass}>Schedule</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required error={dateFieldError}>
              <DatePicker
                aria-label="Date"
                value={form.date}
                onChange={(next) => updateField("date", next)}
                min={isEdit ? undefined : getClinicToday()}
                placeholder="Select date"
                disabled={saving || loadingOptions}
              />
            </Field>
            <Field label="Time" required error={fieldErrors.startTime}>
              <Select
                aria-label="Time"
                value={form.startTime}
                onValueChange={(next) => updateField("startTime", next)}
                placeholder="Select time"
                options={MANUAL_BOOKING_TIME_OPTIONS}
                disabled={saving || loadingOptions}
              />
            </Field>
          </div>
          <Field
            label="Psychologist"
            required
            error={fieldErrors.psychologistId}
          >
            <Select
              aria-label="Psychologist"
              value={form.psychologistId}
              onValueChange={(next) => {
                const psych = psychologists.find((p) => p.id === next);
                updateField("psychologistId", next);
                if (!isEdit || !psych?.services.some((s) => s.id === form.serviceId)) {
                  updateField("serviceId", psych?.services[0]?.id ?? "");
                }
              }}
              placeholder="Select psychologist"
              options={psychologists.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              disabled={saving || loadingOptions}
            />
          </Field>
        </section>
      )}

      <section className="space-y-4">
        <h3 className={detailSectionTitleClass}>Booking details</h3>

        <Field label="Client" required error={fieldErrors.clientId}>
          <Select
            aria-label="Client"
            value={form.clientId}
            onValueChange={(next) => updateField("clientId", next)}
            placeholder="Select client"
            options={clients.map((c) => ({
              value: c.id,
              label: c.full_name
                ? `${c.full_name} (${c.email})`
                : c.email,
            }))}
            disabled={saving || loadingOptions}
          />
        </Field>

        <Field label="Service" required error={fieldErrors.serviceId}>
          <Select
            aria-label="Service"
            value={form.serviceId}
            onValueChange={(next) => updateField("serviceId", next)}
            placeholder={
              form.psychologistId
                ? "Select service"
                : "Select a psychologist first"
            }
            options={(psychologist?.services ?? []).map((s) => ({
              value: s.id,
              label: `${s.name} — ${formatCurrency(s.price_cents)}`,
            }))}
            disabled={
              saving || loadingOptions || !form.psychologistId || !psychologist
            }
          />
        </Field>

        <Field label="Payment Method">
          <Select
            aria-label="Payment Method"
            value={form.paymentMethod}
            onValueChange={(next) => updateField("paymentMethod", next)}
            options={Object.entries(PAYMENT_METHOD_LABELS).map(
              ([value, label]) => ({ value, label })
            )}
            disabled={saving}
            searchThreshold={0}
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            disabled={saving}
            placeholder="Optional notes for the team"
            className={cn(
              adminControlInputClass,
              "h-auto w-full resize-y px-3 py-2"
            )}
          />
        </Field>
      </section>

      {editingAppointment ? (
        <EntityActivityTimeline
          entityType="appointment"
          entityId={editingAppointment.id}
          variant="plain"
        />
      ) : null}

      {error ? <p className="text-sm text-[#8C5C68]">{error}</p> : null}
      {loadingOptions ? (
        <p className="text-sm text-[var(--brand-text-muted)]">
          Loading booking options…
        </p>
      ) : null}
    </div>
  );
}
