import { formatAvailabilityTime } from "@/lib/admin-psychologists-list";

/** 30-minute slots from 6:00 AM through 11:30 PM (HH:mm, 24h). */
export const TIME_SLOT_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 23 && minute === 30) break;
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({
        value,
        label: formatAvailabilityTime(`${value}:00`),
      });
    }
  }
  // Include 11:30 PM end slot
  options.push({
    value: "23:30",
    label: formatAvailabilityTime("23:30:00"),
  });
  return options;
})();

export function normalizeTimeSlot(value: string): string {
  return value.slice(0, 5);
}
