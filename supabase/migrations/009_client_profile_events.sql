-- Audit trail for client profile field changes (admin timeline)
CREATE TABLE client_profile_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX client_profile_events_client_created_idx
  ON client_profile_events (client_id, created_at DESC);

ALTER TABLE client_profile_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view client profile events"
  ON client_profile_events FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert client profile events"
  ON client_profile_events FOR INSERT
  WITH CHECK (is_admin());
