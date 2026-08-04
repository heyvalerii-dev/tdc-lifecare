"use client";

import { useState, type ReactNode } from "react";
import { AppointmentBookingPanel } from "@/components/admin/manual-booking/appointment-booking-panel";
import type {
  AppointmentDrawerMode,
  OverrideFromRulePrefill,
} from "@/components/admin/manual-booking/manual-booking-context";
import {
  BlockTimePanel,
  type BlockDrawerHeader,
} from "@/components/admin/manual-booking/block-time-panel";
import { AppDrawer } from "@/components/ui/app-drawer";
import type { CalendarDrawerTab } from "@/lib/calendar-blocks";
import type { ManualBookingSlotPreset } from "@/lib/manual-booking";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  UnavailableBlock,
} from "@/types/database";

export interface CalendarDrawerProps {
  open: boolean;
  onClose: () => void;
  tab: CalendarDrawerTab;
  onTabChange: (tab: CalendarDrawerTab) => void;
  appointmentMode: AppointmentDrawerMode;
  slot: ManualBookingSlotPreset | null;
  editingBlock: UnavailableBlock | null;
  editingAppointment: AppointmentWithRelations | null;
  overrideFromRule?: OverrideFromRulePrefill | null;
}

function appointmentTitle(mode: AppointmentDrawerMode): string {
  switch (mode) {
    case "quick":
      return "Book Appointment";
    case "edit":
      return "Edit Appointment";
    default:
      return "New Appointment";
  }
}

function appointmentSubtitle(mode: AppointmentDrawerMode): string {
  switch (mode) {
    case "quick":
      return "Complete the booking details for this available slot.";
    case "edit":
      return "Update or reschedule this appointment.";
    default:
      return "Create an appointment for walk-ins, pro bono, or special arrangements.";
  }
}

export function CalendarDrawer({
  open,
  onClose,
  tab,
  onTabChange,
  appointmentMode,
  slot,
  editingBlock,
  editingAppointment,
  overrideFromRule = null,
}: CalendarDrawerProps) {
  const [footer, setFooter] = useState<ReactNode>(null);
  const [blockHeader, setBlockHeader] = useState<BlockDrawerHeader | null>(
    null
  );

  const editingSomething = Boolean(
    editingBlock || editingAppointment || overrideFromRule
  );
  const effectiveTab: CalendarDrawerTab =
    editingBlock || overrideFromRule
      ? "block"
      : editingAppointment
        ? "appointment"
        : tab;

  const isBlock = effectiveTab === "block";

  const title = isBlock
    ? (blockHeader?.title ?? "Block Time")
    : appointmentTitle(appointmentMode);

  const eyebrow = isBlock ? blockHeader?.eyebrow : undefined;
  const badge = isBlock ? blockHeader?.badge : undefined;
  const subtitle = isBlock
    ? blockHeader?.subtitle
    : appointmentSubtitle(appointmentMode);

  const showTabs = !editingSomething;

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      badge={badge}
      subtitle={subtitle}
      footer={footer}
    >
      <div className="space-y-6">
        {showTabs ? (
          <div
            role="tablist"
            aria-label="Calendar drawer mode"
            className="flex gap-1 rounded-xl border border-[var(--brand-purple)]/[0.1] bg-[var(--brand-purple-light)]/30 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={effectiveTab === "appointment"}
              onClick={() => onTabChange("appointment")}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                effectiveTab === "appointment"
                  ? "bg-white text-[var(--brand-purple)] shadow-sm"
                  : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              )}
            >
              Appointment
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={effectiveTab === "block"}
              onClick={() => onTabChange("block")}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                effectiveTab === "block"
                  ? "bg-white text-[var(--brand-purple)] shadow-sm"
                  : "text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
              )}
            >
              Block Time
            </button>
          </div>
        ) : null}

        {effectiveTab === "appointment" ? (
          <AppointmentBookingPanel
            open={open && effectiveTab === "appointment"}
            mode={appointmentMode}
            slot={slot}
            editingAppointment={editingAppointment}
            onClose={onClose}
            onFooterChange={setFooter}
          />
        ) : (
          <BlockTimePanel
            open={open && effectiveTab === "block"}
            slot={slot}
            editingBlock={editingBlock}
            overrideFromRule={overrideFromRule}
            onClose={onClose}
            onFooterChange={setFooter}
            onHeaderChange={setBlockHeader}
          />
        )}
      </div>
    </AppDrawer>
  );
}
