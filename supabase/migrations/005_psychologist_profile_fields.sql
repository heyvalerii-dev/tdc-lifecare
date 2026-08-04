-- Psychologist profile contact / credential fields for admin detail
ALTER TABLE psychologists
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT;
