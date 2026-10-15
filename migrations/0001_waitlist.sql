-- AI Desk Pro news waitlist (Cloudflare D1 / SQLite).
-- Apply with: wrangler d1 migrations apply <DB_NAME> --remote

CREATE TABLE IF NOT EXISTS waitlist_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  consent_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  created_at INTEGER NOT NULL
);

-- Rate-limit ledger. Stores only a salted SHA-256 of the client IP, never the IP itself.
CREATE TABLE IF NOT EXISTS waitlist_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_attempts_ip_time ON waitlist_attempts (ip_hash, created_at);
