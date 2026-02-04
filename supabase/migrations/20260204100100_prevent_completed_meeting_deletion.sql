-- Update DELETE policy to prevent deletion of completed meetings
-- Leaders should not be able to delete meetings that have been completed

DROP POLICY IF EXISTS "Leaders and backup leaders can delete meetings" ON meetings;

CREATE POLICY "Leaders and backup leaders can delete meetings" ON meetings
  FOR DELETE
  USING (
    -- Must be a leader or backup leader of the chapter
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'backup_leader')
      AND is_active = true
    )
    -- AND meeting must NOT be completed
    AND status != 'completed'
    AND completed_at IS NULL
  );
