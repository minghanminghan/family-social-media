-- Reddit-style threaded replies on comments.
ALTER TABLE comments ADD COLUMN parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

CREATE INDEX comments_post_id_idx ON comments (post_id);
CREATE INDEX comments_parent_id_idx ON comments (parent_id);
