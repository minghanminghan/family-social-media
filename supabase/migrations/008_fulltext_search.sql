-- Add full-text search over post captions (all post types, not just "text"
-- posts, since every post type can carry a caption) and rerank it above
-- pure embedding similarity: exact substring match > stemmed lexeme match >
-- semantic-only match.

ALTER TABLE posts ADD COLUMN caption_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(caption, ''))) STORED;

CREATE INDEX posts_caption_tsv_idx ON posts USING GIN (caption_tsv);

-- Signature changed (added query_text), so the old function must be
-- dropped before CREATE OR REPLACE can apply the new signature.
DROP FUNCTION IF EXISTS search_posts(VECTOR(512), INT);

CREATE FUNCTION search_posts(
  query_text TEXT,
  query_embedding VECTOR(512) DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  post_id UUID,
  similarity FLOAT,
  text_rank FLOAT,
  is_exact BOOLEAN
)
LANGUAGE SQL STABLE AS $$
  WITH q AS (
    SELECT websearch_to_tsquery('english', query_text) AS tsq
  ),
  fts AS (
    SELECT
      p.id AS post_id,
      ts_rank_cd(p.caption_tsv, q.tsq) AS text_rank,
      p.caption ILIKE ('%' || query_text || '%') AS is_exact
    FROM posts p, q
    WHERE p.caption_tsv @@ q.tsq
       OR p.caption ILIKE ('%' || query_text || '%')
    LIMIT match_count * 3
  ),
  semantic AS (
    SELECT
      id AS post_id,
      1 - (embedding <=> query_embedding) AS similarity
    FROM posts
    WHERE query_embedding IS NOT NULL AND embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT match_count * 3
  )
  SELECT
    COALESCE(fts.post_id, semantic.post_id) AS post_id,
    COALESCE(semantic.similarity, 0) AS similarity,
    COALESCE(fts.text_rank, 0) AS text_rank,
    COALESCE(fts.is_exact, false) AS is_exact
  FROM fts
  FULL OUTER JOIN semantic USING (post_id)
  ORDER BY is_exact DESC, text_rank DESC, similarity DESC
  LIMIT match_count;
$$;
