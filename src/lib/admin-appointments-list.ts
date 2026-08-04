import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { getWeekStartMonday } from "@/lib/admin-calendar";
import { CLINIC_TIMEZONE } from "@/lib/constants";
import { getClinicToday } from "@/lib/datetime";
import type { AppointmentWithRelations, Service } from "@/types/database";

export const APPOINTMENTS_LIST_PAGE_SIZE = 20;

export type DateFilterPreset =
  | "all"
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "this_month"
  | "custom";

export type SortField = "client" | "date" | "psychologist" | "status";
export type SortDirection = "asc" | "desc";

export interface DateRange {
  start: string;
  end: string;
}

export interface AppointmentsListFilters {
  search: string;
  psychologistId: string;
  serviceId: string;
  status: string;
  datePreset: DateFilterPreset;
  customDateStart: string;
  customDateEnd: string;
}

export const DATE_FILTER_OPTIONS: { value: DateFilterPreset; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

export const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "pending_payment", label: "Awaiting Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
  { value: "expired", label: "Expired" },
];

const STATUS_SORT_ORDER: Record<string, number> = {
  pending_payment: 0,
  confirmed: 1,
  completed: 2,
  cancelled: 3,
  no_show: 4,
  expired: 5,
};

const ADMIN_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  expired: "Expired",
};

export function getAppointmentClientName(
  appointment: AppointmentWithRelations
): string {
  return (
    appointment.client?.full_name ??
    appointment.client?.email ??
    "Unknown client"
  );
}

export function formatAppointmentListDateTime(startAt: string): string {
  const date = formatInTimeZone(startAt, CLINIC_TIMEZONE, "EEE, MMM d");
  const time = formatInTimeZone(startAt, CLINIC_TIMEZONE, "h:mm a");
  return `${date} • ${time}`;
}

export function resolveDateFilterRange(
  preset: DateFilterPreset,
  customStart?: string,
  customEnd?: string
): DateRange | null {
  if (preset === "all") return null;

  const today = getClinicToday();
  const clinicNow = toZonedTime(new Date(), CLINIC_TIMEZONE);

  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "tomorrow": {
      const tomorrow = formatInTimeZone(
        addDays(clinicNow, 1),
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      return { start: tomorrow, end: tomorrow };
    }
    case "this_week": {
      const weekStart = getWeekStartMonday(new Date());
      const weekEnd = addDays(weekStart, 6);
      return {
        start: formatInTimeZone(weekStart, CLINIC_TIMEZONE, "yyyy-MM-dd"),
        end: formatInTimeZone(weekEnd, CLINIC_TIMEZONE, "yyyy-MM-dd"),
      };
    }
    case "next_week": {
      const nextWeekStart = addDays(getWeekStartMonday(new Date()), 7);
      const nextWeekEnd = addDays(nextWeekStart, 6);
      return {
        start: formatInTimeZone(nextWeekStart, CLINIC_TIMEZONE, "yyyy-MM-dd"),
        end: formatInTimeZone(nextWeekEnd, CLINIC_TIMEZONE, "yyyy-MM-dd"),
      };
    }
    case "this_month": {
      const monthStart = startOfMonth(clinicNow);
      const monthEnd = endOfMonth(clinicNow);
      return {
        start: formatInTimeZone(monthStart, CLINIC_TIMEZONE, "yyyy-MM-dd"),
        end: formatInTimeZone(monthEnd, CLINIC_TIMEZONE, "yyyy-MM-dd"),
      };
    }
    case "custom": {
      if (!customStart || !customEnd) return null;
      return {
        start: customStart <= customEnd ? customStart : customEnd,
        end: customStart <= customEnd ? customEnd : customStart,
      };
    }
    default:
      return null;
  }
}

export function matchesAppointmentSearch(
  appointment: AppointmentWithRelations,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    getAppointmentClientName(appointment),
    appointment.client?.email ?? "",
    appointment.psychologist?.name ?? "",
    appointment.service?.name ?? "",
  ];

  return fields.some((field) => field.toLowerCase().includes(q));
}

export function isAppointmentInDateRange(
  appointment: AppointmentWithRelations,
  range: DateRange | null
): boolean {
  if (!range) return true;
  const apptDate = formatInTimeZone(
    appointment.start_at,
    CLINIC_TIMEZONE,
    "yyyy-MM-dd"
  );
  return apptDate >= range.start && apptDate <= range.end;
}

export function filterAppointments(
  appointments: AppointmentWithRelations[],
  filters: AppointmentsListFilters
): AppointmentWithRelations[] {
  const range = resolveDateFilterRange(
    filters.datePreset,
    filters.customDateStart,
    filters.customDateEnd
  );

  return appointments.filter((appointment) => {
    if (!matchesAppointmentSearch(appointment, filters.search)) return false;
    if (
      filters.psychologistId &&
      appointment.psychologist_id !== filters.psychologistId
    ) {
      return false;
    }
    if (filters.serviceId && appointment.service_id !== filters.serviceId) {
      return false;
    }
    if (filters.status && appointment.status !== filters.status) {
      return false;
    }
    if (!isAppointmentInDateRange(appointment, range)) return false;
    return true;
  });
}

export function sortAppointments(
  appointments: AppointmentWithRelations[],
  field: SortField,
  direction: SortDirection
): AppointmentWithRelations[] {
  const sorted = [...appointments].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "client":
        comparison = getAppointmentClientName(a).localeCompare(
          getAppointmentClientName(b),
          undefined,
          { sensitivity: "base" }
        );
        break;
      case "date":
        comparison =
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
        break;
      case "psychologist":
        comparison = (a.psychologist?.name ?? "").localeCompare(
          b.psychologist?.name ?? "",
          undefined,
          { sensitivity: "base" }
        );
        break;
      case "status":
        comparison =
          (STATUS_SORT_ORDER[a.status] ?? 99) -
          (STATUS_SORT_ORDER[b.status] ?? 99);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

export function paginateAppointments<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; page: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    totalPages,
  };
}

export function getUniqueServicesFromAppointments(
  appointments: AppointmentWithRelations[]
): Service[] {
  const byId = new Map<string, Service>();
  for (const appointment of appointments) {
    if (appointment.service) {
      byId.set(appointment.service.id, appointment.service);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportAppointmentsToCsv(
  appointments: AppointmentWithRelations[]
): void {
  const headers = [
    "Client",
    "Service",
    "Date",
    "Time",
    "Psychologist",
    "Status",
  ];

  const rows = appointments.map((appointment) => [
    getAppointmentClientName(appointment),
    appointment.service?.name ?? "",
    formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "yyyy-MM-dd"),
    formatInTimeZone(appointment.start_at, CLINIC_TIMEZONE, "h:mm a"),
    appointment.psychologist?.name ?? "",
    ADMIN_STATUS_LABELS[appointment.status] ?? appointment.status,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `appointments-${formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getPaginationLabel(
  page: number,
  pageSize: number,
  total: number
): string {
  if (total === 0) return "Showing 0 of 0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `Showing ${start}–${end} of ${total}`;
}

export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage > 3) {
    pages.push("ellipsis");
  }

  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}
