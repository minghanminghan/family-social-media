-- The original "service role updates embedding" policy had no TO/WITH CHECK
-- clause, so it actually let ANY authenticated user overwrite ANY post's
-- caption/type/embedding, not just their own. The embedding callback route
-- uses the service-role key, which bypasses RLS entirely, so this policy
-- never actually served its stated purpose. Replace it with a policy scoped
-- to the post's own author, now that authors can edit their caption.
DROP POLICY "service role updates embedding" ON posts;

CREATE POLICY "users update own posts" ON posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
