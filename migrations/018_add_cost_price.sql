-- ============================================================
-- LalaKirana — Migration 018
-- Alter tables: products, bill_items, eod_entries
-- Add cost_price for profit/sales analytics
-- ============================================================

-- 1. Add cost_price to products (purchase/wholesale price)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0);
COMMENT ON COLUMN products.cost_price IS 'Purchase/wholesale price. Sell price is the existing "price" column (MRP).';

-- Set default cost_price for existing products as (price - 5% of price)
UPDATE products SET cost_price = ROUND((price * 0.95)::numeric, 2) WHERE cost_price = 0;

-- 2. Add cost_price snapshot to bill_items (frozen at bill confirmation)
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0);
COMMENT ON COLUMN bill_items.cost_price IS 'Snapshot of product cost_price at sale time — for profit calculation.';

-- Update existing bill_items to default cost_price = unit_price * 0.95
UPDATE bill_items SET cost_price = ROUND((unit_price * 0.95)::numeric, 2) WHERE cost_price = 0;

-- 3. Add unit_price and cost_price to eod_entries
ALTER TABLE eod_entries ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0);
ALTER TABLE eod_entries ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0);
COMMENT ON COLUMN eod_entries.unit_price IS 'Snapshot of sell price at EOD entry time.';
COMMENT ON COLUMN eod_entries.cost_price IS 'Snapshot of cost price at EOD entry time.';

-- Update existing eod_entries to have unit_price and cost_price based on the product
UPDATE eod_entries e
SET unit_price = p.price,
    cost_price = ROUND((p.price * 0.95)::numeric, 2)
FROM products p
WHERE e.product_id = p.id AND e.unit_price = 0;
