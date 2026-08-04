import { formatInTimeZone } from "date-fns-tz";
import {
  getPaginationLabel,
  getVisiblePageNumbers,
  paginateAppointments,
} from "@/lib/admin-appointments-list";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import type {
  AppointmentWithRelations,
  Psychologist,
} from "@/types/database";

export const PSYCHOLOGISTS_LIST_PAGE_SIZE = 20;

export type PsychologistStatusFilter = "" | "active" | "inactive";
export type PsychologistSortField =
  | "name"
  | "upcoming"
  | "status"
  | "title";
export type PsychologistSortDirection = "asc" | "desc";

export interface PsychologistsListFilters {
  search: string;
  status: PsychologistStatusFilter;
  specialty: string;
}

export interface PsychologistListRow {
  psychologist: Psychologist;
  upcomingAppointment: AppointmentWithRelations | null;
  upcomingCount: number;
  totalAppointments: number;
  completedCount: number;
}

export const PSYCHOLOGIST_STATUS_FILTER_OPTIONS: {
  value: PsychologistStatusFilter;
  label: string;
}[] = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export {
  getPaginationLabel,
  getVisiblePageNumbers,
  paginateAppointments as paginatePsychologists,
};

const UPCOMING_STATUSES = new Set(["pending_payment", "confirmed"]);

export function formatPsychologistListDateTime(startAt: string): string {
  const date = formatInTimeZone(startAt, CLINIC_TIMEZONE, "EEE, MMM d");
  const time = formatInTimeZone(startAt, CLINIC_TIMEZONE, "h:mm a");
  return `${date} • ${time}`;
}

export function formatAvailabilityTime(time: string): string {
  const [hourRaw, minuteRaw] = time.slice(0, 5).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time.slice(0, 5);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function getUniqueSpecialties(
  psychologists: Psychologist[]
): string[] {
  const set = new Set<string>();
  for (const psychologist of psychologists) {
    for (const specialty of psychologist.specialties ?? []) {
      const trimmed = specialty.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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

export function buildPsychologistListRows(
  psychologists: Psychologist[],
  appointments: AppointmentWithRelations[]
): PsychologistListRow[] {
  const nowMs = Date.now();

  return psychologists.map((psychologist) => {
    const theirs = appointments.filter(
      (appointment) => appointment.psychologist_id === psychologist.id
    );
    const upcoming = theirs
      .filter((appointment) => isUpcomingAppointment(appointment, nowMs))
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );

    return {
      psychologist,
      upcomingAppointment: upcoming[0] ?? null,
      upcomingCount: upcoming.length,
      totalAppointments: theirs.length,
      completedCount: theirs.filter((a) => a.status === "completed").length,
    };
  });
}

export function filterPsychologists(
  rows: PsychologistListRow[],
  filters: PsychologistsListFilters
): PsychologistListRow[] {
  const q = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    const { psychologist } = row;

    if (q) {
      const haystack = [
        psychologist.name,
        psychologist.title ?? "",
        psychologist.email ?? "",
        psychologist.license_number ?? "",
        ...(psychologist.specialties ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.status === "active" && !psychologist.is_active) return false;
    if (filters.status === "inactive" && psychologist.is_active) return false;

    if (
      filters.specialty &&
      !(psychologist.specialties ?? []).includes(filters.specialty)
    ) {
      return false;
    }

    return true;
  });
}

export function sortPsychologists(
  rows: PsychologistListRow[],
  field: PsychologistSortField,
  direction: PsychologistSortDirection
): PsychologistListRow[] {
  const sorted = [...rows].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "name":
        comparison = a.psychologist.name.localeCompare(b.psychologist.name, undefined, {
          sensitivity: "base",
        });
        break;
      case "title":
        comparison = (a.psychologist.title ?? "").localeCompare(
          b.psychologist.title ?? "",
          undefined,
          { sensitivity: "base" }
        );
        break;
      case "upcoming": {
        const aTime = a.upcomingAppointment
          ? new Date(a.upcomingAppointment.start_at).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.upcomingAppointment
          ? new Date(b.upcomingAppointment.start_at).getTime()
          : Number.POSITIVE_INFINITY;
        comparison = aTime - bTime;
        break;
      }
      case "status":
        comparison =
          Number(b.psychologist.is_active) - Number(a.psychologist.is_active);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

export function exportPsychologistsToCsv(rows: PsychologistListRow[]): void {
  const headers = [
    "Name",
    "Title",
    "Email",
    "License",
    "Specialties",
    "Status",
    "Upcoming Appointment",
    "Total Appointments",
  ];

  const csvRows = rows.map((row) => [
    row.psychologist.name,
    row.psychologist.title ?? "",
    row.psychologist.email ?? "",
    row.psychologist.license_number ?? "",
    (row.psychologist.specialties ?? []).join("; "),
    row.psychologist.is_active ? "Active" : "Inactive",
    row.upcomingAppointment
      ? formatPsychologistListDateTime(row.upcomingAppointment.start_at)
      : "",
    String(row.totalAppointments),
  ]);

  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  const csv = [headers, ...csvRows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
  link.href = url;
  link.download = `psychologists-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
