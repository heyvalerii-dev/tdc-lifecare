"use client";

import { useMemo, useState } from "react";
import { AdminListMobileCardStack } from "@/components/admin/list/admin-list-mobile-card";
import { AdminListPagination } from "@/components/admin/list/admin-list-pagination";
import { PaymentsListEmptyState } from "@/components/admin/payments/payments-list-empty-state";
import { PaymentsListMobileCard } from "@/components/admin/payments/payments-list-mobile-card";
import { PaymentsListTable } from "@/components/admin/payments/payments-list-table";
import { PaymentsListToolbar } from "@/components/admin/payments/payments-list-toolbar";
import {
  PAYMENTS_LIST_PAGE_SIZE,
  exportPaymentsToCsv,
  filterPayments,
  getVisiblePageNumbers,
  paginatePayments,
  sortPayments,
  type PaymentListRow,
  type PaymentSortDirection,
  type PaymentSortField,
  type PaymentsListFilters,
} from "@/lib/admin-payments-list";

interface PaymentsListViewProps {
  payments: PaymentListRow[];
}

const DEFAULT_FILTERS: PaymentsListFilters = {
  search: "",
  status: "",
  method: "",
  datePreset: "all",
  customDateStart: "",
  customDateEnd: "",
};

export function PaymentsListView({ payments }: PaymentsListViewProps) {
  const [filters, setFilters] = useState<PaymentsListFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<PaymentSortField>("date");
  const [sortDirection, setSortDirection] =
    useState<PaymentSortDirection>("desc");
  const [page, setPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(
    PAYMENTS_LIST_PAGE_SIZE
  );

  const filteredPayments = useMemo(() => {
    const filtered = filterPayments(payments, filters);
    return sortPayments(filtered, sortField, sortDirection);
  }, [payments, filters, sortField, sortDirection]);

  const pagination = useMemo(
    () => paginatePayments(filteredPayments, page, PAYMENTS_LIST_PAGE_SIZE),
    [filteredPayments, page]
  );

  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  const mobileItems = useMemo(
    () => filteredPayments.slice(0, mobileVisibleCount),
    [filteredPayments, mobileVisibleCount]
  );

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.method ||
      filters.datePreset !== "all"
  );

  function handleFiltersChange(next: PaymentsListFilters) {
    setFilters(next);
    setPage(1);
    setMobileVisibleCount(PAYMENTS_LIST_PAGE_SIZE);
  }

  function handleSort(field: PaymentSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "client" ? "asc" : "desc");
    }
    setPage(1);
    setMobileVisibleCount(PAYMENTS_LIST_PAGE_SIZE);
  }

  function clearFilters() {
    handleFiltersChange(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-5">
      <PaymentsListToolbar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onExport={() => exportPaymentsToCsv(filteredPayments)}
        exportDisabled={filteredPayments.length === 0}
      />

      {filteredPayments.length === 0 ? (
        <PaymentsListEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <>
          <PaymentsListTable
            payments={pagination.items}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <AdminListMobileCardStack>
            {mobileItems.map((payment) => (
              <PaymentsListMobileCard key={payment.id} payment={payment} />
            ))}
          </AdminListMobileCardStack>

          <AdminListPagination
            page={pagination.page}
            pageSize={PAYMENTS_LIST_PAGE_SIZE}
            total={pagination.total}
            pageNumbers={pageNumbers}
            onPageChange={setPage}
            mobileVisibleCount={mobileVisibleCount}
            onLoadMore={() =>
              setMobileVisibleCount((n) => n + PAYMENTS_LIST_PAGE_SIZE)
            }
          />
        </>
      )}
    </div>
  );
}
