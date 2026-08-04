"use client";

import { useEffect, useState } from "react";
import { PsychologistFilterDropdown } from "@/components/admin/appointments/filters/psychologist-filter-dropdown";
import { ClientStatusFilterDropdown } from "@/components/admin/clients/client-status-filter-dropdown";
import {
  AdminListFilterField,
  AdminListFiltersSheet,
} from "@/components/admin/list/admin-list-filters-sheet";
import { AdminListToolbar } from "@/components/admin/list/admin-list-toolbar";
import type { ClientsListFilters } from "@/lib/admin-clients-list";
import type { Psychologist } from "@/types/database";

interface ClientsListToolbarProps {
  filters: ClientsListFilters;
  psychologists: Psychologist[];
  onFiltersChange: (filters: ClientsListFilters) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  onAddClient: () => void;
}

function countActiveFilters(filters: ClientsListFilters): number {
  let n = 0;
  if (filters.psychologistId) n += 1;
  if (filters.status) n += 1;
  return n;
}

export function ClientsListToolbar({
  filters,
  psychologists,
  onFiltersChange,
  onExport,
  exportDisabled,
  onAddClient,
}: ClientsListToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (sheetOpen) setDraft(filters);
  }, [sheetOpen, filters]);

  function updateSearch(search: string) {
    onFiltersChange({ ...filters, search });
  }

  function updateDesktop<K extends keyof ClientsListFilters>(
    key: K,
    value: ClientsListFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function updateDraft<K extends keyof ClientsListFilters>(
    key: K,
    value: ClientsListFilters[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <AdminListToolbar
        searchValue={filters.search}
        onSearchChange={updateSearch}
        searchPlaceholder="Search clients..."
        searchAriaLabel="Search clients"
        activeFilterCount={countActiveFilters(filters)}
        onOpenFilters={() => setSheetOpen(true)}
        onExport={onExport}
        exportDisabled={exportDisabled}
        exportAriaLabel="Export clients CSV"
        primaryAction={{ label: "New client", onClick: onAddClient }}
        desktopFilters={
          <>
            <PsychologistFilterDropdown
              value={filters.psychologistId}
              psychologists={psychologists}
              onChange={(value) => updateDesktop("psychologistId", value)}
            />
            <ClientStatusFilterDropdown
              value={filters.status}
              onChange={(value) => updateDesktop("status", value)}
            />
          </>
        }
      />

      <AdminListFiltersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onApply={() =>
          onFiltersChange({ ...draft, search: filters.search })
        }
        onReset={() =>
          setDraft({ search: filters.search, psychologistId: "", status: "" })
        }
        onExport={onExport}
        exportDisabled={exportDisabled}
      >
        <AdminListFilterField label="Assigned psychologist">
          <PsychologistFilterDropdown
            value={draft.psychologistId}
            psychologists={psychologists}
            onChange={(value) => updateDraft("psychologistId", value)}
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Status">
          <ClientStatusFilterDropdown
            value={draft.status}
            onChange={(value) => updateDraft("status", value)}
            className="w-full"
          />
        </AdminListFilterField>
      </AdminListFiltersSheet>
    </>
  );
}
