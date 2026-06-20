-- ============================================================
-- LalaKirana — Migration 001
-- Table: users
-- ============================================================

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,                    -- bcrypt hash, rounds=12
  role         TEXT NOT NULL DEFAULT 'staff',    -- 'owner' | 'staff'
  locked_until TIMESTAMPTZ,                      -- set for 30 min after 5 failed logins
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Owner can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role = 'owner'
    )
  );

COMMENT ON TABLE  users              IS 'Staff and owner accounts for LalaKirana';
COMMENT ON COLUMN users.locked_until IS 'NULL = not locked; future timestamp = locked until that time';
COMMENT ON COLUMN users.role         IS 'owner has full access; staff has limited access';
