-- Add a more permissive SELECT policy for authenticated users
-- This ensures users can always read their own profile when authenticated

DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Also allow anon users to select their own profile (for signup flow)
CREATE POLICY "Anon users can view own profile during signup" ON users
  FOR SELECT
  TO anon
  USING (auth.uid() = id);
