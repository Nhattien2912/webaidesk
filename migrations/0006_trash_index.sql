-- Trash (soft delete) listing: index only, no data change.
CREATE INDEX IF NOT EXISTS ix_cms_contents_trash ON cms_contents(deleted_at DESC, id DESC) WHERE deleted_at IS NOT NULL;
