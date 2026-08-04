"use client";

import { useMemo, useState } from "react";
import { AdminListMobileCardStack } from "@/components/admin/list/admin-list-mobile-card";
import { AdminListPagination } from "@/components/admin/list/admin-list-pagination";
import { PsychologistsListEmptyState } from "@/components/admin/psychologists/psychologists-list-empty-state";
import { PsychologistsListMobileCard } from "@/components/admin/psychologists/psychologists-list-mobile-card";
import { PsychologistsListTable } from "@/components/admin/psychologists/psychologists-list-table";
import { PsychologistsListToolbar } from "@/components/admin/psychologists/psychologists-list-toolbar";
import {
  PSYCHOLOGISTS_LIST_PAGE_SIZE,
  exportPsychologistsToCsv,
  filterPsychologists,
  getUniqueSpecialties,
  getVisiblePageNumbers,
  paginatePsychologists,
  sortPsychologists,
  type PsychologistListRow,
  type PsychologistSortDirection,
  type PsychologistSortField,
  type PsychologistsListFilters,
} from "@/lib/admin-psychologists-list";

interface PsychologistsListViewProps {
  rows: PsychologistListRow[];
}

const DEFAULT_FILTERS: PsychologistsListFilters = {
  search: "",
  status: "",
  specialty: "",
};

export function PsychologistsListView({ rows }: PsychologistsListViewProps) {
  const [filters, setFilters] =
    useState<PsychologistsListFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<PsychologistSortField>("name");
  const [sortDirection, setSortDirection] =
    useState<PsychologistSortDirection>("asc");
  const [page, setPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(
    PSYCHOLOGISTS_LIST_PAGE_SIZE
  );

  const specialties = useMemo(
    () => getUniqueSpecialties(rows.map((row) => row.psychologist)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const filtered = filterPsychologists(rows, filters);
    return sortPsychologists(filtered, sortField, sortDirection);
  }, [rows, filters, sortField, sortDirection]);

  const pagination = useMemo(
    () =>
      paginatePsychologists(filteredRows, page, PSYCHOLOGISTS_LIST_PAGE_SIZE),
    [filteredRows, page]
  );

  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  const mobileItems = useMemo(
    () => filteredRows.slice(0, mobileVisibleCount),
    [filteredRows, mobileVisibleCount]
  );

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.specialty
  );

  function handleFiltersChange(next: PsychologistsListFilters) {
    setFilters(next);
    setPage(1);
    setMobileVisibleCount(PSYCHOLOGISTS_LIST_PAGE_SIZE);
  }

  function handleSort(field: PsychologistSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
    setMobileVisibleCount(PSYCHOLOGISTS_LIST_PAGE_SIZE);
  }

  function clearFilters() {
    handleFiltersChange(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-5">
      <PsychologistsListToolbar
        filters={filters}
        specialties={specialties}
        onFiltersChange={handleFiltersChange}
        onExport={() => exportPsychologistsToCsv(filteredRows)}
        exportDisabled={filteredRows.length === 0}
      />

      {filteredRows.length === 0 ? (
        <PsychologistsListEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
          <PsychologistsListTable
            rows={pagination.items}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <AdminListMobileCardStack>
            {mobileItems.map((row) => (
              <PsychologistsListMobileCard
                key={row.psychologist.id}
                row={row}
              />
            ))}
          </AdminListMobileCardStack>

          <AdminListPagination
            page={pagination.page}
            pageSize={PSYCHOLOGISTS_LIST_PAGE_SIZE}
            total={pagination.total}
            pageNumbers={pageNumbers}
            onPageChange={setPage}
            mobileVisibleCount={mobileVisibleCount}
            onLoadMore={() =>
              setMobileVisibleCount((n) => n + PSYCHOLOGISTS_LIST_PAGE_SIZE)
            }
          />
        </>
      )}
    </div>
  );
}
