-- ============================================================
-- LalaKirana — Migration 016
-- Seed: first owner account
-- ============================================================

-- IMPORTANT: Replace the values below before running in production.
-- The password hash below is a bcrypt hash of 'changeme123' with 12 rounds.
-- Change the password immediately after first login.
--
-- To generate a fresh hash:
--   node -e "const b=require('bcrypt'); b.hash('yourpassword',12).then(console.log)"

INSERT INTO users (name, email, password, role)
VALUES (
  'Shop Owner',
  'owner@lalakirana.in',
  '$2b$12$23Dc4h/RSOOwHFDlHSxf0OYDwJaSU31Y5wxl5zBsK9TGxjUx8kOZq',
  'owner'
)
ON CONFLICT (email) DO NOTHING;
-- ON CONFLICT: safe to re-run — skips if owner already exists

-- After first login, the owner should:
-- 1. Change their password from Settings
-- 2. Create staff accounts for other family members
-- 3. Verify all 8 categories are present
