-- ============================================================
-- LalaKirana — Migration 019
-- Table: suppliers
-- ============================================================

CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  note          TEXT,
  -- e.g. "Comes every Tuesday", "Wholesaler from Indore"
  total_balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_balance >= 0),
  -- amount WE owe to this supplier (supplier khata)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_name     ON suppliers USING gin(to_tsvector('simple', name));
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage suppliers"
  ON suppliers FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  suppliers               IS 'Sellers/wholesalers who supply goods to LalaKirana';
COMMENT ON COLUMN suppliers.total_balance  IS 'Amount the shop currently owes this supplier (supplier khata)';
COMMENT ON COLUMN suppliers.note           IS 'Free-text note about the supplier (schedule, specialty, etc.)';
