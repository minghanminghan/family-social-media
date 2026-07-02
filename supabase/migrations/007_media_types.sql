-- Collapse the old image/video/carousel post types into a single "media"
-- type (multi-file upload was already supported for carousels; now every
-- media post can hold one or more image/video items), and add "audio" and
-- "file" (pdf/txt/md/zip) as new post types.

ALTER TABLE posts DROP CONSTRAINT posts_type_check;
UPDATE posts SET type = 'media' WHERE type IN ('image', 'video', 'carousel');
ALTER TABLE posts ADD CONSTRAINT posts_type_check CHECK (type IN ('text', 'media', 'audio', 'file'));

ALTER TABLE post_media DROP CONSTRAINT post_media_media_type_check;
ALTER TABLE post_media ADD CONSTRAINT post_media_media_type_check CHECK (media_type IN ('image', 'video', 'audio', 'file'));

-- Uploaded filenames aren't otherwise recoverable (storage_path is a
-- sanitized "<user>/<post>/<index>.<ext>" path, not the original name),
-- but audio/file attachments need something more meaningful than an index
-- to display, so keep the original name as informational text only.
ALTER TABLE post_media ADD COLUMN original_filename TEXT;
