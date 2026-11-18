-- Bug report V1 ("Gửi báo lỗi" in the AI Desk desktop app). Metadata only: the raw JSON bundle lives in the
-- PRIVATE R2 bucket bound as BUG_REPORTS under bundle_key, never in D1 and never served publicly.
-- Apply with: wrangler d1 migrations apply <CMS_DB database name> --remote
-- Note: no semicolons inside comments, the local test runner splits this file on them.

CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY CHECK (length(id) = 9 AND substr(id, 1, 3) = 'BR-'),
  created_at INTEGER NOT NULL,
  app_version TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('stable', 'beta', 'dev')),
  os TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL,
  bundle_key TEXT NOT NULL UNIQUE,
  bundle_bytes INTEGER NOT NULL,
  error_codes TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(error_codes) AND json_type(error_codes) = 'array'),
  workers TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(workers) AND json_type(workers) = 'array')
);

CREATE INDEX IF NOT EXISTS ix_bug_reports_created ON bug_reports(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_bug_reports_version ON bug_reports(app_version, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_bug_reports_channel ON bug_reports(channel, created_at DESC);

-- Rate-limit ledger for POST /api/bug-report. Only a salted SHA-256 of the client IP, never the IP itself.
CREATE TABLE IF NOT EXISTS bug_report_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_bug_report_attempts_ip_time ON bug_report_attempts(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS ix_bug_report_attempts_time ON bug_report_attempts(created_at);
