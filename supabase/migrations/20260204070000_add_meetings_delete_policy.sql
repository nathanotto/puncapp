-- Add DELETE policy for meetings table
-- Allows chapter leaders or backup leaders to delete meetings

DROP POLICY IF EXISTS "Leaders and backup leaders can delete meetings" ON meetings;

CREATE POLICY "Leaders and backup leaders can delete meetings" ON meetings
  FOR DELETE
  USING (
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'backup_leader')
      AND is_active = true
    )
  );
