-- ============================================================
-- LalaKirana — Migration 004
-- Table: stock_log
-- ============================================================

CREATE TABLE stock_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_qty  INTEGER NOT NULL,
  -- positive = stock added (new arrival, audit correction)
  -- negative = stock deducted (bill, eod_entry, damage)
  reason      TEXT NOT NULL,
  -- 'bill_confirm' | 'eod_entry' | 'manual_adjust' | 'damage' | 'audit' | 'returned'
  bill_id     UUID,                           -- links to bills(id) when reason='bill_confirm'
  note        TEXT,                           -- optional free-text explanation
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_log_product    ON stock_log(product_id);
CREATE INDEX idx_stock_log_created_at ON stock_log(created_at);
CREATE INDEX idx_stock_log_reason     ON stock_log(reason);

ALTER TABLE stock_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock_log"
  ON stock_log FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert stock_log"
  ON stock_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE  stock_log            IS 'Immutable audit trail of every stock movement';
COMMENT ON COLUMN stock_log.change_qty IS 'Positive = added, Negative = deducted';
COMMENT ON COLUMN stock_log.reason     IS 'bill_confirm | eod_entry | manual_adjust | damage | audit | returned';
