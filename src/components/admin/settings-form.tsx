"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailMutedClass,
  detailSectionTitleClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { AdminSaveStatusIndicator } from "@/components/admin/admin-save-status";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { adminControlInputClass } from "@/lib/admin-controls";
import type { AdminSaveStatus } from "@/hooks/use-admin-autosave";
import { cn } from "@/lib/utils";
import type { ClinicSetting } from "@/types/database";

interface SettingsFormProps {
  settings: ClinicSetting[];
  /** When set, only render these section ids (in this order). */
  groupIds?: string[];
}

type SettingControl = "boolean" | "number" | "timezone" | "text";

interface SettingMeta {
  key: string;
  title: string;
  control: SettingControl;
}

interface SettingGroup {
  id: string;
  title: string;
  keys: string[];
}

const SAVE_DEBOUNCE_MS = 650;
const SAVED_VISIBLE_MS = 2000;

const SETTING_META: Record<string, SettingMeta> = {
  allow_admin_booking_without_payment: {
    key: "allow_admin_booking_without_payment",
    title: "Allow Admin Booking Without Payment",
    control: "boolean",
  },
  allow_same_day_booking: {
    key: "allow_same_day_booking",
    title: "Allow Same-Day Booking",
    control: "boolean",
  },
  default_timezone: {
    key: "default_timezone",
    title: "Default Timezone",
    control: "timezone",
  },
  minimum_advance_booking_hours: {
    key: "minimum_advance_booking_hours",
    title: "Minimum Advance Booking Hours",
    control: "number",
  },
  payment_hold_hours: {
    key: "payment_hold_hours",
    title: "Payment Hold Hours",
    control: "number",
  },
};

const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "booking",
    title: "Booking",
    keys: [
      "allow_admin_booking_without_payment",
      "allow_same_day_booking",
      "default_timezone",
      "minimum_advance_booking_hours",
    ],
  },
  {
    id: "payment-configuration",
    title: "Payment Configuration",
    keys: ["payment_hold_hours"],
  },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Manila", label: "Asia/Manila" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "UTC", label: "UTC" },
];

const controlClass = cn(
  adminControlInputClass,
  "w-full max-w-[15rem] shrink-0 px-3 sm:w-[15rem]"
);

const BOOLEAN_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

function formatSettingTitle(key: string): string {
  return SETTING_META[key]?.title ?? key.replace(/_/g, " ");
}

function valuesEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  }
  return true;
}

function toAdminSaveStatus(status: "idle" | "saving" | "saved" | "error"): AdminSaveStatus {
  if (status === "saving") return "saving";
  if (status === "saved") return "saved";
  if (status === "error") return "error";
  return "idle";
}

