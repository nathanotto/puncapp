-- Add UPDATE policy for chapters table to allow PUNC admins to update chapters
-- This fixes the issue where chapter flagging wasn't persisting

-- Drop policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "PUNC admins can update chapters" ON chapters;
DROP POLICY IF EXISTS "Leaders can update their chapters" ON chapters;

-- Allow PUNC admins to update chapters
CREATE POLICY "PUNC admins can update chapters" ON chapters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_punc_admin = true
    )
  );

-- Allow leaders to update their own chapters (for future leader-editable fields)
CREATE POLICY "Leaders can update their chapters" ON chapters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chapter_memberships
      WHERE chapter_memberships.chapter_id = chapters.id
      AND chapter_memberships.user_id = auth.uid()
      AND chapter_memberships.role = 'leader'
      AND chapter_memberships.is_active = true
    )
  );
