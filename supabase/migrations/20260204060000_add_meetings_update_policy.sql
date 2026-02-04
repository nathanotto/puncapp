-- Add UPDATE policy for meetings table
-- Allows scribe to update meeting status and details

DROP POLICY IF EXISTS "Scribe can update meeting" ON meetings;

CREATE POLICY "Scribe can update meeting" ON meetings
  FOR UPDATE
  USING (scribe_id = auth.uid())
  WITH CHECK (scribe_id = auth.uid());
