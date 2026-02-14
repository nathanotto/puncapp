-- ============================================================================
-- ADD INSERT POLICY FOR MEETINGS
-- ============================================================================
-- Allow leaders and backup leaders to create meetings for their chapters
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Leaders can create meetings for their chapters" ON meetings;
DROP POLICY IF EXISTS "Leaders can update meetings for their chapters" ON meetings;
DROP POLICY IF EXISTS "Leaders can delete meetings for their chapters" ON meetings;

-- Leaders can insert meetings for their chapters
CREATE POLICY "Leaders can create meetings for their chapters" ON meetings
  FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
        AND role IN ('leader', 'backup_leader')
        AND is_active = true
    )
  );

-- Leaders can update meetings for their chapters
CREATE POLICY "Leaders can update meetings for their chapters" ON meetings
  FOR UPDATE
  USING (
    chapter_id IN (
      SELECT chapter_id
      FROM chapter_memberships
      WHERE user_id = auth.uid()
        AND role IN ('leader', 'backup_leader')
        AND is_active = true
    )
  );

-- Leaders can delete meetings for their chapters
CREATE POLICY "Leaders can delete meetings for their chapters" ON meetings
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
