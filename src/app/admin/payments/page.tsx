import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PaymentsListView } from "@/components/admin/payments/payments-list-view";
import {
  enrichPaymentClientAvatars,
  type PaymentListRow,
} from "@/lib/admin-payments-list";
import { resolveAvatarSrc } from "@/lib/avatar";
import { adminWideContainer } from "@/lib/admin-layout";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

import { ADMIN_PAYMENT_LIST_SELECT } from "@/lib/appointment-selects";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(ADMIN_PAYMENT_LIST_SELECT)
    .order("created_at", { ascending: false })
    .returns<PaymentListRow[]>();

  const rows = (payments ?? []) as PaymentListRow[];

  let enriched = rows;
  try {
    const service = await createServiceClient();
    enriched = await enrichPaymentClientAvatars(rows, async (userId) => {
      const { data, error } = await service.auth.admin.getUserById(userId);
      if (error || !data.user) return null;
      return resolveAvatarSrc(null, data.user.user_metadata);
    });
  } catch {
    // Service role unavailable — fall back to profiles.avatar_url / initials
    enriched = rows;
  }

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <div className="mb-8 space-y-2">
        <h1 className={type.pageTitle}>Payments</h1>
        <p className={cn(type.bodyMuted, "text-base")}>
          Payment records and status across appointments.
        </p>
      </div>

      <PaymentsListView payments={enriched} />
    </div>
  );
}
