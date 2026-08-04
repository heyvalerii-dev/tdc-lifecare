"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { PaymentStatusPill } from "@/components/appointments/payment-status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  formatPaymentListDate,
  getPaymentClientName,
  getPaymentServiceName,
  type PaymentListRow,
  type PaymentSortDirection,
  type PaymentSortField,
} from "@/lib/admin-payments-list";
import { resolveAvatarSrc } from "@/lib/avatar";
import { cn, formatCurrency } from "@/lib/utils";

interface PaymentsListTableProps {
  payments: PaymentListRow[];
  sortField: PaymentSortField;
  sortDirection: PaymentSortDirection;
  onSort: (field: PaymentSortField) => void;
}

const headerLabelClass =
  "text-[11px] font-medium uppercase tracking-wider text-[var(--brand-text-muted)]";

function SortChevron({
  active,
  direction,
}: {
  active: boolean;
  direction: PaymentSortDirection;
}) {
  if (!active) {
    return <span className="inline-block h-3.5 w-3.5" aria-hidden />;
  }
  return direction === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
  ) : (
    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
  );
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  field: PaymentSortField;
  sortField: PaymentSortField;
  sortDirection: PaymentSortDirection;
  onSort: (field: PaymentSortField) => void;
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
        <SortChevron active={active} direction={sortDirection} />
      </button>
    </th>
  );
}

function PaymentColumnHeader({
  sortField,
  sortDirection,
  onSort,
}: {
  sortField: PaymentSortField;
  sortDirection: PaymentSortDirection;
  onSort: (field: PaymentSortField) => void;
}) {
  const amountActive = sortField === "amount";
  const statusActive = sortField === "status";

  return (
    <th className="sticky top-0 z-[1] w-[1%] whitespace-nowrap bg-[var(--brand-purple-light)]/35 px-4 py-3 text-left">
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSort("amount")}
          aria-label="Sort by amount"
          className={cn(
            headerLabelClass,
            "inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--brand-text)]",
            amountActive && "text-[var(--brand-text)]"
          )}
        >
          Payment
          <SortChevron active={amountActive} direction={sortDirection} />
        </button>
        <button
          type="button"
          onClick={() => onSort("status")}
          aria-label="Sort by status"
          className={cn(
            headerLabelClass,
            "inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--brand-text)]",
            statusActive
              ? "text-[var(--brand-text)]"
              : "text-[var(--brand-text-muted)]/70"
          )}
        >
          Status
          <SortChevron active={statusActive} direction={sortDirection} />
        </button>
      </div>
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

export function PaymentsListTable({
  payments,
  sortField,
  sortDirection,
  onSort,
}: PaymentsListTableProps) {
  const router = useRouter();

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[var(--brand-purple)]/[0.08] bg-white shadow-[0_4px_24px_rgba(93,80,122,0.04)] lg:block">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortableHeader
                label="Client"
                field="client"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <StaticHeader label="Service" />
              <PaymentColumnHeader
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Date"
                field="date"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={onSort}
              />
              <StaticHeader label="Action" align="right" className="w-14" />
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const client = payment.appointment?.client;
              const clientName = getPaymentClientName(payment);
              const avatarSrc = resolveAvatarSrc(client?.avatar_url);
              const href = payment.appointment?.id
                ? `/admin/appointments/${payment.appointment.id}`
                : null;

              return (
                <tr
                  key={payment.id}
                  onClick={() => {
                    if (href) router.push(href);
                  }}
                  className={cn(
                    "border-t border-[var(--brand-purple)]/[0.05] transition-colors duration-150",
                    href
                      ? "cursor-pointer hover:bg-[var(--brand-purple-light)]/25"
                      : "cursor-default"
                  )}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={clientName}
                        email={client?.email}
                        src={avatarSrc}
                        size="sm"
                      />
                      <p className="truncate font-medium text-[var(--brand-text)]">
                        {clientName}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--brand-text-muted)]">
                    <span className="truncate">
                      {getPaymentServiceName(payment)}
                    </span>
                  </td>
                  <td className="w-[1%] whitespace-nowrap px-4 py-3.5">
                    <div className="inline-flex items-center gap-2.5">
                      <span className="font-semibold tabular-nums text-[var(--brand-text)]">
                        {formatCurrency(payment.amount_cents)}
                      </span>
                      <PaymentStatusPill
                        status={payment.status}
                        className="shrink-0"
                      />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[var(--brand-text-muted)]">
                    {formatPaymentListDate(payment.created_at)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {href ? (
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`View appointment for ${clientName}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand-text-muted)]/50 transition-colors duration-150 hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)]"
                      >
                        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                      </Link>
                    ) : (
                      <span className="inline-block h-8 w-8" aria-hidden />
                    )}
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
