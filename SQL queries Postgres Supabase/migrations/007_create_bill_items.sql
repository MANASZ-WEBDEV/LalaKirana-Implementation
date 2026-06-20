-- ============================================================
-- LalaKirana — Migration 007
-- Table: bill_items
-- ============================================================

CREATE TABLE bill_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  -- Snapshot of product name at time of sale (in case product is later renamed)
  qty         INTEGER NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  -- Snapshot of price at time of bill confirmation — never changes after
  subtotal    NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
  -- qty * unit_price — stored for fast retrieval
);

CREATE INDEX idx_bill_items_bill    ON bill_items(bill_id);
CREATE INDEX idx_bill_items_product ON bill_items(product_id);

ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bill_items"
  ON bill_items FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  bill_items             IS 'Line items for full bills';
COMMENT ON COLUMN bill_items.unit_price  IS 'Price snapshot at confirmation — immutable after save';
COMMENT ON COLUMN bill_items.product_name IS 'Name snapshot — preserved even if product is renamed';
