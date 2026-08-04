"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Trash2 } from "lucide-react";
import { AdminCardAddButton } from "@/components/admin/admin-card-add-button";
import { AdminCardEditButton } from "@/components/admin/admin-card-edit-button";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailLabelClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  adminControlInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import type { Service } from "@/types/database";

interface ServicesSettingsSectionProps {
  services: Service[];
}

type ServiceFormState = {
  name: string;
  description: string;
  price_pesos: string;
  duration_minutes: string;
  buffer_minutes: string;
  is_active: boolean;
};

const EMPTY_FORM: ServiceFormState = {
  name: "",
  description: "",
  price_pesos: "3500",
  duration_minutes: "60",
  buffer_minutes: "30",
  is_active: true,
};

function toFormState(service: Service): ServiceFormState {
  return {
    name: service.name,
    description: service.description ?? "",
    price_pesos: (service.price_cents / 100).toFixed(
      service.price_cents % 100 === 0 ? 0 : 2
    ),
    duration_minutes: String(service.duration_minutes),
    buffer_minutes: String(service.buffer_minutes),
    is_active: service.is_active,
  };
}

function parsePesosToCents(value: string): number {
  const pesos = Number(value);
  if (!Number.isFinite(pesos) || pesos < 0) return NaN;
  return Math.round(pesos * 100);
}

function toPayload(form: ServiceFormState) {
  const price_cents = parsePesosToCents(form.price_pesos);
  const duration_minutes = Number(form.duration_minutes);
  const buffer_minutes = Number(form.buffer_minutes);

  if (!form.name.trim()) {
    throw new Error("Name is required");
  }
  if (!Number.isFinite(price_cents)) {
    throw new Error("Enter a valid price");
  }
  if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
    throw new Error("Duration must be greater than 0");
  }
  if (
    !Number.isFinite(buffer_minutes) ||
    buffer_minutes < 0 ||
    buffer_minutes > 240
  ) {
    throw new Error("Buffer must be between 0 and 240 minutes");
  }

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price_cents,
    duration_minutes: Math.round(duration_minutes),
    buffer_minutes: Math.round(buffer_minutes),
    is_active: form.is_active,
  };
}

