-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles (one per auth user)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles visible to authenticated" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'carousel')),
  caption TEXT,
  embedding VECTOR(512),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts visible to authenticated" ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own posts" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "users delete own posts" ON posts FOR DELETE TO authenticated USING (auth.uid() = author_id);
-- Service role can update embedding
CREATE POLICY "service role updates embedding" ON posts FOR UPDATE USING (true);

CREATE INDEX posts_embedding_idx ON posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX posts_created_at_idx ON posts (created_at DESC);

-- Post media (images/videos, ordered for carousels)
CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_media visible to authenticated" ON post_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_media insert for post owner" ON post_media FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = (SELECT author_id FROM posts WHERE id = post_id));

-- Likes
CREATE TABLE likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes visible to authenticated" ON likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "users manage own likes" ON likes FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments visible to authenticated" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "users delete own comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Semantic search function
CREATE OR REPLACE FUNCTION search_posts(query_embedding VECTOR(512), match_count INT DEFAULT 20)
RETURNS TABLE (
  post_id UUID,
  similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id AS post_id,
    1 - (embedding <=> query_embedding) AS similarity
  FROM posts
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "media visible to authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'media');
CREATE POLICY "users upload media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
