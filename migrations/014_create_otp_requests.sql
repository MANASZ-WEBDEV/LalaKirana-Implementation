-- ============================================================
-- LalaKirana — Migration 014
-- Table: otp_requests  (Password Reset)
-- ============================================================

CREATE TABLE otp_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  otp_hash   TEXT NOT NULL,
  -- bcrypt hash of the 6-digit OTP code — never store plaintext OTP
  used       BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  -- now() + 10 minutes at time of creation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_email   ON otp_requests(email);
CREATE INDEX idx_otp_expires ON otp_requests(expires_at);

-- Verification logic (in application code):
-- 1. Find latest unused otp_request WHERE email=$1 AND used=false AND expires_at > now()
-- 2. bcrypt.compare(submittedOtp, otp_hash)
-- 3. If match: UPDATE otp_requests SET used=true, then allow password change
-- 4. If expired or not found: return generic error (no user enumeration)

-- Cleanup — run nightly
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_requests WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for otp_requests"
  ON otp_requests FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE otp_requests IS 'One-time password records for password reset flow';
COMMENT ON COLUMN otp_requests.otp_hash IS 'bcrypt hash of 6-digit OTP — plaintext never stored';
