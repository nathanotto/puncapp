-- Add admin role to users table
-- PUNC Admins are completely separate from chapter members
-- but use the same Supabase Auth for simplicity

ALTER TABLE users
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster admin queries
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- RLS Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- RLS Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );
