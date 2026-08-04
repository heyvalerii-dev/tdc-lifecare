import { formatInTimeZone } from "date-fns-tz";
import {
  getPaginationLabel,
  getVisiblePageNumbers,
  paginateAppointments,
} from "@/lib/admin-appointments-list";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { formatClinicDate, formatClinicTime } from "@/lib/datetime";
import { getPsychologistShortName } from "@/lib/admin-calendar";
import type {
  AppointmentWithRelations,
  Profile,
  Psychologist,
  QuestionnaireResponse,
} from "@/types/database";

export const CLIENTS_LIST_PAGE_SIZE = 20;

export type ClientStatusFilter = "" | "active" | "no_upcoming" | "new";
export type ClientSortField =
  | "name"
  | "last_appointment"
  | "next_appointment"
  | "client_since";
export type ClientSortDirection = "asc" | "desc";

export type ClientLifecycleStatus = "active" | "no_upcoming" | "new";

export interface ClientsListFilters {
  search: string;
  psychologistId: string;
  status: ClientStatusFilter;
}

export interface ClientListRow {
  id: string;
  profile: Profile;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  clientSince: string;
  assignedPsychologist: Psychologist | null;
  lastAppointment: AppointmentWithRelations | null;
  nextAppointment: AppointmentWithRelations | null;
  latestQuestionnaire: {
    id: string;
    title: string;
    submittedAt: string;
    appointmentId: string | null;
  } | null;
  status: ClientLifecycleStatus;
  totalAppointments: number;
}

export const CLIENT_STATUS_FILTER_OPTIONS: {
  value: ClientStatusFilter;
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "no_upcoming", label: "No Upcoming Appointment" },
  { value: "new", label: "New" },
];

export const CLIENT_STATUS_LABELS: Record<ClientLifecycleStatus, string> = {
  active: "Active",
  no_upcoming: "No Upcoming Appointment",
  new: "New",
};

const UPCOMING_STATUSES = new Set(["pending_payment", "confirmed"]);
const HISTORY_STATUSES = new Set([
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "expired",
]);

export {
  getPaginationLabel,
  getVisiblePageNumbers,
  paginateAppointments as paginateClients,
};

export function getClientDisplayName(profile: Profile): string {
  return profile.full_name?.trim() || profile.email || "Unknown client";
}

export function formatClientListDateTime(startAt: string): string {
  const date = formatInTimeZone(startAt, CLINIC_TIMEZONE, "EEE, MMM d");
  const time = formatInTimeZone(startAt, CLINIC_TIMEZONE, "h:mm a");
  return `${date} • ${time}`;
}

function isUpcomingAppointment(
  appointment: AppointmentWithRelations,
  nowMs: number
): boolean {
  return (
    UPCOMING_STATUSES.has(appointment.status) &&
    new Date(appointment.start_at).getTime() >= nowMs
  );
}

function isPastOrCurrentAppointment(
  appointment: AppointmentWithRelations,
  nowMs: number
): boolean {
  if (!HISTORY_STATUSES.has(appointment.status)) return false;
  if (UPCOMING_STATUSES.has(appointment.status)) {
    return new Date(appointment.start_at).getTime() < nowMs;
  }
  return true;
}

export function buildClientListRows(
  profiles: Profile[],
  appointments: AppointmentWithRelations[],
  questionnaireResponses: Array<
    QuestionnaireResponse & {
      questionnaire?: { title?: string | null } | null;
    }
  >,
  /**
   * Lookup for `profiles.assigned_psychologist_id` — the single source of truth
   * for “Assigned Psychologist” (not appointment history).
   */
  psychologists: Psychologist[] = [],
  now: Date = new Date()
): ClientListRow[] {
  const nowMs = now.getTime();

  const psychologistsById = new Map(
    psychologists.map((psychologist) => [psychologist.id, psychologist])
  );

  const appointmentsByClient = new Map<string, AppointmentWithRelations[]>();
  for (const appointment of appointments) {
    const list = appointmentsByClient.get(appointment.client_id) ?? [];
    list.push(appointment);
    appointmentsByClient.set(appointment.client_id, list);
  }

  const responsesByClient = new Map<
    string,
    Array<
      QuestionnaireResponse & {
        questionnaire?: { title?: string | null } | null;
      }
    >
  >();
  for (const response of questionnaireResponses) {
    const list = responsesByClient.get(response.client_id) ?? [];
    list.push(response);
    responsesByClient.set(response.client_id, list);
  }

  return profiles.map((profile) => {
    const clientAppointments = [
      ...(appointmentsByClient.get(profile.id) ?? []),
    ].sort(
      (a, b) =>
        new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
    );

    const nextAppointment =
      clientAppointments
        .filter((a) => isUpcomingAppointment(a, nowMs))
        .sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        )[0] ?? null;

    const lastAppointment =
      clientAppointments.find((a) => isPastOrCurrentAppointment(a, nowMs)) ??
      null;

    const assignedPsychologist = profile.assigned_psychologist_id
      ? (psychologistsById.get(profile.assigned_psychologist_id) ?? null)
      : null;

    const latestResponse = [...(responsesByClient.get(profile.id) ?? [])].sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    )[0];

    let status: ClientLifecycleStatus = "new";
    if (nextAppointment) status = "active";
    else if (clientAppointments.length > 0) status = "no_upcoming";

    return {
      id: profile.id,
      profile,
      name: getClientDisplayName(profile),
      email: profile.email,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      clientSince: profile.created_at,
      assignedPsychologist,
      lastAppointment,
      nextAppointment,
      latestQuestionnaire: latestResponse
        ? {
            id: latestResponse.id,
            title: latestResponse.questionnaire?.title ?? "Questionnaire",
            submittedAt: latestResponse.submitted_at,
            appointmentId: latestResponse.appointment_id,
          }
        : null,
      status,
      totalAppointments: clientAppointments.length,
    };
  });
}

export function filterClients(
  clients: ClientListRow[],
  filters: ClientsListFilters
): ClientListRow[] {
  const q = filters.search.trim().toLowerCase();

  return clients.filter((client) => {
    if (q) {
      const haystack = [client.name, client.email, client.phone ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (
      filters.psychologistId &&
      client.assignedPsychologist?.id !== filters.psychologistId
    ) {
      return false;
    }

    if (filters.status && client.status !== filters.status) return false;

    return true;
  });
}

export function sortClients(
  clients: ClientListRow[],
  field: ClientSortField,
  direction: ClientSortDirection
): ClientListRow[] {
  const sorted = [...clients].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "name":
        comparison = a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        });
        break;
      case "last_appointment": {
        const aTime = a.lastAppointment
          ? new Date(a.lastAppointment.start_at).getTime()
          : 0;
        const bTime = b.lastAppointment
          ? new Date(b.lastAppointment.start_at).getTime()
          : 0;
        comparison = aTime - bTime;
        break;
      }
      case "next_appointment": {
        const aTime = a.nextAppointment
          ? new Date(a.nextAppointment.start_at).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.nextAppointment
          ? new Date(b.nextAppointment.start_at).getTime()
          : Number.POSITIVE_INFINITY;
        comparison = aTime - bTime;
        break;
      }
      case "client_since":
        comparison =
          new Date(a.clientSince).getTime() - new Date(b.clientSince).getTime();
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

export function exportClientsToCsv(clients: ClientListRow[]): void {
  const headers = [
    "Client",
    "Email",
    "Phone",
    "Assigned Psychologist",
    "Last Appointment",
    "Next Appointment",
    "Latest Questionnaire",
    "Status",
    "Client Since",
    "Total Appointments",
  ];

  const rows = clients.map((client) => [
    client.name,
    client.email,
    client.phone ?? "",
    client.assignedPsychologist
      ? getPsychologistShortName(client.assignedPsychologist.name)
      : "",
    client.lastAppointment
      ? formatClientListDateTime(client.lastAppointment.start_at)
      : "",
    client.nextAppointment
      ? formatClientListDateTime(client.nextAppointment.start_at)
      : "",
    client.latestQuestionnaire
      ? `${client.latestQuestionnaire.title} (${formatClinicDate(client.latestQuestionnaire.submittedAt)})`
      : "",
    CLIENT_STATUS_LABELS[client.status],
    formatClinicDate(client.clientSince, "MMM d, yyyy"),
    String(client.totalAppointments),
  ]);

  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
  link.href = url;
  link.download = `clients-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatQuestionnaireSubmittedLabel(submittedAt: string): string {
  return `${formatClinicDate(submittedAt, "MMM d, yyyy")} • ${formatClinicTime(submittedAt)}`;
}
