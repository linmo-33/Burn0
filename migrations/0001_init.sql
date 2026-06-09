CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  ciphertext TEXT,
  encryption_iv TEXT,
  encryption_version INTEGER NOT NULL DEFAULT 1,
  encryption_key_id TEXT,
  text_size INTEGER NOT NULL DEFAULT 0,
  burn_mode TEXT NOT NULL DEFAULT 'time_and_view',
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  opened_at TEXT,
  burned_at TEXT,
  expired_at TEXT,
  quarantined_at TEXT,
  deleted_at TEXT,
  creator_ip_hash TEXT,
  creator_ip_ciphertext TEXT,
  user_agent_hash TEXT,
  user_agent_summary TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  last_reported_at TEXT,
  delete_reason TEXT,
  quarantine_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_status_created ON messages(status, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_creator_ip_hash ON messages(creator_ip_hash);
CREATE INDEX IF NOT EXISTS idx_messages_reported ON messages(report_count, last_reported_at);

CREATE TABLE IF NOT EXISTS message_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  ip_hash TEXT,
  user_agent_summary TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_events_message ON message_events(message_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_events_type ON message_events(event_type, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  reporter_ip_hash TEXT,
  reporter_ip_ciphertext TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  resolution TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_message ON reports(message_id, created_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  ip_hash TEXT,
  ip_ciphertext TEXT,
  user_agent_summary TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id, created_at);

CREATE TABLE IF NOT EXISTS blocked_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_type TEXT NOT NULL,
  value_hash TEXT NOT NULL,
  value_ciphertext TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  lifted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_blocked_sources_lookup ON blocked_sources(block_type, value_hash, status);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip_hash TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_window ON rate_limit_events(event_key, window_start);
