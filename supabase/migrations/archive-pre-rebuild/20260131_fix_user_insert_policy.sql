-- Fix RLS policy to allow new user profile creation during signup

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile on signup" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
