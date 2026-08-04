import { slugifyPsychologistName } from "@/lib/psychologist-slugs";

export interface PsychologistDisplayProfile {
  id: string;
  slug: string;
  name: string;
  firstName: string;
  photo: string;
  credentials: string;
  intro: string;
  focusAreas: string[];
}

export const PSYCHOLOGIST_DISPLAY: Record<
  string,
  Omit<PsychologistDisplayProfile, "id" | "name" | "slug">
> = {
  "a0000000-0000-0000-0000-000000000001": {
    firstName: "Gian Carlo",
    photo: "/psychologists/gian-carlo.jpg",
    credentials: "PRC-Licensed Psychologist",
    intro: "Supports adults, couples, and young professionals",
    focusAreas: ["Depression", "Anxiety", "Couples Therapy", "Stress & Burnout"],
  },
  "a0000000-0000-0000-0000-000000000002": {
    firstName: "April Anne",
    photo: "/psychologists/april-anne.jpg",
    credentials: "PRC-Licensed Psychologist",
    intro: "Supports women, children, teens, and families",
    focusAreas: ["Women", "Children", "Families", "Parenting"],
  },
};

export interface PsychologistDisplayOptions {
  bio?: string | null;
  photoUrl?: string | null;
  slug?: string | null;
}

/**
 * Resolve public display fields. DB values win when present so admin edits
 * immediately reflect on homepage, booking, and appointment surfaces.
 */
export function getPsychologistDisplay(
  id: string,
  name: string,
  title?: string | null,
  specialties?: string[] | null,
  options?: PsychologistDisplayOptions
): PsychologistDisplayProfile {
  const known = PSYCHOLOGIST_DISPLAY[id];
  const firstName = known?.firstName ?? name.split(" ")[0] ?? name;
  const trimmedTitle = title?.trim();
  const trimmedBio = options?.bio?.trim();
  const trimmedPhoto = options?.photoUrl?.trim();
  const specialtyList = (specialties ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    id,
    slug: options?.slug?.trim() || slugifyPsychologistName(name),
    name,
    firstName,
    photo: trimmedPhoto || known?.photo || "/psychologists/gian-carlo.jpg",
    credentials: trimmedTitle || known?.credentials || "Psychologist",
    intro: trimmedBio || known?.intro || "",
    focusAreas:
      specialtyList.length > 0 ? specialtyList : (known?.focusAreas ?? []),
  };
}

/** @deprecated Prefer Psychologist.slug / display.slug from the database. */
export function psychologistSlug(firstName: string): string {
  return firstName === "Gian Carlo" ? "gian-carlo" : "april-anne";
}
