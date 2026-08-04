"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocalAvatarPicker } from "@/components/admin/clients/local-avatar-picker";
import {
  detailLabelClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { AppDrawer } from "@/components/ui/app-drawer";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import {
  adminControlInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin-controls";
import { CLIENT_SEX_OPTIONS } from "@/lib/client-profile";
import { getClinicToday } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { ClientSex, Psychologist } from "@/types/database";

const SEX_OPTIONS = CLIENT_SEX_OPTIONS;

const sectionOptionalClass =
  "text-xs font-normal leading-snug text-[var(--brand-text-muted)]";

interface NewClientFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birthdate: string;
  sex: ClientSex | "";
  assigned_psychologist_id: string;
  is_active: boolean;
  address: string;
  city: string;
  province: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
}

const EMPTY_FORM: NewClientFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  birthdate: "",
  sex: "",
  assigned_psychologist_id: "",
  is_active: true,
  address: "",
  city: "",
  province: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
};

interface NewClientDrawerProps {
  open: boolean;
  onClose: () => void;
  psychologists: Psychologist[];
}

export function NewClientDrawer({
  open,
  onClose,
  psychologists,
}: NewClientDrawerProps) {
  const router = useRouter();
  const [form, setForm] = useState<NewClientFormState>(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof NewClientFormState, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setError(null);
    setFieldErrors({});
    setSaving(false);
  }, [open]);

  const displayName = useMemo(() => {
    const name = `${form.first_name} ${form.last_name}`.trim();
    return name || "New client";
  }, [form.first_name, form.last_name]);

  const psychologistOptions = useMemo(
    () =>
      [...psychologists]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ value: p.id, label: p.name })),
    [psychologists]
  );

  function updateField<K extends keyof NewClientFormState>(
    key: K,
    value: NewClientFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Partial<Record<keyof NewClientFormState, string>> = {};
    if (!form.first_name.trim()) next.first_name = "Required";
    if (!form.last_name.trim()) next.last_name = "Required";
    if (!form.email.trim()) {
      next.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate() {
    if (saving) return;
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          birthdate: form.birthdate || null,
          sex: form.sex || null,
          assigned_psychologist_id: form.assigned_psychologist_id || null,
          is_active: form.is_active,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          emergency_contact_name: form.emergency_contact_name.trim() || null,
          emergency_contact_relationship:
            form.emergency_contact_relationship.trim() || null,
          emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not create client");
      }

      const clientId = data.client?.id as string | undefined;
      if (!clientId) {
        throw new Error("Client created but no id returned");
      }

      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        await fetch(`/api/admin/clients/${clientId}/photo`, {
          method: "POST",
          body: formData,
        });
      }

      onClose();
      router.push(`/admin/clients/${clientId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create client");
      setSaving(false);
    }
  }

  return (
    <AppDrawer
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="New Client"
      subtitle="Create a client profile for a walk-in, phone booking, or manually entered client."
      primaryLabel="Create Client"
      onPrimary={handleCreate}
      primaryLoading={saving}
      primaryDisabled={saving}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={adminSecondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className={adminPrimaryButtonClass}
          >
            {saving ? "Creating…" : "Create Client"}
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="space-y-5">
          <h3 className={detailSectionTitleClass}>Profile</h3>

          <div className="grid gap-6 sm:grid-cols-3 sm:items-start sm:gap-6">
            <div className="flex justify-center sm:col-span-1 sm:justify-start">
              <LocalAvatarPicker
                name={displayName}
                file={photoFile}
                onChange={setPhotoFile}
                size="2xl"
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <Field
                label="First Name"
                error={fieldErrors.first_name}
                required
              >
                <input
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  className={cn(adminControlInputClass, "w-full px-3")}
                  autoFocus
                  disabled={saving}
                />
              </Field>
              <Field label="Last Name" error={fieldErrors.last_name} required>
                <input
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  className={cn(adminControlInputClass, "w-full px-3")}
                  disabled={saving}
                />
              </Field>
              <Field label="Email" error={fieldErrors.email} required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={cn(adminControlInputClass, "w-full px-3")}
                  disabled={saving}
                  autoComplete="off"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={cn(adminControlInputClass, "w-full px-3")}
                  disabled={saving}
                />
              </Field>
              <Field label="Birthdate">
                <DatePicker
                  aria-label="Birthdate"
                  value={form.birthdate}
                  onChange={(next) => updateField("birthdate", next)}
                  max={getClinicToday()}
                  placeholder="Select birthdate"
                  disabled={saving}
                />
              </Field>
              <Field label="Sex">
                <Select
                  aria-label="Sex"
                  value={form.sex}
                  onValueChange={(next) =>
                    updateField("sex", next as ClientSex | "")
                  }
                  options={SEX_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  disabled={saving}
                  searchThreshold={0}
                />
              </Field>
              <Field label="Assigned Psychologist">
                <Select
                  aria-label="Assigned Psychologist"
                  value={form.assigned_psychologist_id}
                  onValueChange={(next) =>
                    updateField("assigned_psychologist_id", next)
                  }
                  options={[
                    { value: "", label: "Unassigned" },
                    ...psychologistOptions,
                  ]}
                  disabled={saving}
                />
              </Field>
              <Field label="Status">
                <Select
                  aria-label="Status"
                  value={form.is_active ? "active" : "inactive"}
                  onValueChange={(next) =>
                    updateField("is_active", next === "active")
                  }
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  disabled={saving}
                  searchThreshold={0}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-1">
            <h3 className={detailSectionTitleClass}>Address</h3>
            <p className={sectionOptionalClass}>Optional</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address" className="sm:col-span-2">
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className={cn(adminControlInputClass, "w-full px-3")}
                disabled={saving}
              />
            </Field>
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className={cn(adminControlInputClass, "w-full px-3")}
                disabled={saving}
              />
            </Field>
            <Field label="Province">
              <input
                value={form.province}
                onChange={(e) => updateField("province", e.target.value)}
                className={cn(adminControlInputClass, "w-full px-3")}
                disabled={saving}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-1">
            <h3 className={detailSectionTitleClass}>Emergency Contact</h3>
            <p className={sectionOptionalClass}>Optional</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={form.emergency_contact_name}
                onChange={(e) =>
                  updateField("emergency_contact_name", e.target.value)
                }
                className={cn(adminControlInputClass, "w-full px-3")}
                disabled={saving}
              />
            </Field>
            <Field label="Relationship">
              <input
                value={form.emergency_contact_relationship}
                onChange={(e) =>
                  updateField("emergency_contact_relationship", e.target.value)
                }
                className={cn(adminControlInputClass, "w-full px-3")}
                disabled={saving}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) =>
                  updateField("emergency_contact_phone", e.target.value)
                }
                className={cn(adminControlInputClass, "w-full px-3")}
                disabled={saving}
              />
            </Field>
          </div>
        </section>

        {error && <p className="text-sm text-[#8C5C68]">{error}</p>}
      </div>
    </AppDrawer>
  );
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className={detailLabelClass}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error && <p className="text-xs text-[#8C5C68]">{error}</p>}
    </label>
  );
}
