-- ============================================================
-- LalaKirana — Migration 026
-- Seed receipt_language default settings
-- ============================================================

INSERT INTO store_settings (key, value) VALUES
  ('receipt_language', 'english')
ON CONFLICT (key) DO NOTHING;
