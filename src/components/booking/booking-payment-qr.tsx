"use client";

import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { type } from "@/lib/typography";
import { cn, formatCurrency } from "@/lib/utils";

interface BookingPaymentQrProps {
  appointmentId: string;
  amountCents: number;
  /** Absolute URL to the shareable pay page. */
  paymentUrl?: string;
  className?: string;
}

function defaultPaymentUrl(appointmentId: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/pay/${appointmentId}`;
}

export function BookingPaymentQr({
  appointmentId,
  amountCents,
  paymentUrl,
  className,
}: BookingPaymentQrProps) {
  const value = paymentUrl ?? defaultPaymentUrl(appointmentId);

  return (
    <Card className={cn("border-[var(--brand-purple)]/12 bg-white shadow-sm", className)}>
      <CardContent className="space-y-6 py-6 sm:py-7">
        <div className="space-y-2 text-center">
          <h3 className="font-heading text-xl font-semibold tracking-tight text-[var(--brand-text)]">
            Share payment link
          </h3>
          <p className={cn(type.smallMuted, "mx-auto max-w-sm text-sm leading-relaxed")}>
            Someone else can open this link to pay for your appointment.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="rounded-xl border border-[var(--brand-border)] bg-white p-5">
            <QRCode value={value} size={180} />
          </div>
        </div>

        <div className="space-y-1 text-center">
          <p className={cn(type.smallMuted, "text-sm")}>Amount</p>
          <p className="font-heading text-2xl font-semibold tracking-tight text-[var(--brand-purple)]">
            {formatCurrency(amountCents)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
