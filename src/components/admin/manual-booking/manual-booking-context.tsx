"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CalendarDrawer } from "@/components/admin/manual-booking/calendar-drawer";
import {
  BLOCK_MODE_KEY,
  CALENDAR_DRAWER_TAB_KEY,
  type BlockFormMode,
  type CalendarDrawerTab,
} from "@/lib/calendar-blocks";
import { DEFAULT_CLINIC_WORKING_DAYS } from "@/lib/clinic-working-days";
import type { ManualBookingSlotPreset } from "@/lib/manual-booking";
import type {
  AppointmentWithRelations,
  UnavailableBlock,
} from "@/types/database";

/** Appointment-side drawer modes (Block Time is a separate tab). */
export type AppointmentDrawerMode = "new" | "quick" | "edit";

export type OverrideFromRulePrefill = {
  rule: UnavailableBlock;
  dateStr: string;
};

interface CalendarDrawerContextValue {
  open: boolean;
  tab: CalendarDrawerTab;
  appointmentMode: AppointmentDrawerMode;
  slot: ManualBookingSlotPreset | null;
  editingBlock: UnavailableBlock | null;
  editingAppointment: AppointmentWithRelations | null;
  overrideFromRule: OverrideFromRulePrefill | null;
  /** Clinic operating weekdays (0=Sun … 6=Sat). */
  workingDays: number[];
  /** Opens last-used tab; with a slot, locks schedule (quick / block). */
  openCalendarDrawer: (slot?: ManualBookingSlotPreset | null) => void;
  /** Mode 1 — New Appointment (everything editable). */
  openNewAppointment: () => void;
  /** Mode 1 alias for existing "New Appointment" CTAs. */
  openManualBooking: (slot?: ManualBookingSlotPreset | null) => void;
  /** Mode 2 — Quick Create from an empty calendar slot. */
  openQuickCreate: (slot: ManualBookingSlotPreset) => void;
  /** Mode 3 — Edit / reschedule an existing appointment. */
  openEditAppointment: (appointment: AppointmentWithRelations) => void;
  openBlockTime: (args?: {
    slot?: ManualBookingSlotPreset | null;
    block?: UnavailableBlock | null;
    overrideFromRule?: OverrideFromRulePrefill | null;
    /** Prefer one-time when opening from profile Unavailable Blocks. */
    mode?: BlockFormMode;
  }) => void;
  closeCalendarDrawer: () => void;
  setTab: (tab: CalendarDrawerTab) => void;
}

const CalendarDrawerContext =
  createContext<CalendarDrawerContextValue | null>(null);

function readStoredTab(): CalendarDrawerTab {
  if (typeof window === "undefined") return "appointment";
  try {
    const stored = sessionStorage.getItem(CALENDAR_DRAWER_TAB_KEY);
    if (stored === "appointment" || stored === "block") return stored;
  } catch {
    /* ignore */
  }
  return "appointment";
}

