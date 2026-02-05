-- Fix attendance RLS policy for realtime subscriptions
-- The complex subquery in the original policy can cause issues with realtime

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view attendance in their chapters" ON attendance;

-- Create a simpler policy that works better with realtime
-- This allows users to see attendance records where they are members of the same chapter
CREATE POLICY "Users can view attendance in their chapters" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings m
      INNER JOIN chapter_memberships cm
        ON cm.chapter_id = m.chapter_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
      WHERE m.id = attendance.meeting_id
    )
  );

-- Grant necessary permissions for realtime
GRANT SELECT ON attendance TO authenticated;
