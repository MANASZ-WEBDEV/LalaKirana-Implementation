-- Migration 040: Create activity_log table
-- Unified activity tracking for all user actions across the POS system.
-- Captures snapshots of user name/role at action time (immune to later edits).

CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name       TEXT NOT NULL,                -- snapshot — stays accurate if name changes
  user_role       TEXT NOT NULL,                -- 'owner' | 'staff' | 'master'
  action_type     TEXT NOT NULL,
  -- Supported action_types:
  -- 'bill_confirmed' | 'bill_cancelled'
  -- 'stock_adjusted' | 'purchase_created' | 'expense_logged'
  -- 'price_changed' | 'product_created' | 'product_edited'
  -- 'khata_repayment' | 'customer_created'
  -- 'login' | 'logout' | 'password_changed'
  reference_id    UUID,                         -- bill_id, product_id, customer_id, etc.
  reference_label TEXT,                         -- 'LK/2627/00161', 'Tata Salt', etc.
  amount          NUMERIC(10,2),                -- for financial actions, NULL otherwise
  note            TEXT,                         -- extra context (cancel reason, stock adjust reason, etc.)
  ip_address      TEXT,                         -- captured from request
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_activity_user       ON activity_log(user_id);
CREATE INDEX idx_activity_type       ON activity_log(action_type);
CREATE INDEX idx_activity_created    ON activity_log(created_at);
CREATE INDEX idx_activity_user_date  ON activity_log(user_id, created_at);

-- Enable Row-Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- SELECT Policies (who can READ logs)

-- 1. Master: can read ALL activity logs (cross-shop visibility)
CREATE POLICY "Master can read all activity logs"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role = 'master'
    )
  );

-- 2. Owner: can read all logs except master's own actions
CREATE POLICY "Owner can read non-master activity logs"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role = 'owner'
    )
    AND user_role != 'master'
  );

-- 3. Staff: can read ONLY their own activity logs
CREATE POLICY "Staff can read own activity logs"
  ON activity_log FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- INSERT Policy (who can WRITE logs)
-- Any authenticated user can insert a log entry for themselves
CREATE POLICY "Authenticated users can insert own activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
