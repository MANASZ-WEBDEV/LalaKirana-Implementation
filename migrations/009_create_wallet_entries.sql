-- ============================================================
-- LalaKirana — Migration 009
-- Table: wallet_entries  (Phase 3+ feature)
-- ============================================================

CREATE TABLE wallet_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bill_id     UUID REFERENCES bills(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  -- 'deposit'   = customer added money to wallet
  -- 'deduction' = wallet used to pay a bill
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note        TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_customer ON wallet_entries(customer_id);
CREATE INDEX idx_wallet_type     ON wallet_entries(type);

ALTER TABLE wallet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage wallet_entries"
  ON wallet_entries FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE wallet_entries IS 'Phase 3+: advance deposit wallet per customer';
