-- ============================================================
-- LalaKirana — Migration 006
-- Table: bills
-- ============================================================

CREATE TABLE bills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT UNIQUE,
  -- Format: LK-YYYY-NNNNN  e.g. LK-2026-00001
  -- NULL while status='draft'; assigned on confirmation
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  -- Sum of bill_items.subtotal only. NO GST — prices are MRP (GST-inclusive)
  mode        TEXT NOT NULL DEFAULT 'full',
  -- 'full' | 'quick'
  status      TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'paid' | 'khata' | 'cancelled'
  note        TEXT,
  -- Used for quick bills: short description of what was sold
  synced      BOOLEAN NOT NULL DEFAULT true,
  -- false = bill created offline, not yet synced to server
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bills_status     ON bills(status);
CREATE INDEX idx_bills_mode       ON bills(mode);
CREATE INDEX idx_bills_customer   ON bills(customer_id);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bills_number     ON bills(bill_number) WHERE bill_number IS NOT NULL;

-- Auto-generate bill_number sequence per year
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START 1;

-- Function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT := to_char(now(), 'YYYY');
  seq_val   INT;
BEGIN
  SELECT nextval('bill_number_seq') INTO seq_val;
  RETURN 'LK-' || year_part || '-' || lpad(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bills"
  ON bills FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  bills             IS 'All billing transactions — full and quick bills';
COMMENT ON COLUMN bills.bill_number IS 'LK-YYYY-NNNNN format. NULL until confirmed.';
COMMENT ON COLUMN bills.mode        IS 'full = itemised with products; quick = amount only';
COMMENT ON COLUMN bills.status      IS 'draft → paid or khata or cancelled';
COMMENT ON COLUMN bills.synced      IS 'false = created offline, pending server sync';
