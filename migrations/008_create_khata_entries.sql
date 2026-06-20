-- ============================================================
-- LalaKirana — Migration 008
-- Table: khata_entries
-- ============================================================

CREATE TABLE khata_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bill_id     UUID REFERENCES bills(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  -- 'purchase'  = goods taken on credit (increases balance)
  -- 'payment'   = customer repaid some amount (decreases balance)
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note        TEXT,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  -- soft-delete only — never hard-delete khata records
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_khata_customer   ON khata_entries(customer_id);
CREATE INDEX idx_khata_type       ON khata_entries(type);
CREATE INDEX idx_khata_created_at ON khata_entries(created_at);
CREATE INDEX idx_khata_bill       ON khata_entries(bill_id) WHERE bill_id IS NOT NULL;

ALTER TABLE khata_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage khata_entries"
  ON khata_entries FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  khata_entries          IS 'Ledger of all credit purchases and repayments per customer';
COMMENT ON COLUMN khata_entries.type     IS 'purchase = balance increases; payment = balance decreases';
COMMENT ON COLUMN khata_entries.is_deleted IS 'Soft-delete only — never hard-delete. Balance recalculated on undo.';
