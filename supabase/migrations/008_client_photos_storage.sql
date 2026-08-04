-- Public bucket for client profile photos (admin upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos',
  'client-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view client photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-photos');

CREATE POLICY "Admins can upload client photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-photos' AND is_admin());

CREATE POLICY "Admins can update client photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-photos' AND is_admin())
  WITH CHECK (bucket_id = 'client-photos' AND is_admin());

CREATE POLICY "Admins can delete client photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-photos' AND is_admin());
