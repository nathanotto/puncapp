-- Update the meetings UPDATE policy to allow leaders and backup leaders to reschedule

DROP POLICY IF EXISTS "Scribe can update meeting" ON meetings;

CREATE POLICY "Leaders and scribes can update meetings" ON meetings
  FOR UPDATE
  USING (
    scribe_id = auth.uid()
    OR
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'backup_leader')
      AND is_active = true
    )
  )
  WITH CHECK (
    scribe_id = auth.uid()
    OR
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
      AND role IN ('leader', 'backup_leader')
      AND is_active = true
    )
  );
