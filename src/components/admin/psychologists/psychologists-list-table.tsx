"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { PsychologistStatusPill } from "@/components/admin/psychologists/psychologist-status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  formatPsychologistListDateTime,
  type PsychologistListRow,
  type PsychologistSortDirection,
  type PsychologistSortField,
} from "@/lib/admin-psychologists-list";
import { getPsychologistDisplay } from "@/lib/psychologist-display";
import { psychologistAdminPath } from "@/lib/psychologist-slugs";
import { cn } from "@/lib/utils";

interface PsychologistsListTableProps {
  rows: PsychologistListRow[];
  sortField: PsychologistSortField;
  sortDirection: PsychologistSortDirection;
  onSort: (field: PsychologistSortField) => void;
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
  field: PsychologistSortField;
  sortField: PsychologistSortField;
  sortDirection: PsychologistSortDirection;
  onSort: (field: PsychologistSortField) => void;
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
  align = "left",
}: {
  label: string;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-[1] bg-[var(--brand-purple-light)]/35 px-4 py-3",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {label ? <span className={headerLabelClass}>{label}</span> : null}
    </th>
  );
}

export function PsychologistsListTable({
  rows,
  sortField,
  sortDirection,
  onSort,
}: PsychologistsListTableProps) {
  const router = useRouter();

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[var(--brand-purple)]/[0.08] bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)] lg:block">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortableHeader
                label="Psychologist"
                field="name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Title"
                field="title"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <StaticHeader label="Specialties" />
              <SortableHeader
                label="Upcoming"
                field="upcoming"
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
              <StaticHeader label="" align="right" className="w-14" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { psychologist } = row;
              const display = getPsychologistDisplay(
                psychologist.id,
                psychologist.name,
                psychologist.title,
                psychologist.specialties,
                {
                  bio: psychologist.bio,
                  photoUrl: psychologist.photo_url,
                  slug: psychologist.slug,
                }
              );
              const href = psychologistAdminPath(psychologist.slug);

              return (
                <tr
                  key={psychologist.id}
                  onClick={() => router.push(href)}
                  className="cursor-pointer border-t border-[var(--brand-purple)]/[0.05] transition-colors duration-150 hover:bg-[var(--brand-purple-light)]/25"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={psychologist.name}
                        src={display.photo}
                        size="sm"
                      />
                      <p className="truncate font-medium text-[var(--brand-text)]">
                        {psychologist.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--brand-text-muted)]">
                    <span className="truncate">
                      {psychologist.title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {(psychologist.specialties ?? []).length > 0 ? (
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {psychologist.specialties.slice(0, 3).map((specialty) => (
                          <span
                            key={specialty}
                            className="rounded-full bg-[var(--brand-purple-light)]/70 px-2 py-0.5 text-xs text-[var(--brand-purple)]"
                          >
                            {specialty}
                          </span>
                        ))}
                        {psychologist.specialties.length > 3 && (
                          <span className="text-xs text-[var(--brand-text-muted)]">
                            +{psychologist.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--brand-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[var(--brand-text-muted)]">
                    {row.upcomingAppointment
                      ? formatPsychologistListDateTime(
                          row.upcomingAppointment.start_at
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <PsychologistStatusPill isActive={psychologist.is_active} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`View ${psychologist.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)]/50 transition-colors duration-150 hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
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
