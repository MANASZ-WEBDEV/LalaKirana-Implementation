-- ============================================================
-- LalaKirana — Migration 012
-- Table: token_blocklist
-- ============================================================

CREATE TABLE token_blocklist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_jti  TEXT UNIQUE NOT NULL,
  -- The 'jti' (JWT ID) claim — unique UUID per token
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  -- Same as JWT exp — used for cleanup of expired entries
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocklist_jti     ON token_blocklist(token_jti);
CREATE INDEX idx_blocklist_expires ON token_blocklist(expires_at);

-- Auth middleware checks this table on every request:
-- SELECT 1 FROM token_blocklist WHERE token_jti = $1 LIMIT 1
-- If found → 401 Unauthorized

-- Cleanup function — run nightly to remove expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM token_blocklist WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE token_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for token_blocklist"
  ON token_blocklist FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE token_blocklist IS 'Revoked JWT tokens — checked on every authenticated request';
COMMENT ON FUNCTION cleanup_expired_tokens IS 'Run nightly to purge expired token entries';