export function ManualBookingProvider({
  children,
  workingDays = [...DEFAULT_CLINIC_WORKING_DAYS],
}: {
  children: ReactNode;
  workingDays?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTabState] = useState<CalendarDrawerTab>("appointment");
  const [appointmentMode, setAppointmentMode] =
    useState<AppointmentDrawerMode>("new");
  const [slot, setSlot] = useState<ManualBookingSlotPreset | null>(null);
  const [editingBlock, setEditingBlock] = useState<UnavailableBlock | null>(
    null
  );
  const [overrideFromRule, setOverrideFromRule] =
    useState<OverrideFromRulePrefill | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentWithRelations | null>(null);

  useEffect(() => {
    setTabState(readStoredTab());
  }, []);

  const setTab = useCallback((next: CalendarDrawerTab) => {
    setTabState(next);
    try {
      sessionStorage.setItem(CALENDAR_DRAWER_TAB_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const openCalendarDrawer = useCallback(
    (nextSlot?: ManualBookingSlotPreset | null) => {
      setEditingBlock(null);
      setOverrideFromRule(null);
      setEditingAppointment(null);
      if (nextSlot) {
        setSlot(nextSlot);
        setAppointmentMode("quick");
        setTab("appointment");
      } else {
        setSlot(null);
        setAppointmentMode("new");
      }
      setOpen(true);
    },
    [setTab]
  );

  const openNewAppointment = useCallback(() => {
    setSlot(null);
    setEditingBlock(null);
    setOverrideFromRule(null);
    setEditingAppointment(null);
    setAppointmentMode("new");
    setTab("appointment");
    setOpen(true);
  }, [setTab]);

  const openManualBooking = useCallback(
    (nextSlot?: ManualBookingSlotPreset | null) => {
      if (nextSlot) {
        setSlot(nextSlot);
        setEditingBlock(null);
        setOverrideFromRule(null);
        setEditingAppointment(null);
        setAppointmentMode("quick");
        setTab("appointment");
        setOpen(true);
        return;
      }
      openNewAppointment();
    },
    [openNewAppointment, setTab]
  );

  const openQuickCreate = useCallback(
    (nextSlot: ManualBookingSlotPreset) => {
      setSlot(nextSlot);
      setEditingBlock(null);
      setOverrideFromRule(null);
      setEditingAppointment(null);
      setAppointmentMode("quick");
      setTab("appointment");
      setOpen(true);
    },
    [setTab]
  );

  const openEditAppointment = useCallback(
    (appointment: AppointmentWithRelations) => {
      setSlot(null);
      setEditingBlock(null);
      setOverrideFromRule(null);
      setEditingAppointment(appointment);
      setAppointmentMode("edit");
      setTab("appointment");
      setOpen(true);
    },
    [setTab]
  );

  const openBlockTime = useCallback(
    (args?: {
      slot?: ManualBookingSlotPreset | null;
      block?: UnavailableBlock | null;
      overrideFromRule?: OverrideFromRulePrefill | null;
      mode?: BlockFormMode;
    }) => {
      if (args?.mode === "one_time" || args?.mode === "recurring") {
        try {
          sessionStorage.setItem(BLOCK_MODE_KEY, args.mode);
        } catch {
          /* ignore */
        }
      }
      setSlot(args?.slot ?? null);
      setEditingBlock(args?.block ?? null);
      setOverrideFromRule(args?.overrideFromRule ?? null);
      setEditingAppointment(null);
      setAppointmentMode("new");
      setTab("block");
      setOpen(true);
    },
    [setTab]
  );

  const closeCalendarDrawer = useCallback(() => {
    setOpen(false);
    setSlot(null);
    setEditingBlock(null);
    setOverrideFromRule(null);
    setEditingAppointment(null);
    setAppointmentMode("new");
  }, []);

  const value = useMemo(
    () => ({
      open,
      tab,
      appointmentMode,
      slot,
      editingBlock,
      editingAppointment,
      overrideFromRule,
      workingDays,
      openCalendarDrawer,
      openNewAppointment,
      openManualBooking,
      openQuickCreate,
      openEditAppointment,
      openBlockTime,
      closeCalendarDrawer,
      setTab,
    }),
    [
      open,
      tab,
      appointmentMode,
      slot,
      editingBlock,
      editingAppointment,
      overrideFromRule,
      workingDays,
      openCalendarDrawer,
      openNewAppointment,
      openManualBooking,
      openQuickCreate,
      openEditAppointment,
      openBlockTime,
      closeCalendarDrawer,
      setTab,
    ]
  );

  return (
    <CalendarDrawerContext.Provider value={value}>
      {children}
      <CalendarDrawer
        open={open}
        onClose={closeCalendarDrawer}
        tab={tab}
        onTabChange={setTab}
        appointmentMode={appointmentMode}
        slot={slot}
        editingBlock={editingBlock}
        editingAppointment={editingAppointment}
        overrideFromRule={overrideFromRule}
      />
    </CalendarDrawerContext.Provider>
  );
}

export function useManualBooking() {
  const ctx = useContext(CalendarDrawerContext);
  if (!ctx) {
    throw new Error(
      "useManualBooking must be used within ManualBookingProvider"
    );
  }
  return ctx;
}

export function useCalendarDrawer() {
  return useManualBooking();
}
