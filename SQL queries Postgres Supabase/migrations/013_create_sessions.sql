-- ============================================================
-- LalaKirana — Migration 013
-- Table: sessions
-- ============================================================

CREATE TABLE sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_jti   TEXT UNIQUE NOT NULL,
  -- Matches the jti in the JWT — used to terminate a specific session
  device_hint TEXT,
  -- Parsed from User-Agent header e.g. 'Chrome on Windows'
  ip_address  TEXT,
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Updated on each authenticated request from this token
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user      ON sessions(user_id);
CREATE INDEX idx_sessions_token_jti ON sessions(token_jti);

-- Terminating a session:
-- 1. DELETE FROM sessions WHERE id = $session_id
-- 2. INSERT INTO token_blocklist (token_jti, user_id, expires_at)

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for sessions"
  ON sessions FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE sessions IS 'Active login sessions — enables remote logout and session visibility for owner';
