"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Cake,
  HeartHandshake,
  Mail,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminEditableCardHeader } from "@/components/admin/admin-editable-card-header";
import { EntityActivityTimeline } from "@/components/admin/entity-activity-timeline";
import { ClientStaffNotesCard } from "@/components/admin/clients/client-staff-notes-card";
import {
  AppointmentHistoryCard,
  QuestionnairesCard,
  TimelineCard,
  type ClientQuestionnaireRow,
  type ClientTimelineEvent,
} from "@/components/admin/clients/client-detail-lists";
import { EditableAvatarUpload } from "@/components/admin/editable-avatar-upload";
import { PsychologistStatusPill } from "@/components/admin/psychologists/psychologist-status-pill";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import {
  detailCardBodyClass,
  detailCardClass,
  detailCardHeaderClass,
  detailIconClass,
  detailLabelClass,
  detailMutedClass,
  detailSectionTitleClass,
  detailStackGapClass,
  detailValueClass,
} from "@/components/admin/appointments/appointment-detail/detail-styles";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import {
  getPsychologistIdentityColorById,
  getPsychologistShortName,
} from "@/lib/admin-calendar";
import { adminControlInputClass } from "@/lib/admin-controls";
import { formatClientListDateTime } from "@/lib/admin-clients-list";
import { adminWideContainer } from "@/lib/admin-layout";
import {
  CLIENT_SEX_OPTIONS,
  formatClientBirthdate,
  formatClientSex,
} from "@/lib/client-profile";
import { formatClientSinceDate } from "@/lib/date-utils";
import { getClinicToday } from "@/lib/datetime";
import type { TimelineNote } from "@/lib/staff-notes";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  ClientSex,
  Profile,
  Psychologist,
} from "@/types/database";

interface AdminClientDetailDashboardProps {
  profile: Profile;
  appointments: AppointmentWithRelations[];
  questionnaireResponses: ClientQuestionnaireRow[];
  assignedPsychologist: Psychologist | null;
  nextAppointment: AppointmentWithRelations | null;
  lastAppointment: AppointmentWithRelations | null;
  psychologists: Psychologist[];
  timeline: ClientTimelineEvent[];
  staffNotes: TimelineNote[];
}

interface ClientProfileFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birthdate: string;
  sex: ClientSex | "";
  assigned_psychologist_id: string;
  is_active: boolean;
}

function toFormValues(profile: Profile): ClientProfileFormValues {
  const first =
    profile.first_name?.trim() ||
    profile.full_name?.trim().split(/\s+/)[0] ||
    "";
  const last =
    profile.last_name?.trim() ||
    profile.full_name?.trim().split(/\s+/).slice(1).join(" ") ||
    "";

  return {
    first_name: first,
    last_name: last,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    birthdate: profile.birthdate ?? "",
    sex: profile.sex ?? "",
    assigned_psychologist_id: profile.assigned_psychologist_id ?? "",
    is_active: profile.is_active !== false,
  };
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className={detailLabelClass}>{label}</p>
      <p className={cn(detailValueClass, "font-medium")}>{value}</p>
    </div>
  );
}

function ClientSummaryCard({
  profile,
  assignedPsychologist,
  nextAppointment,
  lastAppointment,
  totalAppointments,
  psychologists,
}: {
  profile: Profile;
  assignedPsychologist: Psychologist | null;
  nextAppointment: AppointmentWithRelations | null;
  lastAppointment: AppointmentWithRelations | null;
  totalAppointments: number;
  psychologists: Psychologist[];
}) {
  const [editing, setEditing] = useState(false);

  const initialValues = useMemo(() => toFormValues(profile), [profile]);

  const psychologistOptions = useMemo(() => {
    const sorted = [...psychologists].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    if (
      assignedPsychologist &&
      !sorted.some((p) => p.id === assignedPsychologist.id)
    ) {
      return [assignedPsychologist, ...sorted];
    }
    return sorted;
  }, [assignedPsychologist, psychologists]);

  const saveProfile = useCallback(
    async (values: ClientProfileFormValues) => {
      const res = await fetch(`/api/admin/clients/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || null,
          birthdate: values.birthdate || null,
          sex: values.sex || null,
          assigned_psychologist_id: values.assigned_psychologist_id || null,
          is_active: values.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.error === "string"
            ? data.error
            : `Couldn't save profile (${res.status})`;
        throw new Error(message);
      }
    },
    [profile.id]
  );

  const { values, setValues, status, flush } = useAdminAutosave({
    initialValues,
    enabled: editing,
    onSave: saveProfile,
  });

  const displayName = editing
    ? `${values.first_name} ${values.last_name}`.trim() || profile.email
    : profile.full_name?.trim() || profile.email;

  /** Single source of truth: profiles.assigned_psychologist_id (via server prop). */
  const viewAssigned = assignedPsychologist;

  const clientSince = formatClientSinceDate(profile.created_at);

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
      />

      <div className={cn(detailCardBodyClass, "space-y-7")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <EditableAvatarUpload
            uploadUrl={`/api/admin/clients/${profile.id}/photo`}
            name={displayName}
            src={profile.avatar_url}
            size="xl"
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={detailLabelClass}>First Name</span>
                  <input
                    value={values.first_name}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className={cn(adminControlInputClass, "w-full px-3")}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={detailLabelClass}>Last Name</span>
                  <input
                    value={values.last_name}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className={cn(adminControlInputClass, "w-full px-3")}
                  />
                </label>
              </div>
            ) : (
              <>
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-[var(--brand-text)] sm:text-[1.75rem]">
                  {displayName}
                </h2>
                {clientSince && (
                  <p className={cn(detailMutedClass, "text-[15px]")}>
                    {clientSince}
                  </p>
                )}
              </>
            )}
            {editing ? (
              <div className="max-w-xs space-y-1.5">
                <span className={detailLabelClass}>Status</span>
                <Select
                  aria-label="Status"
                  value={values.is_active ? "active" : "inactive"}
                  onValueChange={(next) =>
                    setValues((prev) => ({
                      ...prev,
                      is_active: next === "active",
                    }))
                  }
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  searchThreshold={0}
                />
              </div>
            ) : (
              <PsychologistStatusPill
                isActive={profile.is_active !== false}
              />
            )}
          </div>
        </div>

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
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
              <span className={detailLabelClass}>Phone</span>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, phone: e.target.value }))
                }
                className={cn(adminControlInputClass, "w-full px-3")}
              />
            </label>
            <div className="space-y-1.5">
              <span className={detailLabelClass}>Birthdate</span>
              <DatePicker
                aria-label="Birthdate"
                value={values.birthdate}
                onChange={(next) =>
                  setValues((prev) => ({
                    ...prev,
                    birthdate: next,
                  }))
                }
                max={getClinicToday()}
                placeholder="Select birthdate"
              />
            </div>
            <div className="space-y-1.5">
              <span className={detailLabelClass}>Sex</span>
              <Select
                aria-label="Sex"
                value={values.sex}
                onValueChange={(next) =>
                  setValues((prev) => ({
                    ...prev,
                    sex: next as ClientSex | "",
                  }))
                }
                options={CLIENT_SEX_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                searchThreshold={0}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <span className={detailLabelClass}>Assigned Psychologist</span>
              <Select
                aria-label="Assigned Psychologist"
                value={values.assigned_psychologist_id}
                onValueChange={(next) =>
                  setValues((prev) => ({
                    ...prev,
                    assigned_psychologist_id: next,
                  }))
                }
                options={[
                  { value: "", label: "Unassigned" },
                  ...psychologistOptions.map((psych) => ({
                    value: psych.id,
                    label: psych.name,
                  })),
                ]}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Mail className={detailIconClass} strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 space-y-0.5">
                  <p className={detailLabelClass}>Email</p>
                  <p className={detailValueClass}>{profile.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className={detailIconClass} strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 space-y-0.5">
                  <p className={detailLabelClass}>Phone</p>
                  <p className={detailValueClass}>
                    {profile.phone?.trim() || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Cake className={detailIconClass} strokeWidth={1.75} aria-hidden />
                <div className="min-w-0 space-y-0.5">
                  <p className={detailLabelClass}>Birthdate</p>
                  <p className={detailValueClass}>
                    {formatClientBirthdate(profile.birthdate)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserRound
                  className={detailIconClass}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div className="min-w-0 space-y-0.5">
                  <p className={detailLabelClass}>Sex</p>
                  <p className={detailValueClass}>
                    {formatClientSex(profile.sex)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HeartHandshake
                  className={detailIconClass}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div className="min-w-0 space-y-0.5">
                  <p className={detailLabelClass}>Assigned Psychologist</p>
                  {viewAssigned ? (
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-text)]">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: getPsychologistIdentityColorById(
                            viewAssigned.id,
                            psychologists
                          ),
                        }}
                        aria-hidden
                      />
                      {getPsychologistShortName(viewAssigned.name)}
                    </p>
                  ) : (
                    <p className={detailMutedClass}>—</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <SummaryStat
                label="Total Appointments"
                value={String(totalAppointments)}
              />
              <SummaryStat
                label="Upcoming Appointment"
                value={
                  nextAppointment
                    ? formatClientListDateTime(nextAppointment.start_at)
                    : "None scheduled"
                }
              />
              <SummaryStat
                label="Last Appointment"
                value={
                  lastAppointment
                    ? formatClientListDateTime(lastAppointment.start_at)
                    : "—"
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SessionNotesPlaceholderCard() {
  return (
    <section className={cn(detailCardClass, "border-dashed")}>
      <div className={detailCardHeaderClass}>
        <h2 className={detailSectionTitleClass}>Session Notes</h2>
      </div>
      <div className={cn(detailCardBodyClass, "flex items-start gap-3.5")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple-light)]/35">
          <StickyNote
            className="h-5 w-5 text-[var(--brand-purple)]/70"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>
        <div className="space-y-1.5">
          <p className={cn(detailValueClass, "font-medium")}>
            No session notes yet.
          </p>
          <p className={detailMutedClass}>
            Notes can be added after appointments are completed.
          </p>
        </div>
      </div>
    </section>
  );
}

export function AdminClientDetailDashboard({
  profile,
  appointments,
  questionnaireResponses,
  assignedPsychologist,
  nextAppointment,
  lastAppointment,
  psychologists,
  timeline,
  staffNotes,
}: AdminClientDetailDashboardProps) {
  const name = profile.full_name?.trim() || profile.email;

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <div className="mb-8 space-y-4">
        <AdminBackLink fallbackHref="/admin/clients" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80">
            Client Profile
          </p>
          <h1 className={cn(type.pageTitle, "mt-1")}>{name}</h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem] xl:items-start">
        <div className={detailStackGapClass}>
          <ClientSummaryCard
            profile={profile}
            assignedPsychologist={assignedPsychologist}
            nextAppointment={nextAppointment}
            lastAppointment={lastAppointment}
            totalAppointments={appointments.length}
            psychologists={psychologists}
          />
          <AppointmentHistoryCard appointments={appointments} />
          <QuestionnairesCard responses={questionnaireResponses} />
          <ClientStaffNotesCard clientId={profile.id} notes={staffNotes} />
          <EntityActivityTimeline entityType="client" entityId={profile.id} />
          <SessionNotesPlaceholderCard />
        </div>

        <aside className="xl:sticky xl:top-24">
          <TimelineCard events={timeline} />
        </aside>
      </div>
    </div>
  );
}
