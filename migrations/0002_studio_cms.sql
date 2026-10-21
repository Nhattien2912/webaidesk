PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cms_contents (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('video','article','app')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body_markdown TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  seo_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  data_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  archived_at INTEGER,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_contents_kind_slug_active
  ON cms_contents(kind, slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_cms_contents_public_listing
  ON cms_contents(kind, status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_cms_contents_admin_listing
  ON cms_contents(kind, status, updated_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cms_videos (
  content_id TEXT PRIMARY KEY REFERENCES cms_contents(id) ON DELETE RESTRICT,
  youtube_id TEXT NOT NULL CHECK (length(youtube_id) = 11),
  thumbnail_url TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cms_applications (
  content_id TEXT PRIMARY KEY REFERENCES cms_contents(id) ON DELETE RESTRICT,
  tagline TEXT NOT NULL DEFAULT '',
  development_status TEXT NOT NULL DEFAULT 'development',
  platforms_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(platforms_json)),
  features_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(features_json)),
  links_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(links_json)),
  logo_media_id TEXT,
  cover_media_id TEXT
);

CREATE TABLE IF NOT EXISTS cms_media (
  id TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 5242880),
  width INTEGER NOT NULL CHECK (width > 0 AND width <= 12000),
  height INTEGER NOT NULL CHECK (height > 0 AND height <= 12000),
  alt_text TEXT NOT NULL DEFAULT '',
  sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS cms_content_media (
  content_id TEXT NOT NULL REFERENCES cms_contents(id) ON DELETE RESTRICT,
  media_id TEXT NOT NULL REFERENCES cms_media(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('cover','logo','screenshot','inline')),
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(content_id, media_id, role)
);

CREATE TABLE IF NOT EXISTS cms_content_revisions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES cms_contents(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  actor TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(content_id, version)
);

CREATE INDEX IF NOT EXISTS ix_cms_revisions_content ON cms_content_revisions(content_id, version DESC);

CREATE TABLE IF NOT EXISTS cms_audit_events (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  operation TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success','denied','failure')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_cms_audit_created ON cms_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_cms_audit_entity ON cms_audit_events(entity_type, entity_id, created_at DESC);

