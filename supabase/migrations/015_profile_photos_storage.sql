-- Public bucket for profile photos (admin self-serve avatar uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Admins can upload profile photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND is_admin());

CREATE POLICY "Admins can update profile photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos' AND is_admin())
  WITH CHECK (bucket_id = 'profile-photos' AND is_admin());

CREATE POLICY "Admins can delete profile photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-photos' AND is_admin());
