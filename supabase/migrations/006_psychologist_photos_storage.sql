-- Public bucket for psychologist profile photos (admin upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'psychologist-photos',
  'psychologist-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view psychologist photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'psychologist-photos');

CREATE POLICY "Admins can upload psychologist photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'psychologist-photos' AND is_admin());

CREATE POLICY "Admins can update psychologist photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'psychologist-photos' AND is_admin())
  WITH CHECK (bucket_id = 'psychologist-photos' AND is_admin());

CREATE POLICY "Admins can delete psychologist photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'psychologist-photos' AND is_admin());
