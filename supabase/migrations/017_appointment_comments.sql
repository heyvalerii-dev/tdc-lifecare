-- Collaborative appointment comments (staff-facing, non-clinical).
CREATE TABLE appointment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  -- Denormalized for stable historical display if profile name/role changes.
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  -- Future: 'system' events, attachments metadata, etc.
  kind TEXT NOT NULL DEFAULT 'comment'
    CHECK (kind IN ('comment', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX appointment_comments_appointment_created_idx
  ON appointment_comments (appointment_id, created_at ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX appointment_comments_author_id_idx
  ON appointment_comments (author_id);

ALTER TABLE appointment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view appointment comments"
  ON appointment_comments FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert appointment comments"
  ON appointment_comments FOR INSERT
  WITH CHECK (is_admin() AND author_id = auth.uid());

CREATE POLICY "Admins can update appointment comments"
  ON appointment_comments FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
