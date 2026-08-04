-- Block Time redesign: all-day overrides + daily recurrence + rule supersession

ALTER TABLE unavailable_blocks
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE unavailable_blocks
  ADD COLUMN IF NOT EXISTS suppresses_rule_id UUID
    REFERENCES unavailable_blocks(id) ON DELETE SET NULL;

-- Expand recurrence_type CHECK to include daily (drop old constraint first)
ALTER TABLE unavailable_blocks
  DROP CONSTRAINT IF EXISTS unavailable_blocks_recurrence_type_check;

ALTER TABLE unavailable_blocks
  ADD CONSTRAINT unavailable_blocks_recurrence_type_check
  CHECK (recurrence_type IN (
    'none',
    'daily',
    'weekday',
    'weekly',
    'monthly',
    'custom'
  ));

COMMENT ON COLUMN unavailable_blocks.all_day IS
  'One-time override spanning full calendar days (vacation, holiday).';
COMMENT ON COLUMN unavailable_blocks.suppresses_rule_id IS
  'When set, this override replaces the linked recurring rule on covered dates even if times do not overlap.';

CREATE INDEX IF NOT EXISTS unavailable_blocks_suppresses_rule_idx
  ON unavailable_blocks (suppresses_rule_id)
  WHERE suppresses_rule_id IS NOT NULL;
