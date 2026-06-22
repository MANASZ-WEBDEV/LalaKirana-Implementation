-- ============================================================
-- LalaKirana — Migration 024
-- Database Transactions for Billing, Cancellation, and Repayments
-- ============================================================

-- 1. Atomic bill confirmation transaction
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
  v_product_name TEXT;
  v_stock_qty INT;
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
        subtotal
      ) VALUES (
        v_bill_id,
        v_product_id,
        v_product_name,
        v_qty,
        v_unit_price,
        v_cost_price,
        v_qty * v_unit_price
      );

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
  END IF;

  RETURN v_bill_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Atomic bill cancellation transaction
CREATE OR REPLACE FUNCTION cancel_bill_transaction(
  p_bill_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_bill RECORD;
  v_item RECORD;
  v_customer_balance NUMERIC;
BEGIN
  -- Get the bill for update
  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'Bill is already cancelled';
  END IF;

  IF v_bill.status = 'draft' THEN
    RAISE EXCEPTION 'Cannot cancel a draft bill';
  END IF;

  -- Update bill status to cancelled
  UPDATE bills SET
    status = 'cancelled',
    note = COALESCE(note || ' | ', '') || 'CANCELLED: ' || p_reason
  WHERE id = p_bill_id;

  -- Restore stock for full bills
  IF v_bill.mode = 'full' THEN
    FOR v_item IN SELECT * FROM bill_items WHERE bill_id = p_bill_id LOOP
      -- Increment product stock
      UPDATE products SET stock_qty = stock_qty + v_item.qty WHERE id = v_item.product_id;

      -- Log stock restoration
      INSERT INTO stock_log (
        product_id,
        change_qty,
        reason,
        bill_id,
        note,
        created_by
      ) VALUES (
        v_item.product_id,
        v_item.qty,
        'bill_cancel',
        p_bill_id,
        'Bill ' || v_bill.bill_number || ' cancelled: ' || p_reason,
        p_user_id
      );
    END LOOP;
  END IF;

  -- Reverse credit balance for Khata bills
  IF v_bill.status = 'khata' AND v_bill.customer_id IS NOT NULL THEN
    -- Soft-delete the ledger entry
    UPDATE khata_entries SET is_deleted = TRUE WHERE bill_id = p_bill_id AND customer_id = v_bill.customer_id;

    -- Decrease customer outstanding balance (clamped to 0)
    SELECT total_balance INTO v_customer_balance FROM customers WHERE id = v_bill.customer_id FOR UPDATE;
    IF FOUND THEN
      UPDATE customers SET total_balance = GREATEST(0, total_balance - v_bill.total) WHERE id = v_bill.customer_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Atomic khata repayment transaction
CREATE OR REPLACE FUNCTION log_repayment_transaction(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_note TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_customer RECORD;
  v_current_balance NUMERIC;
  v_entry RECORD;
  v_new_balance NUMERIC;
  v_result JSONB;
BEGIN
  -- Lock customer row
  SELECT id, total_balance, name INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  v_current_balance := v_customer.total_balance;
  IF p_amount > v_current_balance THEN
    RAISE EXCEPTION 'Payment amount (₹%) exceeds outstanding balance (₹%)', p_amount, v_current_balance;
  END IF;

  -- Insert payment ledger record
  INSERT INTO khata_entries (
    customer_id,
    type,
    amount,
    note,
    created_by
  ) VALUES (
    p_customer_id,
    'payment',
    p_amount,
    COALESCE(p_note, 'Payment received from ' || v_customer.name),
    p_user_id
  ) RETURNING * INTO v_entry;

  -- Decrease outstanding balance
  v_new_balance := v_current_balance - p_amount;
  UPDATE customers SET total_balance = v_new_balance WHERE id = p_customer_id;

  -- Formulate return JSON
  v_result := jsonb_build_object(
    'id', v_entry.id,
    'customer_id', v_entry.customer_id,
    'type', v_entry.type,
    'amount', v_entry.amount,
    'note', v_entry.note,
    'created_by', v_entry.created_by,
    'created_at', v_entry.created_at,
    'new_balance', v_new_balance
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
