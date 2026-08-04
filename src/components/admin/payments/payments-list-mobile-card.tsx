import {
  AdminListMobileCard,
  AdminListMobileCardBody,
  AdminListMobileCardHeader,
  AdminListMobileCardPillRow,
  AdminListMobileDetailsRows,
  AdminListMobileInfoRow,
  adminListMobileCardPolishedClass,
} from "@/components/admin/list/admin-list-mobile-card";
import { PaymentStatusPill } from "@/components/appointments/payment-status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  formatPaymentListDate,
  getPaymentClientName,
  type PaymentListRow,
} from "@/lib/admin-payments-list";
import { resolveAvatarSrc } from "@/lib/avatar";
import { formatCurrency } from "@/lib/utils";
import { Banknote, CalendarDays } from "lucide-react";

interface PaymentsListMobileCardProps {
  payment: PaymentListRow;
}

export function PaymentsListMobileCard({
  payment,
}: PaymentsListMobileCardProps) {
  const client = payment.appointment?.client;
  const clientName = getPaymentClientName(payment);
  const href = payment.appointment?.id
    ? `/admin/appointments/${payment.appointment.id}`
    : undefined;

  return (
    <AdminListMobileCard
      href={href}
      aria-label={`View payment for ${clientName}`}
      showChevron={false}
      className={adminListMobileCardPolishedClass}
    >
      <AdminListMobileCardBody
        avatar={
          <Avatar
            name={clientName}
            email={client?.email}
            src={resolveAvatarSrc(client?.avatar_url)}
            size="sm"
          />
        }
      >
        <AdminListMobileCardHeader title={clientName} />

        <AdminListMobileCardPillRow>
          <PaymentStatusPill status={payment.status} />
        </AdminListMobileCardPillRow>

        <AdminListMobileDetailsRows>
          <AdminListMobileInfoRow
            icon={CalendarDays}
            textClassName="font-medium text-[var(--brand-text)]"
          >
            {formatPaymentListDate(payment.created_at)}
          </AdminListMobileInfoRow>

          <AdminListMobileInfoRow
            icon={Banknote}
            textClassName="font-semibold tabular-nums text-[var(--brand-text)]"
          >
            {formatCurrency(payment.amount_cents)}
          </AdminListMobileInfoRow>
        </AdminListMobileDetailsRows>
      </AdminListMobileCardBody>
    </AdminListMobileCard>
  );
}
