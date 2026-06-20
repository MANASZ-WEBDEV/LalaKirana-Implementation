-- ============================================================
-- LalaKirana — Migration 010
-- Table: price_history
-- ============================================================

CREATE TABLE price_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price  NUMERIC(10,2) NOT NULL,
  new_price  NUMERIC(10,2) NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_date    ON price_history(changed_at);

-- Trigger: auto-log to price_history whenever products.price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price <> NEW.price THEN
    INSERT INTO price_history (product_id, old_price, new_price, changed_by, changed_at)
    VALUES (NEW.id, OLD.price, NEW.price, auth.uid()::uuid, now());

    -- Also update price_updated_at on the product
    NEW.price_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_price_change
  BEFORE UPDATE OF price ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price_history"
  ON price_history FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Trigger can insert price_history"
  ON price_history FOR INSERT WITH CHECK (true);

COMMENT ON TABLE price_history IS 'Immutable log of every product price change';
COMMENT ON FUNCTION log_price_change IS 'Auto-fires on products.price UPDATE — no manual insert needed';
