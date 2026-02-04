-- ============================================================================
-- CREATE PUBLIC USERS TABLE
-- ============================================================================
-- Mirrors auth.users with application-specific fields
-- ============================================================================

-- public.users mirrors auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  username text,  -- display name for privacy
  display_preference text DEFAULT 'real_name' CHECK (display_preference IN ('real_name', 'username')),
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all users (for seeing chapter members)
CREATE POLICY IF NOT EXISTS "Users can view all users" ON public.users
  FOR SELECT USING (true);

-- Policy: Users can update their own record
CREATE POLICY IF NOT EXISTS "Users can update own record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Trigger to create public.users row when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'New User'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
