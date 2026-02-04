-- Fix meeting_feedback RLS to support UPSERT
DROP POLICY IF EXISTS "Users can insert own feedback" ON meeting_feedback;

-- Allow INSERT for own feedback
CREATE POLICY "Users can insert own feedback" ON meeting_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow UPDATE for own feedback (needed for UPSERT)
DROP POLICY IF EXISTS "Users can update own feedback" ON meeting_feedback;
CREATE POLICY "Users can update own feedback" ON meeting_feedback
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: Storage bucket and policies should be created via Supabase Dashboard:
-- 1. Go to Storage -> Create bucket: 'meeting-recordings' (private)
-- 2. Set policies to allow authenticated users to upload/view
