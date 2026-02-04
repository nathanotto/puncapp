-- Add DELETE policies to allow leaders to clean up meeting data
-- This enables leaders and backup leaders to delete meetings and all related data

-- Policy for attendance: Leaders can delete all attendance for meetings in their chapter
DROP POLICY IF EXISTS "Leaders can delete attendance for chapter meetings" ON attendance;
CREATE POLICY "Leaders can delete attendance for chapter meetings" ON attendance
  FOR DELETE USING (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('leader', 'backup_leader')
        AND cm.is_active = true
    )
  );

-- Policy for meeting_time_log: Leaders can delete time logs for meetings in their chapter
DROP POLICY IF EXISTS "Leaders can delete time logs for chapter meetings" ON meeting_time_log;
CREATE POLICY "Leaders can delete time logs for chapter meetings" ON meeting_time_log
  FOR DELETE USING (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('leader', 'backup_leader')
        AND cm.is_active = true
    )
  );

-- Policy for curriculum_responses: Leaders can delete responses for meetings in their chapter
DROP POLICY IF EXISTS "Leaders can delete curriculum responses for chapter meetings" ON curriculum_responses;
CREATE POLICY "Leaders can delete curriculum responses for chapter meetings" ON curriculum_responses
  FOR DELETE USING (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('leader', 'backup_leader')
        AND cm.is_active = true
    )
  );

-- Policy for meeting_feedback: Leaders can delete feedback for meetings in their chapter
DROP POLICY IF EXISTS "Leaders can delete feedback for chapter meetings" ON meeting_feedback;
CREATE POLICY "Leaders can delete feedback for chapter meetings" ON meeting_feedback
  FOR DELETE USING (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('leader', 'backup_leader')
        AND cm.is_active = true
    )
  );

-- Policy for pending_tasks: Leaders can delete tasks related to meetings in their chapter
DROP POLICY IF EXISTS "Leaders can delete tasks for chapter meetings" ON pending_tasks;
CREATE POLICY "Leaders can delete tasks for chapter meetings" ON pending_tasks
  FOR DELETE USING (
    related_entity_type = 'meeting'
    AND related_entity_id IN (
      SELECT m.id
      FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('leader', 'backup_leader')
        AND cm.is_active = true
    )
  );

-- Policy for meeting_recordings: Leaders can delete recordings for meetings in their chapter
DROP POLICY IF EXISTS "Leaders can delete recordings for chapter meetings" ON meeting_recordings;
CREATE POLICY "Leaders can delete recordings for chapter meetings" ON meeting_recordings
  FOR DELETE USING (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
      WHERE cm.user_id = auth.uid()
        AND cm.role IN ('leader', 'backup_leader')
        AND cm.is_active = true
    )
  );
