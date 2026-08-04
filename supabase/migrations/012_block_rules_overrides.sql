-- Rules vs overrides for blocked time.
-- Rules = recurring default schedule (lunch, weekly meeting).
-- Overrides = calendar exceptions (vacation, one-time adjustments).
-- Overrides suppress overlapping rule occurrences instead of conflicting.

ALTER TABLE unavailable_blocks
  ADD COLUMN IF NOT EXISTS layer TEXT NOT NULL DEFAULT 'override'
    CHECK (layer IN ('rule', 'override'));

COMMENT ON COLUMN unavailable_blocks.layer IS
  'rule = recurring availability rule; override = calendar exception that supersedes rules.';

-- Collapse previously expanded recurring series into a single rule template
-- (keep earliest occurrence; delete the rest).
WITH ranked AS (
  SELECT
    id,
    series_id,
    ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY start_at ASC, id ASC) AS rn
  FROM unavailable_blocks
  WHERE series_id IS NOT NULL
    AND recurrence_type IS DISTINCT FROM 'none'
)
DELETE FROM unavailable_blocks ub
USING ranked r
WHERE ub.id = r.id
  AND r.rn > 1;

UPDATE unavailable_blocks
SET layer = 'rule'
WHERE recurrence_type IS DISTINCT FROM 'none';

UPDATE unavailable_blocks
SET layer = 'override'
WHERE recurrence_type = 'none' OR recurrence_type IS NULL;

CREATE INDEX IF NOT EXISTS unavailable_blocks_psychologist_layer_idx
  ON unavailable_blocks (psychologist_id, layer);
