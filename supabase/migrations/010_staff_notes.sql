-- Polymorphic append-only staff notes (clients, appointments, etc.)
CREATE TABLE staff_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX staff_notes_entity_created_idx
  ON staff_notes (entity_type, entity_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX staff_notes_author_id_idx
  ON staff_notes (author_id);

ALTER TABLE staff_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view staff notes"
  ON staff_notes FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert staff notes"
  ON staff_notes FOR INSERT
  WITH CHECK (is_admin() AND author_id = auth.uid());

-- Soft-delete only (no UPDATE of body). Admins may set deleted_at.
CREATE POLICY "Admins can soft-delete staff notes"
  ON staff_notes FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
