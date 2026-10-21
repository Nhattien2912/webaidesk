CREATE TABLE IF NOT EXISTS cms_rate_limits (
  principal_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(principal_hash, window_start)
);

CREATE INDEX IF NOT EXISTS ix_cms_rate_window ON cms_rate_limits(window_start);
