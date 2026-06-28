-- ============================================================
-- LalaKirana — Migration 031
-- Table Alterations and redefining transactional procedures for loose/bulk items
-- ============================================================

-- 1. Alter tables to add is_loose and change quantity/stock columns to NUMERIC(10,3)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_loose BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN products.is_loose IS 'Whether the product is loose (sold by weight/kg) or piece/packet-based';

ALTER TABLE products ALTER COLUMN stock_qty TYPE NUMERIC(10,3);
ALTER TABLE stock_log ALTER COLUMN change_qty TYPE NUMERIC(10,3);
ALTER TABLE bill_items ALTER COLUMN qty TYPE NUMERIC(10,3);
ALTER TABLE purchase_order_items ALTER COLUMN qty TYPE NUMERIC(10,3);
ALTER TABLE purchase_orders ALTER COLUMN item_count TYPE NUMERIC(10,3);
ALTER TABLE eod_entries ALTER COLUMN qty_sold TYPE NUMERIC(10,3);

ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS is_loose BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS is_loose BOOLEAN NOT NULL DEFAULT false;

-- 2. Redefine confirm_bill_transaction
CREATE OR REPLACE FUNCTION confirm_bill_transaction(
  p_mode TEXT,
  p_status TEXT,
  p_total NUMERIC,
  p_note TEXT,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_items JSONB,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_bill_id UUID;
  v_bill_number TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_cost_price NUMERIC;
  v_discount NUMERIC;
  v_product_name TEXT;
  v_stock_qty NUMERIC;
  v_is_loose BOOLEAN;
  v_discount_total NUMERIC := 0.00;
BEGIN
  -- Validate Khata customer
  IF p_status = 'khata' AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'A customer account is required for Khata bookings.';
  END IF;

  -- Generate bill number using our FY sequence logic
  v_bill_number := generate_bill_number();

  -- Insert bill header
  INSERT INTO bills (
    bill_number,
    customer_id,
    total,
    mode,
    status,
    note,
    synced,
    created_by
  ) VALUES (
    v_bill_number,
    p_customer_id,
    p_total,
    p_mode,
    p_status,
    p_note,
    TRUE,
    p_user_id
  ) RETURNING id INTO v_bill_id;

  -- Process line items for full bills
  IF p_mode = 'full' AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      v_product_id := (v_item->>'product_id')::UUID;
      v_qty := (v_item->>'qty')::NUMERIC;
      v_unit_price := (v_item->>'unit_price')::NUMERIC;
      v_cost_price := (v_item->>'cost_price')::NUMERIC;
      v_discount := COALESCE((v_item->>'discount')::NUMERIC, 0.00);
      v_product_name := v_item->>'product_name';
      v_is_loose := COALESCE((v_item->>'is_loose')::BOOLEAN, FALSE);

      -- Lock product row to prevent race conditions during concurrent checkouts
      SELECT stock_qty INTO v_stock_qty FROM products WHERE id = v_product_id FOR UPDATE;
      IF v_stock_qty IS NULL THEN
        RAISE EXCEPTION 'Product with ID % not found.', v_product_id;
      END IF;

      -- Enforce stock availability
      IF v_stock_qty < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for product "%" (Available: %, Requested: %).', v_product_name, v_stock_qty, v_qty;
      END IF;

      -- Decrement product stock
      UPDATE products SET stock_qty = stock_qty - v_qty WHERE id = v_product_id;

      -- Insert bill item record
      INSERT INTO bill_items (
        bill_id,
        product_id,
        product_name,
        qty,
        unit_price,
        cost_price,
        discount,
        subtotal,
        is_loose
      ) VALUES (
        v_bill_id,
        v_product_id,
        v_product_name,
        v_qty,
        v_unit_price,
        v_cost_price,
        v_discount,
        v_qty * (v_unit_price - v_discount),
        v_is_loose
      );

      -- Accumulate discount total (qty * unit_discount)
      v_discount_total := v_discount_total + (v_qty * v_discount);

      -- Log stock movement
      INSERT INTO stock_log (
        product_id,
        change_qty,
        reason,
        bill_id,
        note,
        created_by
      ) VALUES (
        v_product_id,
        -v_qty,
        'bill_confirm',
        v_bill_id,
        'Bill ' || v_bill_number || ' confirmed',
        p_user_id
      );
    END LOOP;

    -- Update bill header with final discount sum
    UPDATE bills SET discount_total = v_discount_total WHERE id = v_bill_id;
  END IF;

  -- Process Khata posting
  IF p_status = 'khata' THEN
    -- Insert ledger record
    INSERT INTO khata_entries (
      customer_id,
      bill_id,
      type,
      amount,
      note,
      created_by
    ) VALUES (
      p_customer_id,
      v_bill_id,
      'purchase',
      p_total,
      'Bill ' || v_bill_number,
      p_user_id
    );

    -- Update customer outstanding balance
    UPDATE customers SET total_balance = total_balance + p_total WHERE id = p_customer_id;
  ELSIF p_status = 'paid' AND p_customer_id IS NOT NULL AND p_total > 0 THEN
    -- Insert purchase record
    INSERT INTO khata_entries (
      customer_id,
      bill_id,
      type,
      amount,
      note,
      created_by
    ) VALUES (
      p_customer_id,
      v_bill_id,
      'purchase',
      p_total,
      'Bill ' || v_bill_number || ' (Paid)',
      p_user_id
    );

    -- Insert corresponding payment record to keep balance unchanged
    INSERT INTO khata_entries (
      customer_id,
      bill_id,
      type,
      amount,
      note,
      created_by
    ) VALUES (
      p_customer_id,
      v_bill_id,
      'payment',
      p_total,
      'Payment for Bill ' || v_bill_number,
      p_user_id
    );
  END IF;

  RETURN v_bill_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Redefine confirm_purchase_order_transaction
CREATE OR REPLACE FUNCTION confirm_purchase_order_transaction(
  p_supplier_id UUID,
  p_supplier_name TEXT,
  p_order_date DATE,
  p_reference_number TEXT,
  p_payment_status TEXT,
  p_amount_paid NUMERIC,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB -- Array of {product_id, product_name, qty, cost_price, sell_price, mrp, is_loose}
)
RETURNS JSON AS $$
DECLARE
  v_po_id UUID;
  v_item JSONB;
  v_total NUMERIC(10,2) := 0;
  v_item_count NUMERIC(10,3) := 0;
  v_prod_cost NUMERIC(10,2);
  v_prod_sell NUMERIC(10,2);
  v_prod_mrp NUMERIC(10,2);
  v_prod_stock NUMERIC(10,3);
  v_unpaid_amount NUMERIC(10,2) := 0;
  v_result JSON;
BEGIN
  -- 1. Calculate totals from items first
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + ((v_item->>'qty')::NUMERIC * (v_item->>'cost_price')::NUMERIC);
    v_item_count := v_item_count + (v_item->>'qty')::NUMERIC;
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
      previous_mrp,
      is_loose
    ) VALUES (
      v_po_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'qty')::NUMERIC,
      (v_item->>'cost_price')::NUMERIC,
      (v_item->>'sell_price')::NUMERIC,
      (v_item->>'mrp')::NUMERIC,
      COALESCE(v_prod_cost, 0),
      COALESCE(v_prod_sell, 0),
      v_prod_mrp,
      COALESCE((v_item->>'is_loose')::BOOLEAN, FALSE)
    );

    -- Update product stock, cost, selling price (price), and MRP
    UPDATE products
    SET 
      stock_qty = v_prod_stock + (v_item->>'qty')::NUMERIC,
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
      (v_item->>'qty')::NUMERIC,
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
