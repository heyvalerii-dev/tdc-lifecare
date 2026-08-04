/** Legacy booking query-param aliases (pre-DB slug). */
export const LEGACY_PSYCHOLOGIST_SLUGS: Record<string, string> = {
  "gian-carlo": "a0000000-0000-0000-0000-000000000001",
  "april-anne": "a0000000-0000-0000-0000-000000000002",
};

/** @deprecated Prefer LEGACY_PSYCHOLOGIST_SLUGS — kept for booking-data re-exports. */
export const PSYCHOLOGIST_SLUGS = LEGACY_PSYCHOLOGIST_SLUGS;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPsychologistUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Normalize a display name into a URL slug (no uniqueness suffix). */
export function slugifyPsychologistName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "psychologist";
}

/**
 * Ensure slug uniqueness among existing values.
 * On collision, appends the first 4 hex chars of the psychologist id.
 */
export function uniquePsychologistSlug(
  nameOrBase: string,
  existingSlugs: Iterable<string>,
  psychologistId: string
): string {
  const base = slugifyPsychologistName(nameOrBase);
  const taken = new Set(
    [...existingSlugs].map((s) => s.toLowerCase()).filter(Boolean)
  );
  if (!taken.has(base)) return base;

  const shortId = psychologistId.replace(/-/g, "").slice(0, 4).toLowerCase();
  let candidate = `${base}-${shortId}`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${shortId}-${n}`;
    n += 1;
  }
  return candidate;
}

export function psychologistAdminPath(
  slug: string,
  suffix: "" | "/unavailable-blocks" = ""
): string {
  return `/admin/psychologists/${slug}${suffix}`;
}

type SlugSource = { id: string; slug?: string | null };

/**
 * Resolve a booking/admin slug or UUID to a psychologist id.
 * Pass the loaded psychologist list so DB slugs resolve without a hardcoded map.
 */
export function resolvePsychologistId(
  slugOrId: string | undefined,
  psychologists?: SlugSource[]
): string | null {
  if (!slugOrId) return null;

  const legacy = LEGACY_PSYCHOLOGIST_SLUGS[slugOrId];
  if (legacy) return legacy;

  if (isPsychologistUuid(slugOrId)) return slugOrId;

  const fromList = psychologists?.find((p) => p.slug === slugOrId);
  if (fromList) return fromList.id;

  return null;
}
