-- ============================================================================
-- FIX INFINITE RECURSION IN CHAPTER_MEMBERSHIPS POLICY
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view memberships in their chapters" ON chapter_memberships;

-- Create a simple policy: authenticated users can see all memberships
-- (Users can already see all chapters and all users, so this is consistent)
CREATE POLICY IF NOT EXISTS "Authenticated users can view all memberships" ON chapter_memberships
  FOR SELECT USING (auth.role() = 'authenticated');
