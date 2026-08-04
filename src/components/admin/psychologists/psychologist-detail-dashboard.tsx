"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Mail,
  Tags,
} from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminEditableCardHeader } from "@/components/admin/admin-editable-card-header";
import { EditableAvatarUpload } from "@/components/admin/editable-avatar-upload";
import {
  AvailabilityCard,
  PsychologistTimelineCard,
  ServicesCard,
  UnavailableBlocksCard,
  UpcomingAppointmentsCard,
  type PsychologistTimelineEvent,
} from "@/components/admin/psychologists/psychologist-detail-lists";
import { PsychologistStatusPill } from "@/components/admin/psychologists/psychologist-status-pill";
import {
  detailCardBodyClass,
  detailCardClass,
  detailIconClass,
  detailLabelClass,
  detailMutedClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import { adminControlInputClass } from "@/lib/admin-controls";
import { adminWideContainer } from "@/lib/admin-layout";
import { getPsychologistDisplay } from "@/lib/psychologist-display";
import { psychologistAdminPath } from "@/lib/psychologist-slugs";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  Service,
  UnavailableBlock,
} from "@/types/database";

interface AdminPsychologistDetailDashboardProps {
  psychologist: Psychologist;
  upcomingAppointments: AppointmentWithRelations[];
  totalAppointments: number;
  upcomingCount: number;
  completedCount: number;
  availabilityBlocks: AvailabilityBlock[];
  unavailableBlocks: UnavailableBlock[];
  allServices: Service[];
  enabledServiceIds: string[];
  timeline: PsychologistTimelineEvent[];
}

interface ProfileFormValues {
  name: string;
  title: string;
  email: string;
  license_number: string;
  bio: string;
  specialties: string;
  is_active: boolean;
}

function toFormValues(psychologist: Psychologist): ProfileFormValues {
  return {
    name: psychologist.name,
    title: psychologist.title ?? "",
    email: psychologist.email ?? "",
    license_number: psychologist.license_number ?? "",
    bio: psychologist.bio ?? "",
    specialties: (psychologist.specialties ?? []).join(", "),
    is_active: psychologist.is_active,
  };
}

function SummaryStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-0.5" : "space-y-1")}>
      <p className={detailLabelClass}>{label}</p>
      <p
        className={cn(
          detailValueClass,
          "font-medium",
          compact && "text-base tabular-nums leading-none"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Mobile-first card chrome for psychologist profile — desktop stays at shared tokens. */
const psychCardHeaderClass = "px-4 py-3.5 sm:px-6 sm:py-4";
const psychCardBodyClass = "p-4 sm:p-6";


function PsychologistSummaryCard({
  psychologist,
  totalAppointments,
  upcomingCount,
  completedCount,
}: {
  psychologist: Psychologist;
  totalAppointments: number;
  upcomingCount: number;
  completedCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const initialValues = useMemo(
    () => toFormValues(psychologist),
    [psychologist]
  );

  const saveProfile = useCallback(
    async (values: ProfileFormValues) => {
      const specialties = values.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/psychologists/${psychologist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          title: values.title.trim() || null,
          email: values.email.trim() || null,
          license_number: values.license_number.trim() || null,
          bio: values.bio.trim() || null,
          specialties,
          is_active: values.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.error === "string"
            ? data.error
            : `Couldn't save profile (${res.status})`;

        if (process.env.NODE_ENV === "development") {
          console.error("[saveProfile] PATCH failed:", res.status, data);
        }

        throw new Error(message);
      }

      const data = (await res.json().catch(() => ({}))) as {
        psychologist?: Psychologist;
      };
      const nextSlug = data.psychologist?.slug;
      if (nextSlug && nextSlug !== psychologist.slug) {
        router.replace(psychologistAdminPath(nextSlug));
      }
    },
    [psychologist.id, psychologist.slug, router]
  );

  const { values, setValues, status, flush } = useAdminAutosave({
    initialValues,
    enabled: editing,
    onSave: saveProfile,
  });

  const display = getPsychologistDisplay(
    psychologist.id,
    editing ? values.name : psychologist.name,
    editing ? values.title : psychologist.title,
    editing
      ? values.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : psychologist.specialties,
    {
      bio: editing ? values.bio : psychologist.bio,
      photoUrl: psychologist.photo_url,
      slug: psychologist.slug,
    }
  );

  function startEditing() {
    setEditing(true);
  }

  async function closeEditing() {
    await flush();
    setEditing(false);
  }

  return (
    <section className={detailCardClass}>
      <AdminEditableCardHeader
        title="Profile"
        editing={editing}
        status={status}
        onEdit={startEditing}
        onClose={closeEditing}
        editLabel="Edit profile"
        closeLabel="Close profile editor"
        className={psychCardHeaderClass}
      />

      <div className={cn(detailCardBodyClass, psychCardBodyClass, "space-y-5 sm:space-y-7")}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <EditableAvatarUpload
            uploadUrl={`/api/admin/psychologists/${psychologist.id}/photo`}
            name={editing ? values.name : psychologist.name}
            src={display.photo}
            size="xl"
            avatarClassName="h-[5.25rem] w-[5.25rem] text-xl sm:h-[6.5rem] sm:w-[6.5rem] sm:text-2xl"
          />
          <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
            {editing ? (
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className={detailLabelClass}>Full name</span>
                  <input
                    value={values.name}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className={cn(adminControlInputClass, "w-full px-3")}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={detailLabelClass}>Professional title</span>
                  <input
                    value={values.title}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className={cn(adminControlInputClass, "w-full px-3")}
                  />
                </label>
              </div>
            ) : (
              <>
                <h2 className="font-heading text-[1.375rem] font-semibold leading-snug tracking-tight text-[var(--brand-text)] sm:text-[1.75rem] sm:leading-tight">
                  {psychologist.name}
                </h2>
                {psychologist.title && (
                  <p
                    className={cn(
                      detailMutedClass,
                      "text-[13px] leading-relaxed sm:text-[15px]"
                    )}
                  >
                    {psychologist.title}
                  </p>
                )}
              </>
            )}
            <PsychologistStatusPill
              isActive={editing ? values.is_active : psychologist.is_active}
              className="px-2.5 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs"
            />
          </div>
        </div>

        {editing ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className={detailLabelClass}>Email</span>
                <input
                  type="email"
                  value={values.email}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className={cn(adminControlInputClass, "w-full px-3")}
                />
              </label>
              <label className="space-y-1.5">
                <span className={detailLabelClass}>PRC license number</span>
                <input
                  value={values.license_number}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      license_number: e.target.value,
                    }))
                  }
                  className={cn(adminControlInputClass, "w-full px-3")}
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className={detailLabelClass}>
                  Specialties (comma-separated)
                </span>
                <input
                  value={values.specialties}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      specialties: e.target.value,
                    }))
                  }
                  className={cn(adminControlInputClass, "w-full px-3")}
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className={detailLabelClass}>Bio / intro</span>
                <textarea
                  value={values.bio}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  rows={3}
                  className={cn(
                    adminControlInputClass,
                    "h-auto w-full resize-y px-3 py-2"
                  )}
                />
              </label>
            </div>

            <Checkbox
              checked={values.is_active}
              onChange={(checked) =>
                setValues((prev) => ({ ...prev, is_active: checked }))
              }
              label="Active on public booking pages"
            />
          </div>
        ) : (
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <Mail
                  className={cn(detailIconClass, "mt-0.5")}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div className="min-w-0 space-y-0.5">
                  <p className={detailLabelClass}>Email</p>
                  <p className={cn(detailValueClass, "leading-relaxed break-words")}>
                    {psychologist.email?.trim() || "—"}
                  </p>
                </div>
              </div>
              {psychologist.license_number?.trim() && (
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <BadgeCheck
                    className={cn(detailIconClass, "mt-0.5")}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className={detailLabelClass}>PRC License Number</p>
                    <p className={cn(detailValueClass, "leading-relaxed")}>
                      {psychologist.license_number}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5 sm:gap-3">
                <Tags
                  className={cn(detailIconClass, "mt-0.5")}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <p className={detailLabelClass}>Specialties</p>
                  {(psychologist.specialties ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {psychologist.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full bg-[var(--brand-purple-light)]/70 px-2 py-0.5 text-[11px] font-medium leading-4 text-[var(--brand-purple)] sm:px-2.5 sm:text-xs sm:leading-5"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={detailMutedClass}>—</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile — compact stats strip */}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[var(--brand-cream)]/40 px-3 py-3 sm:hidden">
              <SummaryStat
                compact
                label="Total"
                value={String(totalAppointments)}
              />
              <SummaryStat
                compact
                label="Upcoming"
                value={String(upcomingCount)}
              />
              <SummaryStat
                compact
                label="Completed"
                value={String(completedCount)}
              />
            </div>

            {/* Desktop — stacked stats */}
            <div className="hidden space-y-5 sm:block">
              <SummaryStat
                label="Total Appointments"
                value={String(totalAppointments)}
              />
              <SummaryStat
                label="Upcoming Appointments"
                value={String(upcomingCount)}
              />
              <SummaryStat
                label="Completed Appointments"
                value={String(completedCount)}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminPsychologistDetailDashboard({
  psychologist,
  upcomingAppointments,
  totalAppointments,
  upcomingCount,
  completedCount,
  availabilityBlocks,
  unavailableBlocks,
  allServices,
  enabledServiceIds,
  timeline,
}: AdminPsychologistDetailDashboardProps) {
  return (
    <div className={cn(adminWideContainer, "px-4 py-5 sm:px-8 sm:py-8")}>
      <div className="mb-5 space-y-2.5 sm:mb-8 sm:space-y-4">
        <AdminBackLink fallbackHref="/admin/psychologists" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80 sm:text-xs">
            Psychologist Profile
          </p>
          <h1
            className={cn(
              type.pageTitle,
              "mt-1 text-[1.625rem] leading-tight sm:text-[36px] sm:leading-[1.2]"
            )}
          >
            {psychologist.name}
          </h1>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1fr_22rem] xl:items-start">
        <div className="space-y-4 sm:space-y-6">
          <PsychologistSummaryCard
            psychologist={psychologist}
            totalAppointments={totalAppointments}
            upcomingCount={upcomingCount}
            completedCount={completedCount}
          />
          <AvailabilityCard
            psychologistId={psychologist.id}
            blocks={availabilityBlocks}
          />
          <UnavailableBlocksCard
            psychologistId={psychologist.id}
            psychologistSlug={psychologist.slug}
            psychologistName={psychologist.name}
            blocks={unavailableBlocks}
          />
          <ServicesCard
            psychologistId={psychologist.id}
            allServices={allServices}
            enabledServiceIds={enabledServiceIds}
          />
          <UpcomingAppointmentsCard appointments={upcomingAppointments} />
        </div>

        <aside className="xl:sticky xl:top-24">
          <PsychologistTimelineCard events={timeline} />
        </aside>
      </div>
    </div>
  );
}
