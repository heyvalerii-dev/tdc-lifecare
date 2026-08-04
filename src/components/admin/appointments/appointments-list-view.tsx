"use client";

import { useMemo, useState } from "react";
import { AppointmentsListEmptyState } from "@/components/admin/appointments/appointments-list-empty-state";
import { AppointmentsListMobileCard } from "@/components/admin/appointments/appointments-list-mobile-card";
import { AppointmentsListTable } from "@/components/admin/appointments/appointments-list-table";
import { AppointmentsListToolbar } from "@/components/admin/appointments/appointments-list-toolbar";
import { AdminListMobileCardStack } from "@/components/admin/list/admin-list-mobile-card";
import { AdminListPagination } from "@/components/admin/list/admin-list-pagination";
import {
  APPOINTMENTS_LIST_PAGE_SIZE,
  exportAppointmentsToCsv,
  filterAppointments,
  getUniqueServicesFromAppointments,
  getVisiblePageNumbers,
  paginateAppointments,
  sortAppointments,
  type AppointmentsListFilters,
  type SortDirection,
  type SortField,
} from "@/lib/admin-appointments-list";
import type { AppointmentWithRelations, Psychologist } from "@/types/database";

interface AppointmentsListViewProps {
  appointments: AppointmentWithRelations[];
  psychologists: Psychologist[];
}

const DEFAULT_FILTERS: AppointmentsListFilters = {
  search: "",
  psychologistId: "",
  serviceId: "",
  status: "",
  datePreset: "all",
  customDateStart: "",
  customDateEnd: "",
};

export function AppointmentsListView({
  appointments,
  psychologists,
}: AppointmentsListViewProps) {
  const [filters, setFilters] = useState<AppointmentsListFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(
    APPOINTMENTS_LIST_PAGE_SIZE
  );

  const services = useMemo(
    () => getUniqueServicesFromAppointments(appointments),
    [appointments]
  );

  const sortedPsychologists = useMemo(
    () => [...psychologists].sort((a, b) => a.name.localeCompare(b.name)),
    [psychologists]
  );

  const filteredAppointments = useMemo(() => {
    const filtered = filterAppointments(appointments, filters);
    return sortAppointments(filtered, sortField, sortDirection);
  }, [appointments, filters, sortField, sortDirection]);

  const pagination = useMemo(
    () =>
      paginateAppointments(
        filteredAppointments,
        page,
        APPOINTMENTS_LIST_PAGE_SIZE
      ),
    [filteredAppointments, page]
  );

  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  const mobileItems = useMemo(
    () => filteredAppointments.slice(0, mobileVisibleCount),
    [filteredAppointments, mobileVisibleCount]
  );

  function handleFiltersChange(next: AppointmentsListFilters) {
    setFilters(next);
    setPage(1);
    setMobileVisibleCount(APPOINTMENTS_LIST_PAGE_SIZE);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "date" ? "desc" : "asc");
    }
    setPage(1);
    setMobileVisibleCount(APPOINTMENTS_LIST_PAGE_SIZE);
  }

  function clearFilters() {
    handleFiltersChange(DEFAULT_FILTERS);
  }

  const hasActiveFilters =
    filters.search !== "" ||
    filters.psychologistId !== "" ||
    filters.serviceId !== "" ||
    filters.status !== "" ||
    filters.datePreset !== "all";

  return (
    <div>
      <AppointmentsListToolbar
        filters={filters}
        psychologists={sortedPsychologists}
        services={services}
        onFiltersChange={handleFiltersChange}
        onExport={() => exportAppointmentsToCsv(filteredAppointments)}
        exportDisabled={filteredAppointments.length === 0}
      />

      <div className="mt-4">
        {filteredAppointments.length === 0 ? (
          <AppointmentsListEmptyState
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        ) : (
          <>
            <AppointmentsListTable
              appointments={pagination.items}
              psychologists={sortedPsychologists}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            <AdminListMobileCardStack>
              {mobileItems.map((appointment) => (
                <AppointmentsListMobileCard
                  key={appointment.id}
                  appointment={appointment}
                  psychologists={sortedPsychologists}
                />
              ))}
            </AdminListMobileCardStack>

            <AdminListPagination
              page={pagination.page}
              pageSize={APPOINTMENTS_LIST_PAGE_SIZE}
              total={pagination.total}
              pageNumbers={pageNumbers}
              onPageChange={setPage}
              mobileVisibleCount={mobileVisibleCount}
              onLoadMore={() =>
                setMobileVisibleCount((n) => n + APPOINTMENTS_LIST_PAGE_SIZE)
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