function SettingControl({
  setting,
  value,
  onChange,
}: {
  setting: ClinicSetting;
  value: string;
  onChange: (value: string) => void;
}) {
  const meta = SETTING_META[setting.key];
  const control = meta?.control ?? "text";
  const id = `setting-${setting.key}`;

  if (control === "boolean") {
    return (
      <SegmentedControl
        id={id}
        value={value}
        options={[...BOOLEAN_OPTIONS]}
        onValueChange={onChange}
        aria-label={formatSettingTitle(setting.key)}
      />
    );
  }

  if (control === "timezone") {
    const options = TIMEZONE_OPTIONS.some((opt) => opt.value === value)
      ? TIMEZONE_OPTIONS
      : [{ value, label: value }, ...TIMEZONE_OPTIONS];

    return (
      <Select
        id={id}
        value={value}
        onValueChange={onChange}
        options={options}
        searchThreshold={0}
        aria-label={formatSettingTitle(setting.key)}
        className="w-full max-w-[15rem] shrink-0 sm:w-[15rem]"
      />
    );
  }

  return (
    <input
      id={id}
      type={control === "number" ? "number" : "text"}
      min={control === "number" ? 0 : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={controlClass}
      aria-label={formatSettingTitle(setting.key)}
    />
  );
}

function SettingRow({
  setting,
  value,
  onChange,
  isLast,
}: {
  setting: ClinicSetting;
  value: string;
  onChange: (value: string) => void;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        !isLast && "border-b border-[var(--brand-purple)]/[0.06]"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <label
          htmlFor={`setting-${setting.key}`}
          className="block text-sm font-medium text-[var(--brand-text)]"
        >
          {formatSettingTitle(setting.key)}
        </label>
        {setting.description && (
          <p className={cn(detailMutedClass, "max-w-xl text-[13px] leading-relaxed")}>
            {setting.description}
          </p>
        )}
      </div>
      <div className="shrink-0 sm:flex sm:justify-end">
        <SettingControl setting={setting} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function SettingsSection({
  id,
  title,
  settings,
  values,
  onChange,
  saveStatus,
}: {
  id: string;
  title: string;
  settings: ClinicSetting[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}) {
  return (
    <section id={id} className={detailCardClass}>
      <div
        className={cn(
          detailCardHeaderClass,
          "flex items-center justify-between gap-3"
        )}
      >
        <h2 className={detailSectionTitleClass}>{title}</h2>
        <AdminSaveStatusIndicator status={toAdminSaveStatus(saveStatus)} />
      </div>
      <div className={cn(detailCardBodyClass, "py-1 sm:py-2")}>
        {settings.map((setting, index) => (
          <SettingRow
            key={setting.key}
            setting={setting}
            value={values[setting.key] ?? setting.value}
            onChange={(next) => onChange(setting.key, next)}
            isLast={index === settings.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

export function SettingsForm({ settings, groupIds }: SettingsFormProps) {
  const router = useRouter();
  const initialValues = useMemo(
    () => Object.fromEntries(settings.map((s) => [s.key, s.value])),
    [settings]
  );

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saveStatusByGroup, setSaveStatusByGroup] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});

  const valuesRef = useRef(values);
  const lastSavedRef = useRef(initialValues);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const pendingGroupRef = useRef<string | null>(null);

  valuesRef.current = values;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedHideRef.current) clearTimeout(savedHideRef.current);
    };
  }, []);

  useEffect(() => {
    setValues(initialValues);
    lastSavedRef.current = initialValues;
  }, [initialValues]);

  const settingsByKey = useMemo(
    () => new Map(settings.map((setting) => [setting.key, setting])),
    [settings]
  );

  const groupedKeys = useMemo(
    () => new Set(SETTING_GROUPS.flatMap((group) => group.keys)),
    []
  );

  const groups = useMemo(() => {
    const knownGroups = SETTING_GROUPS.map((group) => ({
      ...group,
      settings: group.keys
        .map((key) => settingsByKey.get(key))
        .filter((setting): setting is ClinicSetting => Boolean(setting)),
    })).filter((group) => group.settings.length > 0);

    const orphanSettings = settings.filter(
      (setting) => !groupedKeys.has(setting.key)
    );

    if (orphanSettings.length > 0 && !groupIds) {
      knownGroups.push({
        id: "other",
        title: "Other",
        keys: orphanSettings.map((s) => s.key),
        settings: orphanSettings,
      });
    }

    if (!groupIds) return knownGroups;

    return groupIds
      .map((id) => knownGroups.find((group) => group.id === id))
      .filter((group): group is (typeof knownGroups)[number] => Boolean(group));
  }, [groupIds, groupedKeys, settings, settingsByKey]);

  async function persistSettings(
    nextValues: Record<string, string>,
    groupId: string
  ) {
    if (valuesEqual(nextValues, lastSavedRef.current)) {
      if (isMountedRef.current) {
        setSaveStatusByGroup((prev) => ({ ...prev, [groupId]: "idle" }));
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    if (isMountedRef.current) {
      setSaveStatusByGroup((prev) => ({ ...prev, [groupId]: "saving" }));
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: nextValues }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to save"
        );
      }

      if (requestId !== requestIdRef.current) return;

      lastSavedRef.current = nextValues;
      if (!isMountedRef.current) return;

      setSaveStatusByGroup((prev) => ({ ...prev, [groupId]: "saved" }));
      router.refresh();

      if (savedHideRef.current) clearTimeout(savedHideRef.current);
      savedHideRef.current = setTimeout(() => {
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setSaveStatusByGroup((prev) =>
            prev[groupId] === "saved" ? { ...prev, [groupId]: "idle" } : prev
          );
        }
      }, SAVED_VISIBLE_MS);
    } catch (error) {
      if (requestId !== requestIdRef.current || !isMountedRef.current) return;
      if (process.env.NODE_ENV === "development") {
        console.error("[SettingsForm] Save failed:", error);
      }
      setSaveStatusByGroup((prev) => ({ ...prev, [groupId]: "error" }));
    }
  }

  function scheduleSave(nextValues: Record<string, string>, groupId: string) {
    pendingGroupRef.current = groupId;

    if (savedHideRef.current) {
      clearTimeout(savedHideRef.current);
      savedHideRef.current = null;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (valuesEqual(nextValues, lastSavedRef.current)) {
      setSaveStatusByGroup((prev) => ({
        ...prev,
        [groupId]: prev[groupId] === "error" ? "error" : "idle",
      }));
      return;
    }

    setSaveStatusByGroup((prev) => ({ ...prev, [groupId]: "saving" }));

    debounceRef.current = setTimeout(() => {
      void persistSettings(
        valuesRef.current,
        pendingGroupRef.current ?? groupId
      );
    }, SAVE_DEBOUNCE_MS);
  }

  function handleChange(groupId: string, key: string, next: string) {
    setValues((prev) => {
      const updated = { ...prev, [key]: next };
      valuesRef.current = updated;
      scheduleSave(updated, groupId);
      return updated;
    });
  }

  return (
    <>
      {groups.map((group) => (
        <SettingsSection
          key={group.id}
          id={group.id}
          title={group.title}
          settings={group.settings}
          values={values}
          onChange={(key, value) => handleChange(group.id, key, value)}
          saveStatus={saveStatusByGroup[group.id] ?? "idle"}
        />
      ))}
    </>
  );
}
