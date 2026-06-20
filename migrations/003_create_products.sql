-- ============================================================
-- LalaKirana — Migration 003
-- Table: products
-- ============================================================

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock_qty           INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  unit                TEXT NOT NULL DEFAULT 'pcs',   -- 'kg' | 'g' | 'litre' | 'ml' | 'pcs'
  is_active           BOOLEAN NOT NULL DEFAULT true,
  price_updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_is_active   ON products(is_active);
CREATE INDEX idx_products_price_updated ON products(price_updated_at);
CREATE INDEX idx_products_name        ON products USING gin(to_tsvector('english', name));

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Owner can read all products including inactive"
  ON products FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'owner')
  );

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE  products               IS 'Master product catalog for LalaKirana';
COMMENT ON COLUMN products.price         IS 'MRP — GST inclusive. No GST added at billing.';
COMMENT ON COLUMN products.unit          IS 'Display unit: kg, g, litre, ml, pcs';
COMMENT ON COLUMN products.price_updated_at IS 'Timestamp of last price change — used for stale price warnings';
