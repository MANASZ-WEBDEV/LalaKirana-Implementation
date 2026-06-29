-- Migration: Add phone column to users table
-- Required for staff phone contact detail

ALTER TABLE users
  ADD COLUMN phone TEXT DEFAULT '';

-- Make sure existing users have a placeholder if needed, though phone will be required going forward
UPDATE users SET phone = '9999999999' WHERE phone IS NULL OR phone = '';

ALTER TABLE users
  ALTER COLUMN phone SET NOT NULL;

COMMENT ON COLUMN users.phone IS 'Exactly 10 digit contact phone number for the user/staff';
