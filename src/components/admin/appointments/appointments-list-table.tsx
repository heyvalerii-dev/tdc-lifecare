"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AdminAppointmentStatusPill } from "@/components/appointments/admin-appointment-status-pill";
import { getPsychologistIdentityColorById } from "@/lib/admin-calendar";
import {
  formatAppointmentListDateTime,
  getAppointmentClientName,
  type SortDirection,
  type SortField,
} from "@/lib/admin-appointments-list";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations, Psychologist } from "@/types/database";

interface AppointmentsListTableProps {
  appointments: AppointmentWithRelations[];
  psychologists: Psychologist[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const headerLabelClass =
  "text-[11px] font-medium uppercase tracking-wider text-[var(--brand-text-muted)]";

interface SortableHeaderProps {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const active = sortField === field;

  return (
    <th
      className={cn(
        "sticky top-0 z-[1] bg-[var(--brand-purple-light)]/35 px-4 py-3 text-left",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          headerLabelClass,
          "inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--brand-text)]"
        )}
      >
        {label}
        {active ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          )
        ) : (
          <span className="inline-block h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </th>
  );
}

function StaticHeader({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-[1] bg-[var(--brand-purple-light)]/35 px-4 py-3 text-left",
        className
      )}
    >
      <span className={headerLabelClass}>{label}</span>
    </th>
  );
}

function PsychologistCell({
  name,
  psychologistId,
  psychologists,
}: {
  name: string;
  psychologistId?: string;
  psychologists: Psychologist[];
}) {
  if (!name || name === "—") {
    return <span className="text-[var(--brand-text-muted)]">—</span>;
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: getPsychologistIdentityColorById(
            psychologistId,
            psychologists
          ),
        }}
        aria-hidden
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function AppointmentsListTable({
  appointments,
  psychologists,
  sortField,
  sortDirection,
  onSort,
}: AppointmentsListTableProps) {
  const router = useRouter();

  function openAppointment(id: string) {
    router.push(`/admin/appointments/${id}`);
  }

  return (
    <div className="hidden rounded-2xl border border-[var(--brand-purple)]/[0.08] bg-white lg:block">
      <div className="max-h-[calc(100vh-13rem)] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--brand-purple)]/[0.06] shadow-[0_1px_0_0_rgba(93,80,122,0.04)]">
              <SortableHeader
                label="Client"
                field="client"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <StaticHeader label="Service" />
              <SortableHeader
                label="Date & Time"
                field="date"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Psychologist"
                field="psychologist"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Status"
                field="status"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-purple)]/[0.05]">
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                onClick={() => openAppointment(appointment.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openAppointment(appointment.id);
                  }
                }}
                tabIndex={0}
                role="link"
                className="cursor-pointer transition-colors duration-150 ease-out hover:bg-[var(--brand-purple-light)]/20"
              >
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-[var(--brand-text)]">
                    {getAppointmentClientName(appointment)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[var(--brand-text-muted)]">
                  {appointment.service?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-[var(--brand-text)]">
                  {formatAppointmentListDateTime(appointment.start_at)}
                </td>
                <td className="px-4 py-3.5 text-[var(--brand-text)]">
                  <PsychologistCell
                    name={appointment.psychologist?.name ?? "—"}
                    psychologistId={appointment.psychologist_id}
                    psychologists={psychologists}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <AdminAppointmentStatusPill status={appointment.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
