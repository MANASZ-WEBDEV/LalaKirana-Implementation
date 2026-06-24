-- ============================================================
-- LalaKirana — Migration 027
-- Add MRP column to products table
-- ============================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2);

COMMENT ON COLUMN products.mrp IS
'Maximum Retail Price printed on packet.
Savings = (mrp - price) * qty per item.
NULL means MRP not configured for this product.';
