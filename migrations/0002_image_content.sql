ALTER TABLE messages ADD COLUMN content_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN image_object_key TEXT;
ALTER TABLE messages ADD COLUMN image_mime_type TEXT;
ALTER TABLE messages ADD COLUMN image_size INTEGER;
ALTER TABLE messages ADD COLUMN image_encryption_iv TEXT;
ALTER TABLE messages ADD COLUMN image_encryption_key_id TEXT;
ALTER TABLE messages ADD COLUMN image_deleted_at TEXT;
