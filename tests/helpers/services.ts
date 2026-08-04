import type { Service } from "@/types/database";
import { nextId } from "./ids";

export function createService(overrides: Partial<Service> = {}): Service {
  return {
    id: nextId("service"),
    name: "Individual Therapy",
    description: null,
    price_cents: 250000,
    duration_minutes: 50,
    buffer_minutes: 10,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