export function ServicesSettingsSection({
  services,
}: ServicesSettingsSectionProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editingService);

  useEffect(() => {
    if (!drawerOpen) return;
    setForm(editingService ? toFormState(editingService) : EMPTY_FORM);
    setError(null);
  }, [drawerOpen, editingService]);

  function openCreate() {
    setEditingService(null);
    setDrawerOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (saving || deleting) return;
    setDrawerOpen(false);
    setEditingService(null);
    setError(null);
  }

  function updateField<K extends keyof ServiceFormState>(
    key: K,
    value: ServiceFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const payload = toPayload(form);
      const res = await fetch(
        isEdit
          ? `/api/admin/services/${editingService!.id}`
          : "/api/admin/services",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Couldn't save service (${res.status})`
        );
      }

      setDrawerOpen(false);
      setEditingService(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save service");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteService() {
    if (!editingService) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/services/${editingService.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Couldn't delete service (${res.status})`
        );
      }

      setDeleteConfirmOpen(false);
      setDrawerOpen(false);
      setEditingService(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete service");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  function requestDelete(service: Service) {
    setEditingService(service);
    setDeleteConfirmOpen(true);
  }

  return (
    <>
      <section id="services" className={detailCardClass}>
        <div
          className={cn(
            detailCardHeaderClass,
            "flex items-center justify-between gap-3"
          )}
        >
          <h2 className={detailSectionTitleClass}>Services</h2>
          <AdminCardAddButton
            onClick={openCreate}
            label="Add service"
            className="hidden md:inline-flex"
          />
        </div>
        <div className={cn(detailCardBodyClass, "space-y-4")}>
          <p
            className={cn(
              detailMutedClass,
              "max-w-2xl text-[13px] leading-relaxed"
            )}
          >
            Clinic-wide services and pricing. Assign which services each
            psychologist offers from their profile.
          </p>

          {services.length === 0 ? (
            <p className={detailMutedClass}>No services configured yet.</p>
          ) : (
            <>
              {/* Mobile — one card per service */}
              <ul className="space-y-3 md:hidden">
                {services.map((service) => (
                  <li key={service.id}>
                    <article className="flex items-start gap-2 overflow-hidden rounded-xl border border-[var(--brand-purple)]/[0.08] bg-[var(--brand-cream)]/25 p-4">
                      <button
                        type="button"
                        onClick={() => openEdit(service)}
                        className={cn(
                          "min-w-0 flex-1 space-y-3 text-left",
                          "transition-colors duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-cream)]"
                        )}
                      >
                        <p className={cn(detailValueClass, "font-medium")}>
                          {service.name}
                        </p>
                        <dl className="space-y-2.5">
                          <div>
                            <dt className={detailLabelClass}>Duration</dt>
                            <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--brand-text)]">
                              <Clock3
                                className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text-muted)]"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                              {formatDuration(service.duration_minutes)}
                            </dd>
                          </div>
                          <div>
                            <dt className={detailLabelClass}>Price</dt>
                            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--brand-text)]">
                              {formatCurrency(service.price_cents)}
                            </dd>
                          </div>
                          <div>
                            <dt className={detailLabelClass}>Delivery methods</dt>
                            <dd className="mt-1 flex flex-wrap gap-1.5">
                              <Badge
                                status="confirmed"
                                label="In-clinic"
                                className="bg-[var(--brand-purple-light)]/50 px-2 py-0.5 text-[11px] font-medium leading-4 text-[var(--brand-text)]"
                              />
                              {!service.is_active && (
                                <Badge
                                  status="cancelled"
                                  label="Inactive"
                                  className="bg-[var(--brand-purple-light)]/60 px-2 py-0.5 text-[11px] font-medium leading-4 text-[var(--brand-text-muted)]"
                                />
                              )}
                            </dd>
                          </div>
                        </dl>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(service)}
                        disabled={deleting}
                        aria-label={`Delete ${service.name}`}
                        className={cn(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          "text-[var(--brand-text-muted)] transition-colors duration-150",
                          "hover:bg-[#F8EEF0] hover:text-[#8C5C68]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
                          "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                      >
                        <Trash2
                          className="h-4 w-4"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                    </article>
                  </li>
                ))}
              </ul>

              {/* Desktop — list layout unchanged */}
              <ul className="hidden divide-y divide-[var(--brand-purple)]/[0.06] md:block">
                {services.map((service) => (
                  <li
                    key={service.id}
                    className="group flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn(detailValueClass, "font-medium")}>
                          {service.name}
                        </p>
                        <Badge
                          status={service.is_active ? "confirmed" : "cancelled"}
                          label={service.is_active ? "Active" : "Inactive"}
                          className={cn(
                            "px-1.5 py-px text-[10px] font-medium leading-4",
                            service.is_active
                              ? "bg-[#E8F2EB] text-[#5C7A68]"
                              : "bg-[var(--brand-purple-light)]/60 text-[var(--brand-text-muted)]"
                          )}
                        />
                      </div>
                      {service.description?.trim() && (
                        <p
                          className={cn(
                            detailMutedClass,
                            "text-[13px] leading-relaxed"
                          )}
                        >
                          {service.description}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 text-sm text-[var(--brand-text-muted)]">
                        <Clock3
                          className="h-3.5 w-3.5 shrink-0 opacity-70"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span>
                          {formatDuration(service.duration_minutes)}
                          {" · "}
                          {service.buffer_minutes} min buffer
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-0.5">
                      <p className="text-right text-base font-semibold tabular-nums text-[var(--brand-text)] sm:text-lg">
                        {formatCurrency(service.price_cents)}
                      </p>
                      <AdminCardEditButton
                        onClick={() => openEdit(service)}
                        label={`Edit ${service.name}`}
                        className="opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <button
            type="button"
            onClick={openCreate}
            className={cn(adminPrimaryButtonClass, "w-full md:hidden")}
          >
            Add Service
          </button>
        </div>
      </section>

      <AppDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={isEdit ? "Edit Service" : "New Service"}
        subtitle={
          isEdit
            ? "Update pricing, duration, and availability for this service."
            : "Add a clinic service that psychologists can offer."
        }
        primaryLabel={isEdit ? "Save changes" : "Create service"}
        onPrimary={handleSave}
        primaryLoading={saving}
        primaryDisabled={deleting || !form.name.trim()}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-10">
              {isEdit && (
                <span className="group relative inline-flex">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={saving || deleting}
                    aria-label="Delete service"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                      "text-[var(--brand-text-muted)] transition-colors duration-150 ease-out",
                      "hover:bg-[#F8EEF0] hover:text-[#8C5C68]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 whitespace-nowrap rounded-lg border border-[#E8E2F2] bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-[var(--brand-text)] opacity-0 shadow-[0_8px_24px_rgba(93,80,122,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Delete service
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving || deleting}
                className={adminSecondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || deleting || !form.name.trim()}
                className={adminPrimaryButtonClass}
              >
                {saving
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create service"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <label className="block space-y-1.5">
            <span className={detailLabelClass}>Name</span>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={cn(adminControlInputClass, "w-full px-3")}
              placeholder="Therapy Session"
              autoFocus
            />
          </label>

          <label className="block space-y-1.5">
            <span className={detailLabelClass}>Description</span>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              className={cn(
                adminControlInputClass,
                "h-auto w-full resize-y px-3 py-2"
              )}
              placeholder="Optional"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className={detailLabelClass}>Price (₱)</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price_pesos}
                onChange={(e) => updateField("price_pesos", e.target.value)}
                className={cn(adminControlInputClass, "w-full px-3")}
              />
            </label>
            <label className="space-y-1.5">
              <span className={detailLabelClass}>Duration (min)</span>
              <input
                type="number"
                min={1}
                step={5}
                value={form.duration_minutes}
                onChange={(e) =>
                  updateField("duration_minutes", e.target.value)
                }
                className={cn(adminControlInputClass, "w-full px-3")}
              />
            </label>
            <label className="space-y-1.5">
              <span className={detailLabelClass}>Buffer (min)</span>
              <input
                type="number"
                min={0}
                max={240}
                step={5}
                value={form.buffer_minutes}
                onChange={(e) => updateField("buffer_minutes", e.target.value)}
                className={cn(adminControlInputClass, "w-full px-3")}
              />
            </label>
            <div className="flex items-end pb-1">
              <Checkbox
                checked={form.is_active}
                onChange={(checked) => updateField("is_active", checked)}
                label="Active"
              />
            </div>
          </div>

          {error && <p className="text-sm text-[#8C5C68]">{error}</p>}
        </div>
      </AppDrawer>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteConfirmOpen(open);
        }}
        title={
          editingService
            ? `Delete “${editingService.name}”?`
            : "Delete this service?"
        }
        description="This can’t be undone."
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={confirmDeleteService}
      />
    </>
  );
}
