-- ============================================================
-- LalaKirana — Migration 032
-- Add quick_weight_prices column to products table
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS quick_weight_prices JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN products.quick_weight_prices IS 'Mapping of stringified weight values in kg to fixed prices: {"0.05": 55, "0.1": 100}';
