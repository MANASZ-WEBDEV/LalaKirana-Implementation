-- ============================================================
-- LalaKirana — Migration 023
-- Updates: stock_log column + financial-year bill number function
-- ============================================================

-- 1. Add purchase_order_id to stock_log (mirrors existing bill_id column)
ALTER TABLE stock_log ADD COLUMN IF NOT EXISTS purchase_order_id UUID;
-- reason values now include: 'purchase_order' and 'bill_cancel' in addition to existing values
-- Existing: 'bill_confirm' | 'eod_entry' | 'manual_adjust' | 'damage' | 'audit' | 'returned'
-- New:      'purchase_order' | 'bill_cancel'

COMMENT ON COLUMN stock_log.reason IS 'bill_confirm | eod_entry | manual_adjust | damage | audit | returned | purchase_order | bill_cancel';
COMMENT ON COLUMN stock_log.purchase_order_id IS 'Links to purchase_orders(id) when reason=purchase_order';

-- 2. Replace bill_number generation with Indian Financial Year logic
-- Indian FY runs April 1 → March 31
-- Format: LK/2526/00001 (FY 2025-26, bill #1)
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TEXT AS $$
DECLARE
  fy_label TEXT;
  seq_val  INT;
BEGIN
  -- Determine financial year label
  -- If month >= April (4), FY is currentYY-nextYY
  -- If month < April, FY is prevYY-currentYY
  IF EXTRACT(MONTH FROM now()) >= 4 THEN
    fy_label := to_char(now(), 'YY') || to_char(now() + interval '1 year', 'YY');
  ELSE
    fy_label := to_char(now() - interval '1 year', 'YY') || to_char(now(), 'YY');
  END IF;

  -- Find the next sequence number for this financial year
  SELECT COALESCE(MAX(
    NULLIF(split_part(bill_number, '/', 3), '')::int
  ), 0) + 1
  INTO seq_val
  FROM bills
  WHERE bill_number LIKE 'LK/' || fy_label || '/%';

  RETURN 'LK/' || fy_label || '/' || lpad(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_bill_number IS 'Generates LK/YYNN/NNNNN format bill numbers with Indian financial year reset (April 1)';
