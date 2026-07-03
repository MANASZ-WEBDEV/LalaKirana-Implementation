-- Migration 039: Create master_audit_log table
CREATE TABLE master_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                                  -- e.g., 'reset_password', 'deactivate_user'
  target_id   UUID,                                           -- ID of user or entity affected
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE master_audit_log ENABLE ROW LEVEL SECURITY;

-- Security Policy: Only users with the 'master' role can view audit logs
CREATE POLICY "Master can read master audit logs"
  ON master_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role = 'master'
    )
  );
