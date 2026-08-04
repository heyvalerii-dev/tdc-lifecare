let counter = 0;

/** Stable seed IDs matching supabase/seed.sql when useful. */
export const ids = {
  gian: "a0000000-0000-0000-0000-000000000001",
  april: "a0000000-0000-0000-0000-000000000002",
  serviceIntake: "b0000000-0000-0000-0000-000000000001",
} as const;

/** Unique id for each builder call (deterministic within a process). */
export function nextId(prefix = "test"): string {
  counter += 1;
  return `${prefix}-${String(counter).padStart(4, "0")}`;
}

/** Reset between test files if needed. */
export function resetIds(): void {
  counter = 0;
}
