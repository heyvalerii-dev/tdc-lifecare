"use client";

import { useEffect, useState } from "react";
import {
  AdminListFilterField,
  AdminListFiltersSheet,
} from "@/components/admin/list/admin-list-filters-sheet";
import { AdminListToolbar } from "@/components/admin/list/admin-list-toolbar";
import { PaymentDateFilterDropdown } from "@/components/admin/payments/payment-date-filter-dropdown";
import { PaymentMethodFilterDropdown } from "@/components/admin/payments/payment-method-filter-dropdown";
import { PaymentStatusFilterDropdown } from "@/components/admin/payments/payment-status-filter-dropdown";
import type { DateFilterPreset } from "@/lib/admin-appointments-list";
import type { PaymentsListFilters } from "@/lib/admin-payments-list";

interface PaymentsListToolbarProps {
  filters: PaymentsListFilters;
  onFiltersChange: (filters: PaymentsListFilters) => void;
  onExport: () => void;
  exportDisabled?: boolean;
}

function countActiveFilters(filters: PaymentsListFilters): number {
  let n = 0;
  if (filters.status) n += 1;
  if (filters.method) n += 1;
  if (filters.datePreset !== "all") n += 1;
  return n;
}

export function PaymentsListToolbar({
  filters,
  onFiltersChange,
  onExport,
  exportDisabled,
}: PaymentsListToolbarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (sheetOpen) setDraft(filters);
  }, [sheetOpen, filters]);

  function updateSearch(search: string) {
    onFiltersChange({ ...filters, search });
  }

  function updateDesktop<K extends keyof PaymentsListFilters>(
    key: K,
    value: PaymentsListFilters[K]
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

  function updateDraft<K extends keyof PaymentsListFilters>(
    key: K,
    value: PaymentsListFilters[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <AdminListToolbar
        searchValue={filters.search}
        onSearchChange={updateSearch}
        searchPlaceholder="Search payments..."
        searchAriaLabel="Search payments"
        activeFilterCount={countActiveFilters(filters)}
        onOpenFilters={() => setSheetOpen(true)}
        onExport={onExport}
        exportDisabled={exportDisabled}
        exportAriaLabel="Export payments CSV"
        desktopFilters={
          <>
            <PaymentStatusFilterDropdown
              value={filters.status}
              onChange={(status) => updateDesktop("status", status)}
            />
            <PaymentMethodFilterDropdown
              value={filters.method}
              onChange={(method) => updateDesktop("method", method)}
            />
            <PaymentDateFilterDropdown
              value={filters.datePreset}
              customDateStart={filters.customDateStart}
              customDateEnd={filters.customDateEnd}
              onPresetChange={handleDesktopPresetChange}
              onCustomRangeApply={handleDesktopCustomRangeApply}
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
          setDraft({
            search: filters.search,
            status: "",
            method: "",
            datePreset: "all",
            customDateStart: "",
            customDateEnd: "",
          })
        }
        onExport={onExport}
        exportDisabled={exportDisabled}
      >
        <AdminListFilterField label="Status">
          <PaymentStatusFilterDropdown
            value={draft.status}
            onChange={(status) => updateDraft("status", status)}
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Method">
          <PaymentMethodFilterDropdown
            value={draft.method}
            onChange={(method) => updateDraft("method", method)}
            className="w-full"
          />
        </AdminListFilterField>
        <AdminListFilterField label="Date range">
          <PaymentDateFilterDropdown
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
      </AdminListFiltersSheet>
    </>
  );
}
