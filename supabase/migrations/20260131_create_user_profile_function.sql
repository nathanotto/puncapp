-- Create a function to handle user profile creation that bypasses RLS
-- This is called during signup when the session might not be fully established

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_email TEXT,
  user_address TEXT,
  user_username TEXT,
  user_display_preference TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    phone,
    email,
    address,
    username,
    display_preference,
    status,
    leader_certified
  ) VALUES (
    user_id,
    user_name,
    user_phone,
    user_email,
    user_address,
    user_username,
    user_display_preference::display_preference,
    'unassigned'::user_status,
    false
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated, anon;
