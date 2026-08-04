"use client";

import { useMemo, useState } from "react";
import { ClientsListEmptyState } from "@/components/admin/clients/clients-list-empty-state";
import { ClientsListMobileCard } from "@/components/admin/clients/clients-list-mobile-card";
import { ClientsListTable } from "@/components/admin/clients/clients-list-table";
import { ClientsListToolbar } from "@/components/admin/clients/clients-list-toolbar";
import { NewClientDrawer } from "@/components/admin/clients/new-client-drawer";
import { AdminListMobileCardStack } from "@/components/admin/list/admin-list-mobile-card";
import { AdminListPagination } from "@/components/admin/list/admin-list-pagination";
import {
  CLIENTS_LIST_PAGE_SIZE,
  exportClientsToCsv,
  filterClients,
  getVisiblePageNumbers,
  paginateClients,
  sortClients,
  type ClientListRow,
  type ClientSortDirection,
  type ClientSortField,
  type ClientsListFilters,
} from "@/lib/admin-clients-list";
import type { Psychologist } from "@/types/database";

interface ClientsListViewProps {
  clients: ClientListRow[];
  psychologists: Psychologist[];
}

const DEFAULT_FILTERS: ClientsListFilters = {
  search: "",
  psychologistId: "",
  status: "",
};

export function ClientsListView({
  clients,
  psychologists,
}: ClientsListViewProps) {
  const [filters, setFilters] = useState<ClientsListFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<ClientSortField>("name");
  const [sortDirection, setSortDirection] =
    useState<ClientSortDirection>("asc");
  const [page, setPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] =
    useState(CLIENTS_LIST_PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sortedPsychologists = useMemo(
    () => [...psychologists].sort((a, b) => a.name.localeCompare(b.name)),
    [psychologists]
  );

  const filteredClients = useMemo(() => {
    const filtered = filterClients(clients, filters);
    return sortClients(filtered, sortField, sortDirection);
  }, [clients, filters, sortField, sortDirection]);

  const pagination = useMemo(
    () => paginateClients(filteredClients, page, CLIENTS_LIST_PAGE_SIZE),
    [filteredClients, page]
  );

  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  const mobileItems = useMemo(
    () => filteredClients.slice(0, mobileVisibleCount),
    [filteredClients, mobileVisibleCount]
  );

  const hasActiveFilters = Boolean(
    filters.search || filters.psychologistId || filters.status
  );

  function handleFiltersChange(next: ClientsListFilters) {
    setFilters(next);
    setPage(1);
    setMobileVisibleCount(CLIENTS_LIST_PAGE_SIZE);
  }

  function handleSort(field: ClientSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(
        field === "name" || field === "client_since" ? "asc" : "desc"
      );
    }
    setPage(1);
    setMobileVisibleCount(CLIENTS_LIST_PAGE_SIZE);
  }

  function clearFilters() {
    handleFiltersChange(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-5">
      <ClientsListToolbar
        filters={filters}
        psychologists={sortedPsychologists}
        onFiltersChange={handleFiltersChange}
        onExport={() => exportClientsToCsv(filteredClients)}
        exportDisabled={filteredClients.length === 0}
        onAddClient={() => setDrawerOpen(true)}
      />

      <NewClientDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        psychologists={sortedPsychologists}
      />

      {filteredClients.length === 0 ? (
        <ClientsListEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
          <ClientsListTable
            clients={pagination.items}
            psychologists={sortedPsychologists}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <AdminListMobileCardStack>
            {mobileItems.map((client) => (
              <ClientsListMobileCard
                key={client.id}
                client={client}
                psychologists={sortedPsychologists}
              />
            ))}
          </AdminListMobileCardStack>

          <AdminListPagination
            page={pagination.page}
            pageSize={CLIENTS_LIST_PAGE_SIZE}
            total={pagination.total}
            pageNumbers={pageNumbers}
            onPageChange={setPage}
            mobileVisibleCount={mobileVisibleCount}
            onLoadMore={() =>
              setMobileVisibleCount((n) => n + CLIENTS_LIST_PAGE_SIZE)
            }
          />
        </>
      )}
    </div>
  );
}
