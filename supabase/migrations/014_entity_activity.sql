-- Activity timeline: meaningful business events + actor attribution
-- Polymorphic entity_activity is easy to extend (appointment | block | client | psychologist).

-- ---------------------------------------------------------------------------
-- Attribution columns on core entities
-- ---------------------------------------------------------------------------

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE unavailable_blocks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.created_by IS 'Admin/user who created the appointment (nullable for legacy rows).';
COMMENT ON COLUMN unavailable_blocks.created_by IS 'Admin who created the block.';
COMMENT ON COLUMN profiles.created_by IS 'Admin who created the client profile, when applicable.';

-- ---------------------------------------------------------------------------
-- entity_activity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS entity_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('appointment', 'block', 'client', 'psychologist')
  ),
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (
    actor_type IN ('admin', 'psychologist', 'client', 'system')
  ),
  action TEXT NOT NULL,
  -- How the action originated (Manual Booking, Client Portal, etc.)
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_activity_entity_created_idx
  ON entity_activity (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS entity_activity_actor_id_idx
  ON entity_activity (actor_id)
  WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS entity_activity_action_idx
  ON entity_activity (action);

COMMENT ON TABLE entity_activity IS
  'Meaningful business events for Activity Timeline (not click-level UI audit).';
COMMENT ON COLUMN entity_activity.source IS
  'Origin channel, e.g. Manual Booking, Client Portal, Recurring Availability Engine.';
COMMENT ON COLUMN entity_activity.metadata IS
  'Flexible JSON for before/after values and display context.';

ALTER TABLE entity_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view entity activity"
  ON entity_activity FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert entity activity"
  ON entity_activity FOR INSERT
  WITH CHECK (is_admin());

-- Allow non-admin actors (e.g. online booking) to log their own events
CREATE POLICY "Users can insert their own entity activity"
  ON entity_activity FOR INSERT
  WITH CHECK (actor_id = auth.uid());
