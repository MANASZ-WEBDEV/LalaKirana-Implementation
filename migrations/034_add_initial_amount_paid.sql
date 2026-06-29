-- ============================================================
-- LalaKirana — Migration 034
-- Adds initial_amount_paid to purchase_orders for accurate ledger display.
-- When a PO is partially paid at creation (e.g. ₹5000 of ₹9600), this column
-- preserves that original amount so the supplier ledger can distinguish
-- "cash paid at purchase time" from "subsequent repayments".
-- Also updates confirm_purchase_order_transaction RPC to set this field.
-- ============================================================

-- 1. Add column with sensible default
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS initial_amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN purchase_orders.initial_amount_paid
  IS 'Immutable snapshot of amount_paid at PO creation time. Used for ledger display.';

-- 2. Backfill existing rows: for already-existing POs that have no subsequent
--    repayments, initial_amount_paid = current amount_paid is correct.
--    For POs that DO have subsequent repayments linked, we deduct those.
UPDATE purchase_orders po
SET initial_amount_paid = po.amount_paid - COALESCE(
  (SELECT SUM(sr.amount) FROM supplier_repayments sr
   WHERE sr.supplier_id = po.supplier_id
     AND sr.note LIKE '%PO-' || UPPER(SUBSTRING(po.id::TEXT FROM 1 FOR 8)) || '%'),
  0
);

-- Safety: ensure initial_amount_paid is never negative (edge cases)
UPDATE purchase_orders
SET initial_amount_paid = 0
WHERE initial_amount_paid < 0;

-- 3. Update confirm_purchase_order_transaction to set initial_amount_paid
CREATE OR REPLACE FUNCTION confirm_purchase_order_transaction(
  p_supplier_id UUID,
  p_supplier_name TEXT,
  p_order_date DATE,
  p_reference_number TEXT,
  p_payment_status TEXT,
  p_amount_paid NUMERIC,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB
)
RETURNS JSON AS $$
DECLARE
  v_po_id UUID;
  v_item JSONB;
  v_total NUMERIC(10,2) := 0;
  v_item_count INTEGER := 0;
  v_prod_cost NUMERIC(10,2);
  v_prod_sell NUMERIC(10,2);
  v_prod_mrp NUMERIC(10,2);
  v_prod_stock INTEGER;
  v_unpaid_amount NUMERIC(10,2) := 0;
  v_initial_paid NUMERIC(10,2) := 0;
  v_result JSON;
BEGIN
  -- 1. Calculate totals from items first
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + ((v_item->>'qty')::INTEGER * (v_item->>'cost_price')::NUMERIC);
    v_item_count := v_item_count + (v_item->>'qty')::INTEGER;
  END LOOP;

  -- Compute initial amount paid (immutable snapshot)
  v_initial_paid := CASE WHEN p_payment_status = 'paid' THEN v_total ELSE p_amount_paid END;

  -- 2. Insert PO header
  INSERT INTO purchase_orders (
    supplier_id,
    supplier_name,
    order_date,
    reference_number,
    total,
    item_count,
    payment_status,
    amount_paid,
    initial_amount_paid,
    note,
    status,
    created_by
  ) VALUES (
    p_supplier_id,
    p_supplier_name,
    p_order_date,
    p_reference_number,
    v_total,
    v_item_count,
    p_payment_status,
    v_initial_paid,
    v_initial_paid,
    p_note,
    'confirmed',
    p_created_by
  ) RETURNING id INTO v_po_id;

  -- 3. Process items and update products + stock logs
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Lock and select current product details (including MRP)
    SELECT cost_price, price, mrp, stock_qty INTO v_prod_cost, v_prod_sell, v_prod_mrp, v_prod_stock
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % not found', (v_item->>'product_id');
    END IF;

    -- Insert PO Item row with previous price snapshots
    INSERT INTO purchase_order_items (
      purchase_order_id,
      product_id,
      product_name,
      qty,
      cost_price,
      sell_price,
      mrp,
      previous_cost,
      previous_sell,
      previous_mrp
    ) VALUES (
      v_po_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'qty')::INTEGER,
      (v_item->>'cost_price')::NUMERIC,
      (v_item->>'sell_price')::NUMERIC,
      (v_item->>'mrp')::NUMERIC,
      COALESCE(v_prod_cost, 0),
      COALESCE(v_prod_sell, 0),
      COALESCE(v_prod_mrp, 0)
    );

    -- Update product stock and cost/price/mrp
    UPDATE products
    SET
      stock_qty = v_prod_stock + (v_item->>'qty')::INTEGER,
      cost_price = (v_item->>'cost_price')::NUMERIC,
      price = CASE WHEN (v_item->>'sell_price') IS NOT NULL THEN (v_item->>'sell_price')::NUMERIC ELSE price END,
      mrp = CASE WHEN (v_item->>'mrp') IS NOT NULL THEN (v_item->>'mrp')::NUMERIC ELSE mrp END
    WHERE id = (v_item->>'product_id')::UUID;

    -- Insert stock movement log
    INSERT INTO stock_log (
      product_id,
      change_qty,
      reason,
      purchase_order_id,
      note,
      created_by
    ) VALUES (
      (v_item->>'product_id')::UUID,
      (v_item->>'qty')::INTEGER,
      'purchase_order',
      v_po_id,
      'PO from ' || p_supplier_name || ' (' || SUBSTRING(v_po_id::TEXT FROM 1 FOR 8) || ')',
      p_created_by
    );
  END LOOP;

  -- 4. Adjust supplier balance if credit or partial
  IF p_supplier_id IS NOT NULL AND p_payment_status IN ('credit', 'partial') THEN
    v_unpaid_amount := CASE
      WHEN p_payment_status = 'credit' THEN v_total
      ELSE v_total - p_amount_paid
    END;

    IF v_unpaid_amount > 0 THEN
      UPDATE suppliers
      SET total_balance = total_balance + v_unpaid_amount
      WHERE id = p_supplier_id;
    END IF;
  END IF;

  -- 5. Build and return confirmation result JSON
  SELECT json_build_object(
    'id', po.id,
    'supplier_id', po.supplier_id,
    'supplier_name', po.supplier_name,
    'order_date', po.order_date,
    'reference_number', po.reference_number,
    'total', po.total,
    'item_count', po.item_count,
    'payment_status', po.payment_status,
    'amount_paid', po.amount_paid,
    'initial_amount_paid', po.initial_amount_paid,
    'note', po.note,
    'status', po.status,
    'created_at', po.created_at
  ) INTO v_result
  FROM purchase_orders po
  WHERE po.id = v_po_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
