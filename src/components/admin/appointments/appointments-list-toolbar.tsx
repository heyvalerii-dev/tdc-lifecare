"use client";

import { useEffect, useState } from "react";
import { DateFilterDropdown } from "@/components/admin/appointments/filters/date-filter-dropdown";
import { PsychologistFilterDropdown } from "@/components/admin/appointments/filters/psychologist-filter-dropdown";
import { ServiceFilterDropdown } from "@/components/admin/appointments/filters/service-filter-dropdown";
import { StatusFilterDropdown } from "@/components/admin/appointments/filters/status-filter-dropdown";
import {
  AdminListFilterField,
  AdminListFiltersSheet,
} from "@/components/admin/list/admin-list-filters-sheet";
import { AdminListToolbar } from "@/components/admin/list/admin-list-toolbar";
import type {
  AppointmentsListFilters,
  DateFilterPreset,
} from "@/lib/admin-appointments-list";
import type { Psychologist, Service } from "@/types/database";

interface AppointmentsListToolbarProps {
  filters: AppointmentsListFilters;
  psychologists: Psychologist[];
  services: Service[];
  onFiltersChange: (filters: AppointmentsListFilters) => void;
  onExport: () => void;
  exportDisabled?: boolean;
}

function countActiveFilters(filters: AppointmentsListFilters): number {
  let n = 0;
  if (filters.psychologistId) n += 1;
  if (filters.serviceId) n += 1;
  if (filters.status) n += 1;
  if (filters.datePreset !== "all") n += 1;
  return n;
}

export function AppointmentsListToolbar({
  filters,
  psychologists,
  services,
  onFiltersChange,
  onExport,
  exportDisabled,
}: AppointmentsListToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (sheetOpen) setDraft(filters);
  }, [sheetOpen, filters]);

  function updateSearch(search: string) {
    onFiltersChange({ ...filters, search });
  }

  function updateDesktop<K extends keyof AppointmentsListFilters>(
    key: K,
    value: AppointmentsListFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function handleDesktopPresetChange(preset: DateFilterPreset) {
    onFiltersChange({
      ...filters,
      datePreset: preset,
      customDateStart: "",
      customDateEnd: "",
    });
  }

  function handleDesktopCustomRangeApply(start: string, end: string) {
    onFiltersChange({
      ...filters,
      datePreset: "custom",
      customDateStart: start,
      customDateEnd: end,
    });
  }

  function updateDraft<K extends keyof AppointmentsListFilters>(
    key: K,
    value: AppointmentsListFilters[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <AdminListToolbar
        searchValue={filters.search}
        onSearchChange={updateSearch}
        searchPlaceholder="Search appointments..."
        searchAriaLabel="Search appointments"
        activeFilterCount={countActiveFilters(filters)}
        onOpenFilters={() => setSheetOpen(true)}
        onExport={onExport}
        exportDisabled={exportDisabled}
        desktopFilters={
          <div className="flex flex-wrap items-center gap-2">
            <DateFilterDropdown
              value={filters.datePreset}
              customDateStart={filters.customDateStart}
              customDateEnd={filters.customDateEnd}
              onPresetChange={handleDesktopPresetChange}
              onCustomRangeApply={handleDesktopCustomRangeApply}
            />
            <PsychologistFilterDropdown
              value={filters.psychologistId}
              psychologists={psychologists}
              onChange={(psychologistId) =>
                updateDesktop("psychologistId", psychologistId)
              }
            />
            <ServiceFilterDropdown
              value={filters.serviceId}
              services={services}
              onChange={(serviceId) => updateDesktop("serviceId", serviceId)}
            />
            <StatusFilterDropdown
              value={filters.status}
              onChange={(status) => updateDesktop("status", status)}
            />
          </div>
        }
      />

      <AdminListFiltersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onApply={() =>
          onFiltersChange({ ...draft, search: filters.search })
        }
        onReset={() =>
          setDraft({
            search: filters.search,
            psychologistId: "",
            serviceId: "",
            status: "",
            datePreset: "all",
            customDateStart: "",
            customDateEnd: "",
          })
        }
        onExport={onExport}
        exportDisabled={exportDisabled}
      >
        <AdminListFilterField label="Date range">
          <DateFilterDropdown
            value={draft.datePreset}
            customDateStart={draft.customDateStart}
            customDateEnd={draft.customDateEnd}
            onPresetChange={(preset) =>
              setDraft((prev) => ({
                ...prev,
                datePreset: preset,
                customDateStart: "",
                customDateEnd: "",
              }))
            }
            onCustomRangeApply={(start, end) =>
              setDraft((prev) => ({
                ...prev,
                datePreset: "custom",
                customDateStart: start,
                customDateEnd: end,
              }))
            }
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Psychologist">
          <PsychologistFilterDropdown
            value={draft.psychologistId}
            psychologists={psychologists}
            onChange={(psychologistId) =>
              updateDraft("psychologistId", psychologistId)
            }
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Service">
          <ServiceFilterDropdown
            value={draft.serviceId}
            services={services}
            onChange={(serviceId) => updateDraft("serviceId", serviceId)}
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Status">
          <StatusFilterDropdown
            value={draft.status}
            onChange={(status) => updateDraft("status", status)}
            className="w-full"
          />
        </AdminListFilterField>
      </AdminListFiltersSheet>
    </>
  );
}
