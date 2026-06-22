-- ============================================================
-- LalaKirana — Migration 022
-- Table: store_settings
-- Key-value store for configurable shop details (receipts, etc.)
-- ============================================================

CREATE TABLE store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default receipt settings
INSERT INTO store_settings (key, value) VALUES
  ('store_name', 'LalaKirana'),
  ('store_address', ''),
  ('store_phone', ''),
  ('receipt_footer', 'Thank you! Visit again');

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read store_settings"
  ON store_settings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner can manage store_settings"
  ON store_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'owner')
  );

COMMENT ON TABLE store_settings IS 'Key-value configuration for shop details — receipt header, footer, etc.';
