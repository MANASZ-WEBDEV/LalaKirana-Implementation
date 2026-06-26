-- ============================================================
-- LalaKirana — Migration 029
-- Tables: purchase_order_items (add mrp, previous_mrp)
-- Functions: confirm_purchase_order_transaction, cancel_purchase_order_transaction
-- ============================================================

-- 1. Add columns to purchase_order_items
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS previous_mrp NUMERIC(10,2);

COMMENT ON COLUMN purchase_order_items.mrp IS 'New MRP from supplier. NULL = keep existing MRP unchanged';
COMMENT ON COLUMN purchase_order_items.previous_mrp IS 'Snapshot of product MRP before this purchase';

-- 2. Update FUNCTION: confirm_purchase_order_transaction
CREATE OR REPLACE FUNCTION confirm_purchase_order_transaction(
  p_supplier_id UUID,
  p_supplier_name TEXT,
  p_order_date DATE,
  p_reference_number TEXT,
  p_payment_status TEXT,
  p_amount_paid NUMERIC,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB -- Array of {product_id, product_name, qty, cost_price, sell_price, mrp}
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
  v_result JSON;
BEGIN
  -- 1. Calculate totals from items first
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + ((v_item->>'qty')::INTEGER * (v_item->>'cost_price')::NUMERIC);
    v_item_count := v_item_count + (v_item->>'qty')::INTEGER;
  END LOOP;

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
    CASE WHEN p_payment_status = 'paid' THEN v_total ELSE p_amount_paid END,
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
      v_prod_mrp
    );

    -- Update product stock, cost, selling price (price), and MRP
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
      -- Lock and update supplier balance
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
    'note', po.note,
    'status', po.status,
    'created_at', po.created_at
  ) INTO v_result
  FROM purchase_orders po
  WHERE po.id = v_po_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. Update FUNCTION: cancel_purchase_order_transaction
CREATE OR REPLACE FUNCTION cancel_purchase_order_transaction(
  p_po_id UUID,
  p_reason TEXT,
  p_cancelled_by UUID
)
RETURNS VOID AS $$
DECLARE
  v_po RECORD;
  v_item RECORD;
  v_unpaid_amount NUMERIC(10,2) := 0;
BEGIN
  -- 1. Fetch and lock the PO header
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order with ID % not found', p_po_id;
  END IF;

  IF v_po.status = 'cancelled' THEN
    RAISE EXCEPTION 'Purchase order with ID % is already cancelled', p_po_id;
  END IF;

  -- 2. Mark PO header as cancelled
  UPDATE purchase_orders
  SET 
    status = 'cancelled',
    note = COALESCE(note, '') || ' | CANCELLED: ' || p_reason
  WHERE id = p_po_id;

  -- 3. Restore stock, cost, sell price, and MRP for each item
  FOR v_item IN SELECT * FROM purchase_order_items WHERE purchase_order_id = p_po_id LOOP
    -- Update product: reverse stock and restore previous cost, price, and MRP snapshot
    UPDATE products
    SET 
      stock_qty = GREATEST(0, stock_qty - v_item.qty),
      cost_price = COALESCE(v_item.previous_cost, cost_price),
      price = CASE WHEN v_item.sell_price IS NOT NULL THEN COALESCE(v_item.previous_sell, price) ELSE price END,
      mrp = CASE WHEN v_item.mrp IS NOT NULL THEN COALESCE(v_item.previous_mrp, mrp) ELSE mrp END
    WHERE id = v_item.product_id;

    -- Insert stock cancellation log
    INSERT INTO stock_log (
      product_id,
      change_qty,
      reason,
      purchase_order_id,
      note,
      created_by
    ) VALUES (
      v_item.product_id,
      -v_item.qty,
      'purchase_cancel',
      p_po_id,
      'PO Cancelled: ' || p_reason,
      p_cancelled_by
    );
  END LOOP;

  -- 4. Reverse supplier balance if credit/partial PO
  IF v_po.supplier_id IS NOT NULL AND v_po.payment_status IN ('credit', 'partial') THEN
    v_unpaid_amount := CASE 
      WHEN v_po.payment_status = 'credit' THEN v_po.total 
      ELSE v_po.total - v_po.amount_paid 
    END;

    IF v_unpaid_amount > 0 THEN
      UPDATE suppliers
      SET total_balance = GREATEST(0, total_balance - v_unpaid_amount)
      WHERE id = v_po.supplier_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
