-- The original "users upload media" policy only checked bucket_id, so any
-- authenticated user could write objects under any other user's folder in
-- the media bucket. Scope INSERT (and add DELETE, needed for deletePost's
-- storage cleanup) to the uploader's own user_id prefix.
DROP POLICY "users upload media" ON storage.objects;

CREATE POLICY "users upload own media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users delete own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
