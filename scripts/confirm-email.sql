-- ============================================================================
-- CONFIRM EMAIL FOR USER
-- ============================================================================
-- Replace YOUR_EMAIL with your actual email address
-- ============================================================================

-- Option 1: Confirm email for a specific email address
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'YOUR_EMAIL';  -- ← REPLACE THIS with your email

-- Option 2: Confirm ALL unconfirmed emails (useful for dev)
-- UPDATE auth.users
-- SET email_confirmed_at = NOW()
-- WHERE email_confirmed_at IS NULL;
