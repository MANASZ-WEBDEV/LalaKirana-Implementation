-- ============================================================
-- LalaKirana — Migration 011
-- Table: eod_entries  (End-of-Day Stock Entry)
-- ============================================================

CREATE TABLE eod_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  -- The calendar day these diary sales occurred
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  -- Snapshot of product name at entry time
  qty_sold   INTEGER NOT NULL CHECK (qty_sold > 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eod_date    ON eod_entries(entry_date);
CREATE INDEX idx_eod_product ON eod_entries(product_id);

-- Unique constraint: one entry per product per day (prevents double submission)
CREATE UNIQUE INDEX idx_eod_unique_product_date
  ON eod_entries(product_id, entry_date)
  WHERE product_id IS NOT NULL;

ALTER TABLE eod_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage eod_entries"
  ON eod_entries FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  eod_entries            IS 'Daily batch stock deduction from paper diary entries';
COMMENT ON COLUMN eod_entries.entry_date IS 'The day the sales happened — may differ from created_at if entered next morning';
COMMENT ON COLUMN eod_entries.qty_sold   IS 'Total qty of this product sold via small cash sales that day';
