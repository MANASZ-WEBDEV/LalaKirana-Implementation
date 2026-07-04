-- Migration 041: Performance indexes
-- Based on actual query pattern analysis, July 2026
-- Run this after all existing migrations
--
-- Total: 15 indexes (8 high-value, 4 medium-value, 3 gap-fillers)

-- ================================================
-- HIGH VALUE — Direct query acceleration
-- ================================================

-- 1. Bills: staff activity queries (who created which bills)
CREATE INDEX IF NOT EXISTS idx_bills_created_by
  ON bills(created_by);

-- 2. Bills: listing page compound filter (mode + status + sort)
--    Covers: billing.service.ts filters by mode, status, orders by created_at DESC
CREATE INDEX IF NOT EXISTS idx_bills_mode_status
  ON bills(mode, status, created_at DESC);

-- 3. Bill items: product revenue analytics
--    Covers: analytics joins bill_items → bills for "top products by revenue"
--    Note: bill_items has no created_at; date filtering goes through bills.created_at via bill_id FK
CREATE INDEX IF NOT EXISTS idx_bill_items_product_bill
  ON bill_items(product_id, bill_id);

-- 4. Khata: customer statement (compound + partial)
--    Covers: khata.service.ts always filters customer_id + is_deleted = false + ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_khata_customer_date
  ON khata_entries(customer_id, created_at DESC)
  WHERE is_deleted = false;

-- 5. Activity: feed filtered by action type + date sort
--    Covers: activity.service.ts getFeed with action_type filter
CREATE INDEX IF NOT EXISTS idx_activity_type_date
  ON activity_log(action_type, created_at DESC);

-- 6. Activity: user profile + login history
--    Covers: getUserProfile (user_id + date range) and getLoginHistory (user_id + action_type IN)
CREATE INDEX IF NOT EXISTS idx_activity_user_type_date
  ON activity_log(user_id, action_type, created_at DESC);

-- 7. Stock log: product stock audit with sort
--    Covers: products.service.ts getStockLog by product_id ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_stock_log_product_date
  ON stock_log(product_id, created_at DESC);

-- 8. Customers: khata dashboard by outstanding balance
--    Partial index — only customers who actually owe money (keeps index tiny)
CREATE INDEX IF NOT EXISTS idx_customers_balance
  ON customers(total_balance DESC)
  WHERE total_balance > 0;

-- ================================================
-- MEDIUM VALUE — Secondary optimization
-- ================================================

-- 9. Products: low-stock dashboard widget
--    Partial index — only active products
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products(stock_qty, low_stock_threshold)
  WHERE is_active = true;

-- 10. Stock log: staff audit trail (who adjusted what)
CREATE INDEX IF NOT EXISTS idx_stock_log_created_by
  ON stock_log(created_by, created_at DESC);

-- 11. Price history: master audit view (who changed which prices)
CREATE INDEX IF NOT EXISTS idx_price_history_user_date
  ON price_history(changed_by, changed_at DESC);

-- 12. Purchase orders: supplier history compound
--     Replaces two separate index scans with one compound scan
CREATE INDEX IF NOT EXISTS idx_po_supplier_date
  ON purchase_orders(supplier_id, order_date DESC);


-- ================================================
-- GAP-FILLERS — Real query patterns with no coverage
-- ================================================

-- 14. Bills: analytics date range + status filter
--     Covers: analytics.service.ts date-range queries on bills with status checks
CREATE INDEX IF NOT EXISTS idx_bills_created_at_status
  ON bills(created_at, status);

-- 15. EOD entries: compound for analytics + inventory
--     Covers: analytics.service.ts and inventory.service.ts query by entry_date range
CREATE INDEX IF NOT EXISTS idx_eod_entries_date_product
  ON eod_entries(entry_date, product_id);

-- 16. Khata entries: customer + soft-delete filter
--     Covers: every khata query filters customer_id AND is_deleted = false
--     Note: partially overlaps with idx_khata_customer_date (#4) but serves
--     queries that don't need the created_at sort (e.g., balance calculations)
CREATE INDEX IF NOT EXISTS idx_khata_entries_customer_deleted
  ON khata_entries(customer_id, is_deleted);
