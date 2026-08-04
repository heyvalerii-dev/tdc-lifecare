-- Extended client profile fields for manual / walk-in client creation
CREATE TYPE client_sex AS ENUM (
  'female',
  'male',
  'other',
  'prefer_not_to_say'
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS sex client_sex,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS assigned_psychologist_id UUID
    REFERENCES psychologists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

CREATE INDEX IF NOT EXISTS profiles_assigned_psychologist_id_idx
  ON profiles (assigned_psychologist_id)
  WHERE assigned_psychologist_id IS NOT NULL;

-- Backfill first/last from full_name where missing
UPDATE profiles
SET
  first_name = COALESCE(
    first_name,
    NULLIF(split_part(trim(full_name), ' ', 1), '')
  ),
  last_name = COALESCE(
    last_name,
    NULLIF(
      trim(substring(trim(full_name) from length(split_part(trim(full_name), ' ', 1)) + 1)),
      ''
    )
  )
WHERE full_name IS NOT NULL
  AND trim(full_name) <> ''
  AND (first_name IS NULL OR last_name IS NULL);
