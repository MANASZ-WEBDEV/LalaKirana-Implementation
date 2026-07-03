-- Migration 038: Upgrade manasrajanidy89@gmail.com to master role
UPDATE users
SET role = 'master'
WHERE email = 'manasrajanidy89@gmail.com';
