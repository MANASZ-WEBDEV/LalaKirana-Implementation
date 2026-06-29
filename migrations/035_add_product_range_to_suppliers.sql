-- Migration: Add product_range column to suppliers table
-- Stores what product categories/lines the supplier deals in
-- e.g. "Dairy, Oil, Snacks, Beverages"

ALTER TABLE suppliers
  ADD COLUMN product_range TEXT DEFAULT NULL;

COMMENT ON COLUMN suppliers.product_range IS 'Comma-separated list of product categories supplied, e.g. Dairy, Oil, Snacks';
