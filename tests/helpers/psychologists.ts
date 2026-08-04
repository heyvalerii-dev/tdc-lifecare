import type { Psychologist } from "@/types/database";
import { slugifyPsychologistName } from "@/lib/psychologist-slugs";
import { ids, nextId } from "./ids";

export const GIAN = ids.gian;
export const APRIL = ids.april;

export function createPsychologist(
  overrides: Partial<Psychologist> & { name?: string } = {}
): Psychologist {
  const name = overrides.name ?? "Test Psychologist";
  const id =
    overrides.id ??
    (name.toLowerCase().includes("april")
      ? ids.april
      : name.toLowerCase().includes("gian")
        ? ids.gian
        : nextId("psych"));

  return {
    id,
    slug: overrides.slug ?? slugifyPsychologistName(name),
    name,
    title: "PRC-Licensed Psychologist",
    bio: null,
    specialties: [],
    photo_url: null,
    email: null,
    license_number: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
