-- ============================================================
-- LalaKirana — Migration 030
-- Table Alterations and redifining confirm_bill_transaction for discounts
-- ============================================================

-- 1. Alter tables to add discount columns
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0);
COMMENT ON COLUMN bills.discount_total IS 'Pre-computed sum of all item discounts for fast queries';

ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0);
COMMENT ON COLUMN bill_items.discount IS 'Unit discount amount (₹) applied to this item';

-- 2. Redefine confirm_bill_transaction to log and calculate discounts
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
  v_qty INT;
  v_unit_price NUMERIC;
  v_cost_price NUMERIC;
  v_discount NUMERIC;
  v_product_name TEXT;
  v_stock_qty INT;
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
      v_qty := (v_item->>'qty')::INT;
      v_unit_price := (v_item->>'unit_price')::NUMERIC;
      v_cost_price := (v_item->>'cost_price')::NUMERIC;
      v_discount := COALESCE((v_item->>'discount')::NUMERIC, 0.00);
      v_product_name := v_item->>'product_name';

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
        subtotal
      ) VALUES (
        v_bill_id,
        v_product_id,
        v_product_name,
        v_qty,
        v_unit_price,
        v_cost_price,
        v_discount,
        v_qty * (v_unit_price - v_discount)
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
