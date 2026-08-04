"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowDown, Trash2 } from "lucide-react";
import {
  detailLabelClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { EntityActivityTimeline } from "@/components/admin/entity-activity-timeline";
import {
  adminControlInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-controls";
import {
  BLOCK_MODE_KEY,
  blockDisplayTitle,
  blockModeToLayer,
  layerToBlockMode,
  type BlockFormMode,
} from "@/lib/calendar-blocks";
import {
  BLOCK_REASON_OPTIONS,
  BLOCK_REPEAT_OPTIONS,
  CLINIC_TIMEZONE,
  UNAVAILABLE_REASON_LABELS,
} from "@/lib/constants";
import { getClinicToday } from "@/lib/datetime";
import {
  addMinutesToHhmm,
  MANUAL_BOOKING_TIME_OPTIONS,
  type ManualBookingSlotPreset,
} from "@/lib/manual-booking";
import { cn } from "@/lib/utils";
import type {
  BlockRecurrenceType,
  Psychologist,
  UnavailableBlock,
  UnavailableReason,
} from "@/types/database";

export type BlockDrawerHeader = {
  eyebrow?: string;
  title: string;
  badge?: string;
  subtitle?: string;
};

export interface BlockTimePanelProps {
  open: boolean;
  slot: ManualBookingSlotPreset | null;
  editingBlock: UnavailableBlock | null;
  /** Prefill for creating a one-time override from a recurring occurrence. */
  overrideFromRule?: {
    rule: UnavailableBlock;
    dateStr: string;
  } | null;
  onClose: () => void;
  onFooterChange: (footer: ReactNode) => void;
  onHeaderChange?: (header: BlockDrawerHeader | null) => void;
}

interface FormState {
  mode: BlockFormMode;
  psychologistId: string;
  reason: string;
  title: string;
  notes: string;
  startTime: string;
  endTime: string;
  recurrenceType: BlockRecurrenceType;
  recurrenceDays: number[];
  recurrenceInterval: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
}

const WEEKDAY_OPTIONS = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

function readStoredMode(): BlockFormMode {
  if (typeof window === "undefined") return "one_time";
  try {
    const stored = sessionStorage.getItem(BLOCK_MODE_KEY);
    if (stored === "recurring" || stored === "one_time") return stored;
  } catch {
    /* ignore */
  }
  return "one_time";
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

function ScheduleEndpoint({
  label,
  date,
  time,
  showDate,
  showTime,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
  minDate,
  disabled,
  lockDate,
}: {
  label: string;
  date?: string;
  time: string;
  showDate: boolean;
  showTime: boolean;
  onDateChange?: (next: string) => void;
  onTimeChange: (next: string) => void;
  dateError?: string;
  timeError?: string;
  minDate?: string;
  disabled?: boolean;
  lockDate?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <span className={detailLabelClass}>{label}</span>
      <div className="space-y-2">
        {showDate && date != null && onDateChange ? (
          <DatePicker
            aria-label={`${label} date`}
            value={date}
            onChange={onDateChange}
            min={minDate}
            placeholder="Select date"
            disabled={disabled || lockDate}
          />
        ) : null}
        {showTime ? (
          <Select
            aria-label={`${label} time`}
            value={time}
            onValueChange={onTimeChange}
            options={MANUAL_BOOKING_TIME_OPTIONS}
            placeholder="Select time"
            disabled={disabled}
          />
        ) : null}
      </div>
      {dateError || timeError ? (
        <p className="text-sm text-[#8C5C68]">{dateError || timeError}</p>
      ) : null}
    </div>
  );
}

function emptyForm(mode: BlockFormMode): FormState {
  const today = getClinicToday();
  return {
    mode,
    psychologistId: "",
    reason: mode === "recurring" ? "lunch_break" : "vacation",
    title: "",
    notes: "",
    startTime: mode === "recurring" ? "12:00" : "09:00",
    endTime: mode === "recurring" ? "13:00" : "17:00",
    recurrenceType: "weekday",
    recurrenceDays: [1, 2, 3, 4, 5],
    recurrenceInterval: "1",
    startDate: today,
    endDate: today,
    allDay: mode === "one_time",
  };
}

function formFromBlock(block: UnavailableBlock): FormState {
  const mode = layerToBlockMode(block.layer);
  const startDate = formatInTimeZone(
    block.start_at,
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );
  const endInstant = new Date(
    new Date(block.end_at).getTime() - (block.all_day ? 1 : 0)
  );
  const endDate = formatInTimeZone(
    endInstant.toISOString(),
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );

  return {
    mode,
    psychologistId: block.psychologist_id,
    reason: block.reason,
    title: block.title ?? "",
    notes: block.notes ?? "",
    startTime: formatInTimeZone(block.start_at, CLINIC_TIMEZONE, "HH:mm"),
    endTime: formatInTimeZone(block.end_at, CLINIC_TIMEZONE, "HH:mm"),
    recurrenceType:
      block.recurrence_type === "none"
        ? "weekday"
        : block.recurrence_type || "weekday",
    recurrenceDays: Array.isArray(block.recurrence_days)
      ? [...block.recurrence_days]
      : [1, 2, 3, 4, 5],
    recurrenceInterval: String(block.recurrence_interval || 1),
    startDate,
    endDate,
    allDay: Boolean(block.all_day),
  };
}

function formFromOverridePrefill(
  rule: UnavailableBlock,
  dateStr: string
): FormState {
  const startTime = formatInTimeZone(rule.start_at, CLINIC_TIMEZONE, "HH:mm");
  const endTime = formatInTimeZone(rule.end_at, CLINIC_TIMEZONE, "HH:mm");
  return {
    ...emptyForm("one_time"),
    psychologistId: rule.psychologist_id,
    reason: rule.reason,
    title: rule.title ?? "",
    notes: "",
    startDate: dateStr,
    endDate: dateStr,
    allDay: false,
    startTime,
    endTime,
  };
}

function formFromSlot(
  slot: ManualBookingSlotPreset,
  mode: BlockFormMode
): FormState {
  const hasStart = Boolean(slot.selectedStartTime);
  const endTime = hasStart
    ? slot.selectedEndTime ||
      addMinutesToHhmm(slot.selectedStartTime!, 60)
    : "";

  return {
    ...emptyForm(mode),
    psychologistId: slot.psychologistId,
    startDate: slot.selectedDate,
    endDate: slot.selectedDate,
    startTime: slot.selectedStartTime ?? "",
    endTime,
    allDay: false,
    reason: mode === "recurring" ? "lunch_break" : "personal",
  };
}

export function BlockTimePanel({
  open,
  slot,
  editingBlock,
  overrideFromRule = null,
  onClose,
  onFooterChange,
  onHeaderChange,
}: BlockTimePanelProps) {
  const router = useRouter();
  const lockedMode = Boolean(editingBlock || overrideFromRule);

  const [form, setForm] = useState<FormState>(() => emptyForm(readStoredMode()));
  const [psychologists, setPsychologists] = useState<
    Pick<Psychologist, "id" | "name">[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const isRecurring = form.mode === "recurring";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    setSaving(false);
    setDeleting(false);
    setDeleteOpen(false);

    if (editingBlock) {
      setForm(formFromBlock(editingBlock));
    } else if (overrideFromRule) {
      setForm(
        formFromOverridePrefill(overrideFromRule.rule, overrideFromRule.dateStr)
      );
    } else if (slot) {
      setForm(formFromSlot(slot, readStoredMode()));
    } else {
      setForm(emptyForm(readStoredMode()));
    }
  }, [open, slot, editingBlock, overrideFromRule]);

  useEffect(() => {
    if (!open) {
      onHeaderChange?.(null);
      return;
    }

    const reasonTitle = blockDisplayTitle(
      form.reason,
      form.title,
      UNAVAILABLE_REASON_LABELS
    );

    if (editingBlock) {
      onHeaderChange?.({
        title: reasonTitle,
        badge: isRecurring ? "Recurring Block" : "One-time Block",
      });
      return;
    }

    if (overrideFromRule) {
      onHeaderChange?.({
        eyebrow: "Block Time",
        title: reasonTitle,
        badge: "One-time Block",
        subtitle: "Only changes this date. The recurring schedule stays the same.",
      });
      return;
    }

    onHeaderChange?.({
      eyebrow: "Block Time",
      title: reasonTitle === "Other" && !form.title.trim() ? "New Block" : reasonTitle,
      subtitle: isRecurring ? "Recurring" : "One-time",
    });
  }, [
    open,
    form.reason,
    form.title,
    isRecurring,
    editingBlock,
    overrideFromRule,
    onHeaderChange,
  ]);

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
              : "Couldn't load psychologists"
          );
        }
        if (cancelled) return;
        setPsychologists(
          ((data.psychologists ?? []) as Psychologist[]).map((p) => ({
            id: p.id,
            name: p.name,
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load psychologists"
          );
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function setMode(mode: BlockFormMode) {
    if (lockedMode) return;
    setForm((prev) => ({
      ...prev,
      mode,
      reason:
        mode === "recurring"
          ? prev.reason === "vacation" || prev.reason === "holiday"
            ? "lunch_break"
            : prev.reason
          : prev.reason === "lunch_break"
            ? "vacation"
            : prev.reason,
      allDay:
        mode === "one_time"
          ? prev.mode === "one_time"
            ? prev.allDay
            : true
          : false,
      startTime:
        mode === "recurring"
          ? prev.startTime || "12:00"
          : prev.startTime || "09:00",
      endTime:
        mode === "recurring" ? prev.endTime || "13:00" : prev.endTime || "17:00",
    }));
    try {
      sessionStorage.setItem(BLOCK_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "startDate" && typeof value === "string") {
        if (!prev.endDate || prev.endDate < value) next.endDate = value;
      }
      return next;
    });
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const has = prev.recurrenceDays.includes(day);
      return {
        ...prev,
        recurrenceDays: has
          ? prev.recurrenceDays.filter((d) => d !== day)
          : [...prev.recurrenceDays, day].sort((a, b) => a - b),
      };
    });
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.psychologistId) next.psychologistId = "Required";
    if (!form.reason) next.reason = "Required";
    if (form.reason === "other" && !form.title.trim()) {
      next.title = "Required when reason is Other";
    }

    if (isRecurring) {
      if (!form.startTime) next.startTime = "Required";
      if (!form.endTime) next.endTime = "Required";
      if (form.startTime && form.endTime && form.startTime === form.endTime) {
        next.endTime = "End must differ from start";
      }
      if (!form.recurrenceType) next.recurrenceType = "Required";
      if (
        form.recurrenceType === "custom" &&
        form.recurrenceDays.length === 0
      ) {
        next.recurrenceDays = "Select at least one day";
      }
    } else {
      if (!form.startDate) next.startDate = "Required";
      if (!form.endDate) next.endDate = "Required";
      if (!form.allDay) {
        if (!form.startTime) next.startTime = "Required";
        if (!form.endTime) next.endTime = "Required";
        if (
          form.startDate &&
          form.endDate &&
          form.startTime &&
          form.endTime &&
          `${form.endDate}T${form.endTime}` <=
            `${form.startDate}T${form.startTime}`
        ) {
          next.endTime = "End must be after start";
        }
      } else if (form.startDate && form.endDate && form.endDate < form.startDate) {
        next.endDate = "End date must be on or after start date";
      }
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildBody() {
    const layer = blockModeToLayer(form.mode);
    const base = {
      psychologist_id: form.psychologistId,
      reason: form.reason as UnavailableReason,
      title: form.title.trim() || null,
      notes: form.notes.trim() || null,
      layer,
      mode: form.mode,
    };

    if (isRecurring) {
      return {
        ...base,
        start_date: getClinicToday(),
        start_time: form.startTime,
        end_time: form.endTime,
        all_day: false,
        recurrence_type: form.recurrenceType,
        recurrence_interval: Math.max(1, Number(form.recurrenceInterval) || 1),
        recurrence_days:
          form.recurrenceType === "custom" ? form.recurrenceDays : [],
        recurrence_end_type: "never",
        recurrence_end_date: null,
        recurrence_count: null,
      };
    }

    return {
      ...base,
      start_date: form.startDate,
      end_date: form.endDate,
      start_time: form.allDay ? "00:00" : form.startTime,
      end_time: form.allDay ? "23:59" : form.endTime,
      all_day: form.allDay,
      recurrence_type: "none",
      recurrence_interval: 1,
      recurrence_days: [],
      recurrence_end_type: "never",
      recurrence_end_date: null,
      recurrence_count: null,
      suppresses_rule_id: overrideFromRule?.rule.id ?? null,
    };
  }

  async function handleSave() {
    if (saving || deleting) return;
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const body = buildBody();
      const res = editingBlock
        ? await fetch(`/api/admin/unavailable-blocks/${editingBlock.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/unavailable-blocks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn't save block"
        );
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingBlock || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/unavailable-blocks/${editingBlock.id}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn't delete block"
        );
      }
      setDeleteOpen(false);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  const canSubmit = useMemo(() => {
    if (!form.psychologistId || !form.reason || loadingOptions) return false;
    if (form.reason === "other" && !form.title.trim()) return false;
    if (isRecurring) return Boolean(form.startTime && form.endTime);
    if (!form.startDate || !form.endDate) return false;
    if (!form.allDay && (!form.startTime || !form.endTime)) return false;
    return true;
  }, [form, isRecurring, loadingOptions]);

  useEffect(() => {
    if (!open) {
      onFooterChange(null);
      return;
    }
    onFooterChange(
      <div className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-sm leading-snug text-[#8C5C68]">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          {editingBlock ? (
            <span className="group relative">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={saving || deleting}
                aria-label="Delete Block"
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  "text-[#B85C6A] transition-colors duration-150 ease-out",
                  "hover:bg-[#B85C6A]/10 hover:text-[#A04E5B]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B85C6A]/25",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 whitespace-nowrap rounded-lg border border-[#E8E2F2] bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-[var(--brand-text)] opacity-0 shadow-[0_8px_24px_rgba(93,80,122,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Delete Block
              </span>
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSubmit || saving || deleting}
            className={cn(
              adminPrimaryButtonClass,
              "shrink-0",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--brand-purple)]"
            )}
          >
            {saving ? "Saving…" : editingBlock ? "Save Changes" : "Save Block"}
          </button>
        </div>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onFooterChange, error, canSubmit, saving, deleting, form, editingBlock]);

  if (!open) return null;

  const showTimes = isRecurring || !form.allDay;
  const showDates = !isRecurring;

  return (
    <div className="space-y-8">
      {!lockedMode ? (
        <fieldset className="space-y-3">
          <legend className={detailLabelClass}>How often?</legend>
          <div
            role="radiogroup"
            aria-label="How often?"
            className="flex gap-2"
          >
            {(
              [
                { value: "one_time" as const, label: "One-time" },
                { value: "recurring" as const, label: "Recurring" },
              ] as const
            ).map((option) => {
              const selected = form.mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "flex flex-1 items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors duration-150",
                    selected
                      ? "border-[var(--brand-purple)]/30 bg-[var(--brand-purple-light)]/45 text-[var(--brand-text)]"
                      : "border-[var(--brand-purple)]/[0.1] bg-white text-[var(--brand-text-muted)] hover:border-[var(--brand-purple)]/20 hover:text-[var(--brand-text)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-[var(--brand-purple)]"
                        : "border-[var(--brand-purple)]/30"
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--brand-purple)]" />
                    ) : null}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <section className="space-y-4">
        <Field label="Psychologist" required error={fieldErrors.psychologistId}>
          <Select
            aria-label="Psychologist"
            value={form.psychologistId}
            onValueChange={(next) => updateField("psychologistId", next)}
            placeholder="Select psychologist"
            options={psychologists.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            disabled={
              saving ||
              deleting ||
              loadingOptions ||
              Boolean(overrideFromRule) ||
              Boolean(slot?.psychologistId)
            }
          />
        </Field>

        <Field label="Reason" required error={fieldErrors.reason}>
          <Select
            aria-label="Reason"
            value={form.reason}
            onValueChange={(next) => updateField("reason", next)}
            options={BLOCK_REASON_OPTIONS}
            disabled={saving || deleting || loadingOptions}
            searchThreshold={0}
          />
        </Field>

        {form.reason === "other" ? (
          <Field label="Title" required error={fieldErrors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              disabled={saving || deleting}
              placeholder="e.g. Staff retreat"
              className={cn(adminControlInputClass, "w-full px-3")}
            />
          </Field>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn(detailSectionTitleClass, "mb-0")}>Schedule</h3>
          {!isRecurring ? (
            <Checkbox
              id="block-all-day"
              checked={form.allDay}
              onChange={(checked) => updateField("allDay", checked)}
              label="All Day"
              disabled={saving || deleting}
            />
          ) : null}
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <ScheduleEndpoint
            label="From"
            date={form.startDate}
            time={form.startTime}
            showDate={showDates}
            showTime={showTimes}
            onDateChange={(next) => updateField("startDate", next)}
            onTimeChange={(next) => updateField("startTime", next)}
            dateError={fieldErrors.startDate}
            timeError={fieldErrors.startTime}
            minDate={editingBlock ? undefined : getClinicToday()}
            disabled={saving || deleting || loadingOptions}
            lockDate={Boolean(slot?.selectedDate)}
          />

          <div
            className="flex shrink-0 items-center self-center pt-5"
            aria-hidden
          >
            <ArrowDown
              className="h-4 w-4 text-[var(--brand-text-muted)]/70"
              strokeWidth={1.75}
            />
          </div>

          <ScheduleEndpoint
            label="To"
            date={form.endDate}
            time={form.endTime}
            showDate={showDates}
            showTime={showTimes}
            onDateChange={(next) => updateField("endDate", next)}
            onTimeChange={(next) => updateField("endTime", next)}
            dateError={fieldErrors.endDate}
            timeError={fieldErrors.endTime}
            minDate={showDates ? form.startDate || getClinicToday() : undefined}
            disabled={saving || deleting || loadingOptions}
            lockDate={Boolean(slot?.selectedDate)}
          />
        </div>

        {isRecurring ? (
          <>
            <Field label="Repeat" required error={fieldErrors.recurrenceType}>
              <Select
                aria-label="Repeat"
                value={form.recurrenceType}
                onValueChange={(next) =>
                  updateField("recurrenceType", next as BlockRecurrenceType)
                }
                options={BLOCK_REPEAT_OPTIONS}
                disabled={saving || deleting || loadingOptions}
                searchThreshold={0}
              />
            </Field>

            {form.recurrenceType === "custom" ? (
              <>
                <Field label="Every">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={form.recurrenceInterval}
                      onChange={(e) =>
                        updateField("recurrenceInterval", e.target.value)
                      }
                      disabled={saving || deleting}
                      className={cn(
                        adminControlInputClass,
                        "w-20 px-3 text-center"
                      )}
                    />
                    <span className="text-sm text-[var(--brand-text-muted)]">
                      week(s)
                    </span>
                  </div>
                </Field>
                <div className="space-y-1.5">
                  <span className={detailLabelClass}>Repeat On</span>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAY_OPTIONS.map((d) => (
                      <Checkbox
                        key={d.day}
                        id={`block-day-${d.day}`}
                        checked={form.recurrenceDays.includes(d.day)}
                        onChange={() => toggleDay(d.day)}
                        label={d.label}
                        disabled={saving || deleting}
                      />
                    ))}
                  </div>
                  {fieldErrors.recurrenceDays ? (
                    <p className="text-sm text-[#8C5C68]">
                      {fieldErrors.recurrenceDays}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="space-y-4">
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            disabled={saving || deleting}
            placeholder="Optional notes"
            className={cn(
              adminControlInputClass,
              "h-auto w-full resize-y px-3 py-2"
            )}
          />
        </Field>
      </section>

      {loadingOptions ? (
        <p className="text-sm text-[var(--brand-text-muted)]">
          Loading options…
        </p>
      ) : null}

      {editingBlock ? (
        <EntityActivityTimeline
          entityType="block"
          entityId={editingBlock.id}
          variant="plain"
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Block?"
        description={
          isRecurring
            ? "This will permanently delete this recurring block and remove all future occurrences from the calendar."
            : "This will permanently delete this block."
        }
        confirmLabel="Delete Block"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
