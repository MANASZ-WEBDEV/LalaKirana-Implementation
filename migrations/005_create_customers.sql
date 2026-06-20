-- ============================================================
-- LalaKirana — Migration 005
-- Table: customers
-- ============================================================

CREATE TABLE customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT,
  address        TEXT,
  is_trusted     BOOLEAN NOT NULL DEFAULT false,   -- Phase 3: click & collect eligibility
  total_balance  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_balance >= 0),
  -- khata: total amount currently owed by this customer
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  -- Phase 3+: advance deposit balance
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name  ON customers USING gin(to_tsvector('simple', name));

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  customers              IS 'Credit customers with khata accounts';
COMMENT ON COLUMN customers.total_balance  IS 'Running khata balance — total owed to shop';
COMMENT ON COLUMN customers.wallet_balance IS 'Phase 3+: advance deposit held by shop';
COMMENT ON COLUMN customers.is_trusted     IS 'Phase 3: marks customer eligible for click & collect';
