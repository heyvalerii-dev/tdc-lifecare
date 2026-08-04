-- Calendar blocked time: expanded reasons + recurrence metadata
-- Convert reason enum → text so we can use clinic-friendly labels without
-- fighting Postgres enum transaction limits.

ALTER TABLE unavailable_blocks
  ALTER COLUMN reason TYPE TEXT USING reason::text;

ALTER TABLE unavailable_blocks
  ALTER COLUMN reason SET DEFAULT 'other';

DROP TYPE IF EXISTS unavailable_reason;

ALTER TABLE unavailable_blocks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS series_id UUID,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence_type IN ('none', 'weekday', 'weekly', 'monthly', 'custom')),
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER NOT NULL DEFAULT 1
    CHECK (recurrence_interval >= 1),
  ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_end_type TEXT NOT NULL DEFAULT 'never'
    CHECK (recurrence_end_type IN ('never', 'on_date', 'after_count')),
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_count INTEGER
    CHECK (recurrence_count IS NULL OR recurrence_count >= 1);

CREATE INDEX IF NOT EXISTS unavailable_blocks_psychologist_range_idx
  ON unavailable_blocks (psychologist_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS unavailable_blocks_series_id_idx
  ON unavailable_blocks (series_id)
  WHERE series_id IS NOT NULL;

COMMENT ON COLUMN unavailable_blocks.series_id IS
  'Shared id for occurrences generated from one recurring block save.';
COMMENT ON COLUMN unavailable_blocks.title IS
  'Optional display title when reason = other.';
