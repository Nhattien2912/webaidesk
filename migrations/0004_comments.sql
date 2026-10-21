PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cms_comments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES cms_contents(id) ON DELETE RESTRICT,
  content_kind TEXT NOT NULL CHECK (content_kind IN ('article','app')),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 2 AND 60),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  abuse_key TEXT NOT NULL,
  parent_id TEXT REFERENCES cms_comments(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  moderated_at INTEGER,
  moderator_actor TEXT,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS ix_cms_comments_public
  ON cms_comments(content_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_cms_comments_moderation
  ON cms_comments(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_cms_comments_abuse
  ON cms_comments(abuse_key, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_comment_rate_limits (
  abuse_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(abuse_key, window_start)
);
CREATE INDEX IF NOT EXISTS ix_cms_comment_rate_window ON cms_comment_rate_limits(window_start);
