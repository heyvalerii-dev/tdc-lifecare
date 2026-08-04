"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-10">
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

      <BookingConfirmationCard
        psychologist={psychologist}
        service={service}
        selectedSlot={selectedSlot}
      />

      <div className="space-y-3 border-t border-[var(--brand-border)] pt-8">
        <p className={cn(type.smallMuted, "text-center text-sm")}>Helpful next steps</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button variant="outline" onClick={handleAddToCalendar} className="w-full">
            <CalendarPlus className="h-4 w-4" />
            Add to Calendar
          </Button>
          <Button variant="outline" onClick={handleDownloadReceipt} className="w-full">
            <Download className="h-4 w-4" />
            Download Receipt
          </Button>
        </div>
        <Link href="/client/dashboard" className="block pt-1">
          <Button variant="ghost" className="w-full text-[var(--brand-purple)] hover:bg-[var(--brand-purple-light)]/50">
            <Calendar className="h-4 w-4" />
            View Upcoming Appointments
          </Button>
        </Link>
      </div>
    </div>
  );
}
