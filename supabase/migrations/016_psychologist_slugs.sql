-- Human-friendly psychologist URL slugs (admin routes). UUIDs remain PKs.

ALTER TABLE psychologists
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill from name; append a short id suffix when the base slug collides.
WITH prepared AS (
  SELECT
    id,
    NULLIF(
      trim(
        both '-'
        FROM lower(
          regexp_replace(
            regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', '-', 'g'),
            '-{2,}',
            '-',
            'g'
          )
        )
      ),
      ''
    ) AS base_slug
  FROM psychologists
),
ranked AS (
  SELECT
    id,
    coalesce(base_slug, 'psychologist') AS base_slug,
    row_number() OVER (
      PARTITION BY coalesce(base_slug, 'psychologist')
      ORDER BY id
    ) AS rn
  FROM prepared
)
UPDATE psychologists p
SET slug = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || substr(replace(r.id::text, '-', ''), 1, 4)
END
FROM ranked r
WHERE p.id = r.id
  AND (p.slug IS NULL OR p.slug = '');

ALTER TABLE psychologists
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS psychologists_slug_key
  ON psychologists (slug);
