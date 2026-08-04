import { formatInTimeZone } from "date-fns-tz";
import {
  getPaginationLabel,
  getVisiblePageNumbers,
  paginateAppointments,
  resolveDateFilterRange,
  type DateFilterPreset,
} from "@/lib/admin-appointments-list";
import { CLINIC_TIMEZONE, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatClinicDate } from "@/lib/datetime";
import { formatCurrency } from "@/lib/utils";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types/database";

export const PAYMENTS_LIST_PAGE_SIZE = 20;

export type PaymentSortField = "client" | "amount" | "date" | "status";
export type PaymentSortDirection = "asc" | "desc";

export interface PaymentsListFilters {
  search: string;
  status: string;
  method: string;
  datePreset: DateFilterPreset;
  customDateStart: string;
  customDateEnd: string;
}

export interface PaymentListClient {
  id?: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

export interface PaymentListRow extends Payment {
  appointment?: {
    id: string;
    client?: PaymentListClient | null;
    service?: { name: string } | null;
  } | null;
}

export const PAYMENT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export const PAYMENT_METHOD_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Methods" },
  { value: "paymongo", label: "PayMongo" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "gcash_manual", label: "Manual" },
];

const STATUS_SORT_ORDER: Record<string, number> = {
  pending: 0,
  paid: 1,
  failed: 2,
  refunded: 3,
  waived: 4,
  expired: 5,
};

export {
  getPaginationLabel,
  getVisiblePageNumbers,
  paginateAppointments as paginatePayments,
};

export function getPaymentClientName(payment: PaymentListRow): string {
  return (
    payment.appointment?.client?.full_name?.trim() ||
    payment.appointment?.client?.email ||
    "Unknown client"
  );
}

export function getPaymentServiceName(payment: PaymentListRow): string {
  return payment.appointment?.service?.name ?? "—";
}

export function getPaymentTransactionId(payment: PaymentListRow): string {
  return (
    payment.paymongo_payment_id ||
    payment.paymongo_checkout_id ||
    payment.id
  );
}

export function formatPaymentListDate(iso: string): string {
  return formatInTimeZone(iso, CLINIC_TIMEZONE, "EEE, MMM d • h:mm a");
}

export function formatPaymentListDateOnly(iso: string): string {
  return formatInTimeZone(iso, CLINIC_TIMEZONE, "EEE, MMM d");
}

export function filterPayments(
  payments: PaymentListRow[],
  filters: PaymentsListFilters
): PaymentListRow[] {
  const q = filters.search.trim().toLowerCase();
  const range = resolveDateFilterRange(
    filters.datePreset,
    filters.customDateStart,
    filters.customDateEnd
  );

  return payments.filter((payment) => {
    if (q) {
      const haystack = [
        getPaymentClientName(payment),
        getPaymentServiceName(payment),
        getPaymentTransactionId(payment),
        payment.id,
        payment.paymongo_payment_id ?? "",
        payment.paymongo_checkout_id ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.status && payment.status !== filters.status) return false;

    if (filters.method) {
      if (filters.method === "gcash_manual") {
        if (
          payment.method !== "gcash_manual" &&
          payment.method !== "pro_bono" &&
          payment.method !== "waived"
        ) {
          return false;
        }
      } else if (payment.method !== filters.method) {
        return false;
      }
    }

    if (range) {
      const paymentDate = formatInTimeZone(
        payment.created_at,
        CLINIC_TIMEZONE,
        "yyyy-MM-dd"
      );
      if (paymentDate < range.start || paymentDate > range.end) return false;
    }

    return true;
  });
}

export function sortPayments(
  payments: PaymentListRow[],
  field: PaymentSortField,
  direction: PaymentSortDirection
): PaymentListRow[] {
  const sorted = [...payments].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "client":
        comparison = getPaymentClientName(a).localeCompare(
          getPaymentClientName(b),
          undefined,
          { sensitivity: "base" }
        );
        break;
      case "amount":
        comparison = a.amount_cents - b.amount_cents;
        break;
      case "date":
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "status":
        comparison =
          (STATUS_SORT_ORDER[a.status] ?? 99) -
          (STATUS_SORT_ORDER[b.status] ?? 99);
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

export function exportPaymentsToCsv(payments: PaymentListRow[]): void {
  const headers = [
    "Client",
    "Service",
    "Amount",
    "Status",
    "Method",
    "Transaction ID",
    "Date",
    "Appointment ID",
  ];

  const rows = payments.map((payment) => [
    getPaymentClientName(payment),
    getPaymentServiceName(payment),
    formatCurrency(payment.amount_cents),
    PAYMENT_STATUS_LABELS[payment.status] ?? payment.status,
    payment.method
      ? PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method
      : "",
    getPaymentTransactionId(payment),
    formatClinicDate(payment.created_at, "yyyy-MM-dd HH:mm"),
    payment.appointment?.id ?? payment.appointment_id,
  ]);

  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
  link.href = url;
  link.download = `payments-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return value in PAYMENT_STATUS_LABELS;
}

/**
 * Fill missing profile avatars from Auth Google picture
 * (user_metadata / raw_user_meta_data.picture).
 */
export async function enrichPaymentClientAvatars(
  payments: PaymentListRow[],
  fetchAuthPicture: (userId: string) => Promise<string | null>
): Promise<PaymentListRow[]> {
  const missingIds = [
    ...new Set(
      payments
        .map((payment) => payment.appointment?.client)
        .filter(
          (client): client is PaymentListClient & { id: string } =>
            Boolean(client?.id) && !client?.avatar_url?.trim()
        )
        .map((client) => client.id)
    ),
  ];

  if (missingIds.length === 0) return payments;

  const pictureById = new Map<string, string>();
  await Promise.all(
    missingIds.map(async (id) => {
      const picture = await fetchAuthPicture(id);
      if (picture) pictureById.set(id, picture);
    })
  );

  if (pictureById.size === 0) return payments;

  return payments.map((payment) => {
    const client = payment.appointment?.client;
    if (!client?.id || client.avatar_url?.trim()) return payment;

    const picture = pictureById.get(client.id);
    if (!picture || !payment.appointment) return payment;

    return {
      ...payment,
      appointment: {
        ...payment.appointment,
        client: { ...client, avatar_url: picture },
      },
    };
  });
}
