-- ============================================================
-- LalaKirana — Migration 015
-- Seed: 8 store product categories
-- ============================================================

INSERT INTO categories (name) VALUES
  ('Spices'),
  ('Grains & Pulses'),
  ('Tea & Coffee'),
  ('Oats & Cereals'),
  ('Chocolates & Sweets'),
  ('Ready to Eat / Snacks'),
  ('Household & Personal Care'),
  ('Other / Miscellaneous')
ON CONFLICT (name) DO NOTHING;
-- ON CONFLICT: safe to re-run — skips if category already exists

COMMENT ON TABLE categories IS 'Seeded with 8 default store categories on migration 015';
