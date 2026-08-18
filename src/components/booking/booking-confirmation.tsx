"use client";

import Link from "next/link";
import { BookingConfirmationCard } from "@/components/booking/booking-confirmation-card";
import { downloadIcsFile, generateIcsEvent } from "@/lib/calendar";
import { formatClinicDateTime } from "@/lib/datetime";
import { formatCurrency } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Calendar, CalendarPlus, Check, Download } from "lucide-react";
import type { Psychologist, Service } from "@/types/database";

interface BookingConfirmationProps {
  psychologist: Psychologist;
  service: Service;
  selectedSlot: string;
  endAt: string;
  appointmentId: string;
}

export function BookingConfirmation({
  psychologist,
  service,
  selectedSlot,
  endAt,
  appointmentId,
}: BookingConfirmationProps) {
  function handleAddToCalendar() {
    const ics = generateIcsEvent({
      title: `${service.name} — ${psychologist.name}`,
      description: `Appointment with ${psychologist.name} at ${APP_NAME}`,
      startAt: selectedSlot,
      endAt,
    });
    downloadIcsFile(ics, "appointment.ics");
  }

  function handleDownloadReceipt() {
    const receipt = [
      `${APP_NAME} — Appointment Receipt`,
      "",
      `Receipt ID: ${appointmentId}`,
      `Psychologist: ${psychologist.name}`,
      `Service: ${service.name}`,
      `Date & Time: ${formatClinicDateTime(selectedSlot)}`,
      `Total Paid: ${formatCurrency(service.price_cents)}`,
      "",
      "Thank you for booking with us.",
    ].join("\n");

    const blob = new Blob([receipt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${appointmentId.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const actionClass = cn(
    type.nav,
    "inline-flex min-h-11 items-center justify-center gap-2 px-4",
    "text-[var(--brand-purple)] transition-colors hover:text-[var(--brand-purple-dark)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)] focus-visible:ring-offset-2"
  );

  return (
    <div>
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--brand-purple)]/15 bg-[var(--brand-purple-light)]/60 text-[var(--brand-purple)]">
          <Check className="h-7 w-7" strokeWidth={2} />
        </div>
        <div className="space-y-3">
          <h2 className={type.sectionTitle}>Your appointment is confirmed</h2>
          <p className={cn(type.bodyMuted, "mx-auto", type.prose)}>
            Your appointment has been reserved. We look forward to seeing you.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <BookingConfirmationCard
          psychologist={psychologist}
          service={service}
          selectedSlot={selectedSlot}
        />
      </div>

      <div className="mt-4 sm:mt-5">
        <div
          className={cn(
            "mx-auto flex max-w-lg flex-col items-stretch",
            "divide-y divide-[var(--brand-border)]",
            "sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:divide-x sm:divide-y-0 sm:divide-[var(--brand-purple)]/15"
          )}
        >
          <Link href="/client/dashboard" className={actionClass}>
            <Calendar className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            View Appointments
          </Link>
          <button type="button" onClick={handleDownloadReceipt} className={actionClass}>
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            <span className="sm:hidden">Download Receipt</span>
            <span className="hidden sm:inline">Receipt</span>
          </button>
          <button type="button" onClick={handleAddToCalendar} className={actionClass}>
            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            <span className="sm:hidden">Add to Calendar</span>
            <span className="hidden sm:inline">Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
