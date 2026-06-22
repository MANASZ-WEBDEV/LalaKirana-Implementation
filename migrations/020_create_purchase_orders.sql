-- ============================================================
-- LalaKirana — Migration 020
-- Tables: purchase_orders, purchase_order_items
-- ============================================================

-- Header: one row per supplier delivery/bill
CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id      UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name    TEXT NOT NULL,
  -- snapshot in case supplier is deleted later
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  -- can be backdated (entered later from paper bill)
  reference_number TEXT,
  -- seller's paper bill number for cross-reference
  total            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  item_count       INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  payment_status   TEXT NOT NULL DEFAULT 'paid',
  -- 'paid' | 'credit' | 'partial'
  amount_paid      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  note             TEXT,
  status           TEXT NOT NULL DEFAULT 'confirmed',
  -- 'confirmed' | 'cancelled'
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_supplier    ON purchase_orders(supplier_id);
CREATE INDEX idx_po_order_date  ON purchase_orders(order_date);
CREATE INDEX idx_po_status      ON purchase_orders(status);
CREATE INDEX idx_po_created_at  ON purchase_orders(created_at);

-- Line items: one row per product in a purchase order
CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  -- snapshot of product name at purchase time
  qty               INTEGER NOT NULL CHECK (qty > 0),
  cost_price        NUMERIC(10,2) NOT NULL CHECK (cost_price >= 0),
  -- what we PAID the seller per unit
  sell_price        NUMERIC(10,2),
  -- optional new MRP. NULL = keep existing sell price unchanged
  previous_cost     NUMERIC(10,2),
  -- snapshot of product's cost_price BEFORE this purchase
  previous_sell     NUMERIC(10,2)
  -- snapshot of product's price BEFORE this purchase
);

CREATE INDEX idx_poi_purchase_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_poi_product        ON purchase_order_items(product_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage purchase_orders"
  ON purchase_orders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage purchase_order_items"
  ON purchase_order_items FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE  purchase_orders                IS 'Header for each supplier delivery/bill received by the shop';
COMMENT ON COLUMN purchase_orders.supplier_name  IS 'Snapshot — preserved even if supplier record is deleted';
COMMENT ON COLUMN purchase_orders.reference_number IS 'Seller paper bill number for offline cross-reference';
COMMENT ON COLUMN purchase_orders.payment_status IS 'paid = settled; credit = we owe supplier; partial = part paid';
COMMENT ON TABLE  purchase_order_items           IS 'Line items for each purchase order with price snapshots';
COMMENT ON COLUMN purchase_order_items.sell_price IS 'New MRP from supplier. NULL = existing sell price stays';
COMMENT ON COLUMN purchase_order_items.previous_cost IS 'Product cost_price before this purchase — for audit';
COMMENT ON COLUMN purchase_order_items.previous_sell IS 'Product price (MRP) before this purchase — for audit';
