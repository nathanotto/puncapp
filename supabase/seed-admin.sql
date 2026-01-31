-- Seed admin users
-- Run this after signing up admin users via Supabase Auth

-- Make Nathan an admin (if exists)
UPDATE users
SET is_admin = true
WHERE email = 'notto@nathanotto.com';

-- Note: To create additional admin users:
-- 1. Sign them up normally through Supabase Auth or signup flow
-- 2. Then run: UPDATE users SET is_admin = true WHERE email = 'admin@example.com';

-- For testing, if you have a test admin account, uncomment and modify:
-- UPDATE users SET is_admin = true WHERE email = 'admin@punc.org';
