-- ============================================================
-- LalaKirana — Migration 017
-- Alter table: users, add is_active column
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN users.is_active IS 'true = active user; false = deactivated user (cannot log in)';
