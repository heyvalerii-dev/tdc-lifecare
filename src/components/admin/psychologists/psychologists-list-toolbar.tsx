"use client";

import { useEffect, useState } from "react";
import {
  AdminListFilterField,
  AdminListFiltersSheet,
} from "@/components/admin/list/admin-list-filters-sheet";
import { AdminListToolbar } from "@/components/admin/list/admin-list-toolbar";
import { PsychologistStatusFilterDropdown } from "@/components/admin/psychologists/psychologist-status-filter-dropdown";
import { SpecialtyFilterDropdown } from "@/components/admin/psychologists/specialty-filter-dropdown";
import type { PsychologistsListFilters } from "@/lib/admin-psychologists-list";

interface PsychologistsListToolbarProps {
  filters: PsychologistsListFilters;
  specialties: string[];
  onFiltersChange: (filters: PsychologistsListFilters) => void;
  onExport: () => void;
  exportDisabled?: boolean;
}

function countActiveFilters(filters: PsychologistsListFilters): number {
  let n = 0;
  if (filters.status) n += 1;
  if (filters.specialty) n += 1;
  return n;
}

export function PsychologistsListToolbar({
  filters,
  specialties,
  onFiltersChange,
  onExport,
  exportDisabled,
}: PsychologistsListToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (sheetOpen) setDraft(filters);
  }, [sheetOpen, filters]);

  function updateSearch(search: string) {
    onFiltersChange({ ...filters, search });
  }

  function updateDesktop<K extends keyof PsychologistsListFilters>(
    key: K,
    value: PsychologistsListFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function updateDraft<K extends keyof PsychologistsListFilters>(
    key: K,
    value: PsychologistsListFilters[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <AdminListToolbar
        searchValue={filters.search}
        onSearchChange={updateSearch}
        searchPlaceholder="Search psychologists..."
        searchAriaLabel="Search psychologists"
        activeFilterCount={countActiveFilters(filters)}
        onOpenFilters={() => setSheetOpen(true)}
        onExport={onExport}
        exportDisabled={exportDisabled}
        exportAriaLabel="Export psychologists CSV"
        desktopFilters={
          <>
            <PsychologistStatusFilterDropdown
              value={filters.status}
              onChange={(status) => updateDesktop("status", status)}
            />
            <SpecialtyFilterDropdown
              value={filters.specialty}
              specialties={specialties}
              onChange={(specialty) => updateDesktop("specialty", specialty)}
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
          setDraft({ search: filters.search, status: "", specialty: "" })
        }
        onExport={onExport}
        exportDisabled={exportDisabled}
      >
        <AdminListFilterField label="Status">
          <PsychologistStatusFilterDropdown
            value={draft.status}
            onChange={(status) => updateDraft("status", status)}
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Specialty">
          <SpecialtyFilterDropdown
            value={draft.specialty}
            specialties={specialties}
            onChange={(specialty) => updateDraft("specialty", specialty)}
            className="w-full"
          />
        </AdminListFilterField>
      </AdminListFiltersSheet>
    </>
  );
}
