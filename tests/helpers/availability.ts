import type { AvailabilityBlock } from "@/types/database";
import { nextId } from "./ids";

/** Recurring weekly availability window (day_of_week: 0=Sun … 6=Sat). */
export function createAvailability(
  overrides: Partial<AvailabilityBlock> &
    Pick<AvailabilityBlock, "psychologist_id" | "day_of_week">
): AvailabilityBlock {
  return {
    id: nextId("avail"),
    start_time: "09:00:00",
    end_time: "17:00:00",
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
