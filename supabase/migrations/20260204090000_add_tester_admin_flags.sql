-- Add tester and admin flags to users table

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_tester boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_punc_admin boolean DEFAULT false;

-- Set Nathan as tester and admin
UPDATE public.users
SET is_tester = true, is_punc_admin = true
WHERE id = '78d0b1d5-08a6-4923-8bef-49d804cafa73';
