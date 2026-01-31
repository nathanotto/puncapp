-- Fix infinite recursion in chapter_memberships policy
-- The original policy was checking chapter_memberships within itself

DROP POLICY IF EXISTS "Members can view chapter memberships" ON chapter_memberships;

-- Much simpler policy: users can view their own memberships and memberships in their chapters
-- We'll use a stored function to avoid recursion
CREATE OR REPLACE FUNCTION user_chapters()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT chapter_id
  FROM chapter_memberships
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE POLICY "Members can view chapter memberships" ON chapter_memberships
  FOR SELECT
  USING (
    chapter_id IN (SELECT user_chapters())
    OR user_id = auth.uid()
  );
