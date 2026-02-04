-- Fix RLS policy for curriculum_responses
-- Users should be able to see all responses from meetings they're attending

DROP POLICY IF EXISTS "Users can view own curriculum responses" ON curriculum_responses;

CREATE POLICY "Users can view meeting curriculum responses" ON curriculum_responses
  FOR SELECT USING (
    meeting_id IN (
      SELECT meeting_id FROM attendance WHERE user_id = auth.uid()
    )
  );
