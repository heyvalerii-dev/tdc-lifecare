export interface BookingDraft {
  psychologistId: string | null;
  serviceId: string | null;
  selectedDate: string | null;
  selectedSlot: string | null;
  responses: Record<string, string | boolean>;
  step: number;
  appointmentId?: string;
}

const STORAGE_KEY = "tdc_booking_draft";

export function saveBookingDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function loadBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
