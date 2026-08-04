"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ClientStatusPill } from "@/components/admin/clients/client-status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  getPsychologistIdentityColorById,
  getPsychologistShortName,
} from "@/lib/admin-calendar";
import {
  formatClientListDateTime,
  formatQuestionnaireSubmittedLabel,
  type ClientListRow,
  type ClientSortDirection,
  type ClientSortField,
} from "@/lib/admin-clients-list";
import { formatClinicDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Psychologist } from "@/types/database";

interface ClientsListTableProps {
  clients: ClientListRow[];
  psychologists: Psychologist[];
  sortField: ClientSortField;
  sortDirection: ClientSortDirection;
  onSort: (field: ClientSortField) => void;
}

const headerLabelClass =
  "text-[11px] font-medium uppercase tracking-wider text-[var(--brand-text-muted)]";

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  field: ClientSortField;
  sortField: ClientSortField;
  sortDirection: ClientSortDirection;
  onSort: (field: ClientSortField) => void;
  className?: string;
}) {
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

export function ClientsListTable({
  clients,
  psychologists,
  sortField,
  sortDirection,
  onSort,
}: ClientsListTableProps) {
  const router = useRouter();

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[var(--brand-purple)]/[0.08] bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)] lg:block">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortableHeader
                label="Client"
                field="name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <StaticHeader label="Assigned Psychologist" />
              <SortableHeader
                label="Last Appointment"
                field="last_appointment"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Next Appointment"
                field="next_appointment"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <StaticHeader label="Latest Questionnaire" />
              <StaticHeader label="Status" />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const psychologist = client.assignedPsychologist;

              return (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/admin/clients/${client.id}`)}
                  className="cursor-pointer border-t border-[var(--brand-purple)]/[0.05] transition-colors duration-150 hover:bg-[var(--brand-purple-light)]/25"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={client.name}
                        email={client.email}
                        src={client.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--brand-text)]">
                          {client.name}
                        </p>
                        <p className="truncate text-xs text-[var(--brand-text-muted)]">
                          Since {formatClinicDate(client.clientSince, "MMM yyyy")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--brand-text)]">
                    {psychologist ? (
                      <span className="inline-flex max-w-full items-center gap-1.5">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: getPsychologistIdentityColorById(
                              psychologist.id,
                              psychologists
                            ),
                          }}
                          aria-hidden
                        />
                        <span className="truncate">
                          {getPsychologistShortName(psychologist.name)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[var(--brand-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[var(--brand-text-muted)]">
                    {client.lastAppointment
                      ? formatClientListDateTime(client.lastAppointment.start_at)
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[var(--brand-text-muted)]">
                    {client.nextAppointment
                      ? formatClientListDateTime(client.nextAppointment.start_at)
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    {client.latestQuestionnaire ? (
                      <div className="min-w-0">
                        <p className="truncate text-[var(--brand-text)]">
                          {client.latestQuestionnaire.title}
                        </p>
                        <p className="truncate text-xs text-[var(--brand-text-muted)]">
                          {formatQuestionnaireSubmittedLabel(
                            client.latestQuestionnaire.submittedAt
                          )}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[var(--brand-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <ClientStatusPill status={client.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
